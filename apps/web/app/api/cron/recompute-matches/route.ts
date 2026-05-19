// POST /api/cron/recompute-matches
//
// Daily fan-out invoked by:
//   (a) GitHub Actions after the crawl finishes (primary trigger), and
//   (b) Vercel cron at 04:00 IST / 22:30 UTC (fallback — fires if GH Actions
//       failed or ran late, picks up any users still stale).
//
// Enterprise design:
//   1. Cron lock — acquire_cron_lock("recompute_matches", ttl=600) prevents
//      concurrent invocations from racing.
//   2. Stale-first pagination — oldest last_match_compute_at processed first.
//   3. Concurrent processing — up to COMPUTE_CONCURRENCY users in parallel so
//      a slow Fit Card LLM call on user A doesn't stall user B.
//   4. Single-retry DLQ — failed users are retried once in the same invocation
//      before being left for the next run (when they'll appear stale-first again).
//
// Auth: Bearer $CRON_SECRET.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";
import { runUserRecomputeBlocking } from "@/lib/queue/recompute";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Wall-clock budget — leave 30s headroom under Vercel's 300s cap.
const WALL_CLOCK_BUDGET_MS = 270_000;

// Per-invocation user cap. The workflow loops until `remaining === 0`.
const BATCH_SIZE = 60;

// How many users to process in parallel. Fit Card LLM calls inside each user's
// compute already run at FIT_CARD_CONCURRENCY=4; this outer concurrency batches
// users so a single slow user doesn't stall the rest of the batch.
const COMPUTE_CONCURRENCY = 3;

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
    let profileQuery = (admin
      .from("profiles")
      .select("id, resume_storage_path, resume_embedding_at, last_match_compute_at")
      .not("resume_embedding_at", "is", null) as any);
    profileQuery = targetUserId
      ? profileQuery.eq("id", targetUserId).limit(1)
      : profileQuery.order("last_match_compute_at", { ascending: true, nullsFirst: true }).limit(BATCH_SIZE * 4);
    const { data: profiles } = await profileQuery as {
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

    // ── Drain the batch under wall-clock budget (concurrent) ─────────────
    const results: UserResult[] = [];
    let processed = 0;
    let bailed = false;

    // Shared work queue — COMPUTE_CONCURRENCY workers pull from it concurrently.
    const workQueue = [...batch];
    let drainBailed = false;

    const drainWorker = async () => {
      while (true) {
        if (drainBailed || Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) {
          drainBailed = true;
          return;
        }
        const p = workQueue.shift();
        if (!p) return;
        const r = await runUserRecomputeBlocking(p.id, {
          source: targetUserId ? "cron_single_user" : "cron_daily",
          forceFull: Boolean(targetUserId),
        });
        if (r.ok) {
          results.push({ user_id: p.id, ok: true, mode: r.mode, total: r.total, new_matches: r.new_matches, with_fit_card: r.with_fit_card, duration_ms: r.duration_ms });
          processed++;
        } else {
          results.push({ user_id: p.id, ok: false, error: r.error });
        }
      }
    };

    await Promise.allSettled(
      Array.from({ length: Math.min(COMPUTE_CONCURRENCY, batch.length) }, drainWorker),
    );
    bailed = drainBailed;

    // ── DLQ: single retry for each failed user ────────────────────────────
    // Failed users will also appear stale-first on the next cron invocation,
    // but retrying once here ensures transient errors (timeout, cold-start
    // Supabase connection) don't leave users with stale matches for 24h.
    if (!bailed) {
      const failedIds = new Set(results.filter((r) => !r.ok).map((r) => r.user_id));
      for (const p of batch.filter((p) => failedIds.has(p.id))) {
        if (Date.now() - startedAt > WALL_CLOCK_BUDGET_MS) break;
        const r = await runUserRecomputeBlocking(p.id, {
          source: targetUserId ? "cron_single_user_retry" : "cron_retry",
          forceFull: Boolean(targetUserId),
        });
        if (r.ok) {
          const idx = results.findIndex((res) => res.user_id === p.id);
          if (idx >= 0) results[idx] = { user_id: p.id, ok: true, mode: r.mode, total: r.total, new_matches: r.new_matches, with_fit_card: r.with_fit_card, duration_ms: r.duration_ms };
          // Don't double-count in `processed`; already counted on first attempt.
        }
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
