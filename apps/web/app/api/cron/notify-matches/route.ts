import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireCronAuth } from "@/lib/security/cron";
import { notifyUser } from "@/lib/push/notify";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Pro limit

// Push a "new strong-fit roles" nudge to users who:
//   • have at least one active push subscription, AND
//   • consent to the `notifications` purpose, AND
//   • picked up strong_fit matches since their last push of this type.
// The previous notification's timestamp is the watermark, so we never re-nudge
// the same matches twice (mirrors the digest's last_sent_at scoping).
export async function POST(req: NextRequest) {
  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const admin = createSupabaseAdminClient();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .is("disabled_at", null);

  const candidateIds = [...new Set((subs ?? []).map((s) => s.user_id))];
  if (!candidateIds.length) {
    return NextResponse.json({ notified: 0, message: "No active subscriptions" });
  }

  const { data: consents } = await admin
    .from("consents")
    .select("user_id")
    .in("user_id", candidateIds)
    .eq("purpose", "notifications")
    .eq("granted", true);
  const consentedIds = (consents ?? []).map((c) => c.user_id);
  if (!consentedIds.length) {
    return NextResponse.json({ notified: 0, message: "No consented subscribers" });
  }

  let notified = 0;
  let delivered = 0;
  const errors: string[] = [];

  for (const uid of consentedIds) {
    try {
      // Watermark: the last time we pushed this user a new-matches nudge.
      const { data: last } = await admin
        .from("notifications")
        .select("created_at")
        .eq("user_id", uid)
        .eq("type", "new_matches")
        .order("created_at", { ascending: false })
        .limit(1);
      const since = last?.[0]?.created_at ?? null;

      let query = admin
        .from("matches")
        .select("job_id", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("verdict", "strong_fit");
      if (since) query = query.gte("computed_at", since);

      const { count } = await query;
      if (!count || count < 1) continue;

      const res = await notifyUser(uid, {
        type: "new_matches",
        title: count === 1 ? "1 new strong-fit role" : `${count} new strong-fit roles`,
        body: "Fresh matches at top product companies are ready for you.",
        url: "/matches",
        data: { count },
      });
      if (res.logged) notified++;
      delivered += res.delivered;
    } catch (err) {
      errors.push(`${uid.slice(0, 8)}: ${err instanceof Error ? err.name : "unknown"}`);
    }
  }

  return NextResponse.json({
    notified,
    delivered,
    candidates: consentedIds.length,
    errors: errors.length ? errors : undefined,
  });
}
