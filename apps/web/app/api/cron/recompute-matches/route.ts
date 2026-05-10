// POST /api/cron/recompute-matches
//
// Phase K — daily fan-out invoked by GitHub Actions after the crawl finishes.
// Walks every user who has (a) the matching consent granted AND (b) a parsed
// resume on file, and runs computeMatchesForUser for each in incremental mode.
//
// Auth: Bearer $CRON_SECRET (same pattern as the digest cron).
//
// Time budget: Vercel Pro caps at 300s. Incremental compute averages ~3-8s
// per user (skips unchanged jobs, only regenerates Fit Cards for jobs whose
// JD or score moved). At 5s avg → ~50 users per invocation. Above that the
// caller can re-invoke; the endpoint reports remaining users so the workflow
// loop can keep going.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { computeMatchesForUser } from "@/lib/matching/engine";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Per-invocation wall-clock guard — leave 30s headroom under maxDuration.
const WALL_CLOCK_BUDGET_MS = 270_000;

interface UserResult {
  user_id: string;
  ok: boolean;
  mode?: string;
  total?: number;
  new_matches?: number;
  with_fit_card?: number;
  duration_ms?: number;
  error?: string;
}

export async function POST(req: NextRequest) {
  const cronSecret = serverEnv.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();

  // Optional: caller can pin a single user for ad-hoc recompute (debugging,
  // post-resume-upload retry). Default = walk all eligible users.
  let targetUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.user_id && typeof body.user_id === "string") targetUserId = body.user_id;
  } catch { /* no body — that's fine */ }

  // Eligibility: matching consent granted AND profile has a resume embedded.
  // We pull from `consents` (the source of truth) joined against profiles
  // that actually have a resume to score against.
  const { data: consented } = await admin
    .from("consents")
    .select("user_id")
    .eq("purpose", "matching")
    .eq("granted", true);
  const consentedIds = new Set((consented ?? []).map((c) => c.user_id as string));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (admin
    .from("profiles")
    .select("id, resume_storage_path, resume_embedding_at, last_match_compute_at")
    .not("resume_embedding_at", "is", null) as any) as {
      data: Array<{ id: string; resume_storage_path: string | null; resume_embedding_at: string | null; last_match_compute_at: string | null }> | null
    };

  const eligible = (profiles ?? [])
    .filter((p) => p.resume_storage_path)
    .filter((p) => consentedIds.has(p.id))
    .filter((p) => targetUserId === null || p.id === targetUserId);

  const results: UserResult[] = [];
  let processed = 0;
  let bailed = false;

  for (const p of eligible) {
    if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) { bailed = true; break; }
    try {
      const r = await computeMatchesForUser(p.id);
      results.push({
        user_id: p.id,
        ok: true,
        mode: r.mode,
        total: r.total,
        new_matches: r.new_matches,
        with_fit_card: r.with_fit_card,
        duration_ms: r.duration_ms,
      });
      processed++;
    } catch (err) {
      results.push({
        user_id: p.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    eligible: eligible.length,
    processed,
    failed: results.filter((r) => !r.ok).length,
    bailed_on_budget: bailed,
    elapsed_ms: Date.now() - startedAt,
    results: results.slice(0, 50), // cap response size
  });
}
