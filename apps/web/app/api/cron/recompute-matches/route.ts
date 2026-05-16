// POST /api/cron/recompute-matches
//
// Daily fan-out invoked by GitHub Actions after the crawl finishes. Walks
// every consented user with a parsed resume and runs computeMatchesForUser
// for each.
//
// Sprint 4 — Item 13. Two important upgrades from earlier versions:
//
//   1. Cron lock. acquire_cron_lock("recompute_matches", ttl=600) prevents
//      a manual trigger from racing against a scheduled run. The leased
//      holder_id is released at the end; if the function dies the lease
//      auto-expires after the TTL.
//
//   2. Stale-first pagination. Instead of walking every eligible user on
//      every call, we pull the oldest `last_match_compute_at` first and
//      cap the batch at BATCH_SIZE. The endpoint reports `remaining` so
//      the workflow loops until 0. With incremental compute averaging 3-8s
//      per user, a 60-user batch fits comfortably under the 300s ceiling.
//
// The GH Actions loop should call this in a `until remaining=0` pattern
// (capped at, say, 20 iterations / 2h total). Each call grabs its own
// lock; an over-running prior call returns 409 and the loop sleeps + retries.
//
// Auth: Bearer $CRON_SECRET (same pattern as the digest cron).

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { runUserRecomputeBlocking } from "@/lib/queue/recompute";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Wall-clock budget — leave 30s headroom under Vercel's 300s cap.
const WALL_CLOCK_BUDGET_MS = 270_000;

// Per-invocation user cap. Set conservatively; the workflow loops until
// `remaining === 0`. Tune up once we have telemetry from production
// (average compute duration via /admin/health).
const BATCH_SIZE = 60;

const LOCK_NAME = "recompute_matches";
const LOCK_TTL_SECONDS = 600;

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
  // post-resume-upload retry). Default = drain the queue.
  let targetUserId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.user_id && typeof body.user_id === "string") targetUserId = body.user_id;
  } catch { /* no body — that's fine */ }

  // ── Cron lock (skipped for single-user ad-hoc calls) ───────────────────
  let lockHolder: string | null = null;
  if (!targetUserId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: held } = await (admin.rpc as any)("acquire_cron_lock", {
      lock_name:   LOCK_NAME,
      ttl_seconds: LOCK_TTL_SECONDS,
    }) as { data: string | null };
    if (!held) {
      return NextResponse.json(
        {
          ok: false,
          error: "Another recompute run is in progress. Skipping.",
          retry_after_seconds: 30,
        },
        { status: 409 },
      );
    }
    lockHolder = held;
  }

  try {
    // ── Build the work queue ─────────────────────────────────────────────
    // Eligibility joins: matching consent granted + profile has a resume
    // embedding. We pull from `consents` (source of truth) and intersect
    // with profiles that have something to score against.
    const { data: consented } = await admin
      .from("consents")
      .select("user_id")
      .eq("purpose", "matching")
      .eq("granted", true);
    const consentedIds = new Set((consented ?? []).map((c) => c.user_id as string));

    // Sprint 4 Item 13: order by oldest last_match_compute_at first so the
    // batch always works on the most stale users. nullsFirst = brand-new
    // profiles get their first compute promptly.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profiles } = await (admin
      .from("profiles")
      .select("id, resume_storage_path, resume_embedding_at, last_match_compute_at")
      .not("resume_embedding_at", "is", null)
      .order("last_match_compute_at", { ascending: true, nullsFirst: true })
      .limit(targetUserId ? 1 : BATCH_SIZE * 4) as any) as {
        data: Array<{
          id: string;
          resume_storage_path: string | null;
          resume_embedding_at: string | null;
          last_match_compute_at: string | null;
        }> | null;
      };

    const eligibleAll = (profiles ?? [])
      .filter((p) => p.resume_storage_path)
      .filter((p) => consentedIds.has(p.id))
      .filter((p) => targetUserId === null || p.id === targetUserId);

    // Snapshot batch size BEFORE slicing so the caller can compute remaining.
    const eligibleCount = eligibleAll.length;
    const batch = eligibleAll.slice(0, BATCH_SIZE);

    // ── Drain the batch under wall-clock budget ──────────────────────────
    const results: UserResult[] = [];
    let processed = 0;
    let bailed = false;

    for (const p of batch) {
      if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) { bailed = true; break; }
      const r = await runUserRecomputeBlocking(p.id, { source: "cron_daily" });
      if (r.ok) {
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
      } else {
        results.push({ user_id: p.id, ok: false, error: r.error });
      }
    }

    // `remaining` lets the GH Actions workflow loop until 0 — that's the
    // "queue empty" signal across invocations.
    const remaining = Math.max(0, eligibleCount - processed);

    return NextResponse.json({
      ok: true,
      batch_size: BATCH_SIZE,
      eligible_visible: eligibleCount,
      processed,
      failed: results.filter((r) => !r.ok).length,
      bailed_on_budget: bailed,
      remaining,
      elapsed_ms: Date.now() - startedAt,
      results: results.slice(0, 50), // cap response size
    });
  } finally {
    if (lockHolder) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.rpc as any)("release_cron_lock", {
        lock_name:        LOCK_NAME,
        expected_holder:  lockHolder,
      });
    }
  }
}
