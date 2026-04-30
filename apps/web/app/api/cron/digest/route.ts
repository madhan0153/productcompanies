import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendWeeklyDigest } from "@/lib/email";
import { serverEnv, clientEnv } from "@/lib/env";
import { createHmac } from "crypto";
import type { DpdpEventType } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro limit

type MatchRow = {
  job_id: string;
  score: number;
  reasoning: string | null;
  jobs: {
    title: string;
    location: string | null;
    apply_url: string | null;
    companies: { name: string } | null;
  } | null;
};

type SubRow = {
  user_id: string;
  auth_email: string | null;
  display_name: string | null;
};

function nextMondayIST(): string {
  const d = new Date();
  const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setUTCHours(2, 30, 0, 0); // 02:30 UTC = 08:00 IST
  return d.toISOString();
}

function buildUnsubscribeUrl(userId: string): string {
  const secret = serverEnv.CRON_SECRET ?? "dev-secret";
  const token = createHmac("sha256", secret).update(userId).digest("hex");
  return `${clientEnv.NEXT_PUBLIC_APP_URL}/unsubscribe?uid=${userId}&token=${token}`;
}

export async function POST(req: NextRequest) {
  // Verify Vercel Cron secret (Authorization: Bearer <CRON_SECRET>)
  const authHeader = req.headers.get("authorization");
  const cronSecret = serverEnv.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // Find subscriptions due to send
  const { data: subs } = await admin
    .from("digest_subscriptions")
    .select("user_id")
    .eq("frequency", "weekly")
    .lte("next_send_at", now);

  if (!subs?.length) {
    return NextResponse.json({ sent: 0, message: "No subscriptions due" });
  }

  // For each eligible subscriber, check digest_email consent
  const userIds = subs.map((s) => s.user_id);

  const { data: consents } = await admin
    .from("consents")
    .select("user_id")
    .in("user_id", userIds)
    .eq("purpose", "digest_email")
    .eq("granted", true);

  const consentedIds = new Set((consents ?? []).map((c) => c.user_id));

  // Fetch profile + auth email for consented users
  const eligible = userIds.filter((id) => consentedIds.has(id));
  if (!eligible.length) {
    return NextResponse.json({ sent: 0, message: "No consented subscribers" });
  }

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name")
    .in("id", eligible);

  // Fetch auth emails via admin API
  const authEmailMap = new Map<string, string>();
  for (const uid of eligible) {
    const { data } = await admin.auth.admin.getUserById(uid);
    if (data.user?.email) authEmailMap.set(uid, data.user.email);
  }

  let sent = 0;
  const errors: string[] = [];

  for (const uid of eligible) {
    const email = authEmailMap.get(uid);
    if (!email) continue;

    const profile = profiles?.find((p) => p.id === uid);
    const name = profile?.display_name ?? email.split("@")[0];

    // Fetch top 5 matches for this user (recent active jobs)
    const { data: rawMatches } = await admin
      .from("matches")
      .select("job_id, score, reasoning, jobs(title, location, apply_url, companies(name))")
      .eq("user_id", uid)
      .order("score", { ascending: false })
      .limit(5);

    const matches = ((rawMatches as unknown as MatchRow[]) ?? [])
      .filter((m) => m.jobs != null)
      .map((m) => ({
        title: m.jobs!.title,
        company: m.jobs!.companies?.name ?? "Unknown",
        score: Math.round(m.score),
        location: m.jobs!.location,
        reasoning: m.reasoning,
        applyUrl: m.jobs!.apply_url,
      }));

    if (!matches.length) continue;

    try {
      await sendWeeklyDigest({
        to: email,
        name,
        matches,
        unsubscribeUrl: buildUnsubscribeUrl(uid),
      });

      // Update subscription timestamps
      await admin
        .from("digest_subscriptions")
        .update({ last_sent_at: now, next_send_at: nextMondayIST() })
        .eq("user_id", uid);

      // Audit
      await admin.from("dpdp_events").insert({
        user_id: uid,
        event: "export_delivered" as DpdpEventType,
        metadata: { type: "weekly_digest", matches_count: matches.length },
      });

      sent++;
    } catch (err) {
      errors.push(`${uid}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    sent,
    total_eligible: eligible.length,
    errors: errors.length ? errors : undefined,
  });
}
