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
import { runUserRecomputeBlocking } from "@/lib/queue/recompute";
import { requireCronAuth, verifySensitiveCronAuth } from "@/lib/security/cron";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Wall-clock budget — route self-terminates here, leaving 60s for Vercel to
// flush the response before its 300s hard kill. The GH Actions curl uses
// --max-time 295, so the 55s margin prevents spurious timeouts.
const WALL_CLOCK_BUDGET_MS = 240_000;

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
  // Read the raw body once — both the JSON parse and the HMAC verification
  // below need it. NextRequest.body is a single-use stream.
  const rawBody = await req.text();

  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();

  // Optional: caller can pin a single user for ad-hoc recompute (debugging,
  // post-resume-upload retry). Default = drain the queue.
  let targetUserId: string | null = null;
  let parsedBody: { user_id?: unknown } = {};
  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
      if (typeof parsedBody?.user_id === "string") targetUserId = parsedBody.user_id;
    } catch { /* no body — that's fine */ }
  }

  // Security fix (S-8): ad-hoc mode (per-user recompute) is the high-leverage
  // path — a leaked CRON_SECRET alone shouldn't be enough to spam every
  // user's LLM quota. Require an HMAC over the body + a freshness window.
  // The GH Actions full-fan-out (no body, no user_id) keeps the legacy
  // bearer-only path because the workflow already controls the secret.
  if (targetUserId) {
    const hmacOutcome = verifySensitiveCronAuth({
      authHeader: req.headers.get("authorization"),
      tsHeader:   req.headers.get("x-prodmatch-cron-ts"),
      sigHeader:  req.headers.get("x-prodmatch-cron-sig"),
      rawBody,
    });
    if (!hmacOutcome.ok) {
      return NextResponse.json(hmacOutcome.body, { status: hmacOutcome.status });
    }
  }

  // ── Cron lock (skipped for single-user ad-hoc calls) ───────────────────
  // QA fix (B12): when the lock RPC isn't deployed yet (e.g. operator hasn't
  // re-run schema.sql), the previous code silently treated `held = null` as
  // "lock held" and the cron 409'd forever. Now we distinguish "RPC missing"
  // (error returned) from "lock held" (no error, null data) so the operator
  // gets a clear 503 with a hint.
  let lockHolder: string | null = null;
  if (!targetUserId) {
    const { data: held, error: lockError } = (await (admin.rpc as any)("acquire_cron_lock", {
      lock_name:   LOCK_NAME,
      ttl_seconds: LOCK_TTL_SECONDS,
    })) as { data: string | null; error: { message: string; code?: string } | null };
    if (lockError) {
      const isMissingRpc = /function .* does not exist|PGRST/i.test(lockError.message ?? "");
      return NextResponse.json(
        {
          ok: false,
          error: isMissingRpc
            ? "cron-lock RPC missing — re-run the latest supabase/schema.sql"
            : `Lock acquisition failed: ${lockError.message}`,
        },
        { status: 503 },
      );
    }
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
    // QA fix (B6): reap stuck "parsing…" states before we do anything else.
    // If a profile has resume_parsing_at older than 30 minutes and no
    // pending durable job is still running for it, the after()-block parser
    // almost certainly died (cold start aborted, lambda killed, etc.). Clear
    // the parsing flag so the user can re-upload and the UI stops claiming
    // work is in flight.
    try {
      const stuckCutoff = new Date(Date.now() - 30 * 60_000).toISOString();
      await (admin.from("profiles") as any)
        .update({
          resume_parsing_at: null,
          resume_parse_error: "Parsing timed out. Please re-upload your resume.",
          pending_resume_version_id: null,
        })
        .lt("resume_parsing_at", stuckCutoff)
        .not("resume_parsing_at", "is", null);
    } catch {
      // Best-effort — never block the daily fan-out on the reaper.
    }

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

    let profileQuery = (admin
      .from("profiles")
      .select("id, resume_storage_path, resume_parsed_version_id, resume_embedding_at, resume_embedding_version_id, active_resume_version_id, pending_resume_version_id, resume_parse_error, last_match_compute_at")
      .not("resume_embedding_at", "is", null)
      .is("pending_resume_version_id", null)
      .is("resume_parse_error", null) as any);
    profileQuery = targetUserId
      ? profileQuery.eq("id", targetUserId).limit(1)
      : profileQuery.order("last_match_compute_at", { ascending: true, nullsFirst: true }).limit(BATCH_SIZE * 4);
    const { data: profiles } = await profileQuery as {
        data: Array<{
          id: string;
          resume_storage_path: string | null;
          resume_embedding_at: string | null;
          resume_parsed_version_id: string | null;
          resume_embedding_version_id: string | null;
          active_resume_version_id: string | null;
          pending_resume_version_id: string | null;
          resume_parse_error: string | null;
          last_match_compute_at: string | null;
        }> | null;
      };

    const eligibleAll = (profiles ?? [])
      .filter((p) => p.resume_storage_path)
      .filter((p) => p.active_resume_version_id)
      .filter((p) => p.resume_parsed_version_id === p.active_resume_version_id)
      .filter((p) => p.resume_embedding_version_id === p.active_resume_version_id)
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
          resumeVersionId: p.active_resume_version_id,
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
          resumeVersionId: p.active_resume_version_id,
        });
        if (r.ok) {
          const idx = results.findIndex((res) => res.user_id === p.id);
          if (idx >= 0) results[idx] = { user_id: p.id, ok: true, mode: r.mode, total: r.total, new_matches: r.new_matches, with_fit_card: r.with_fit_card, duration_ms: r.duration_ms };
          // Don't double-count in `processed`; already counted on first attempt.
        }
      }
    }

    // `remaining` lets the GH Actions workflow loop until 0.
    //
    // Use a staleness threshold (null or not computed in the last 6 h) rather
    // than raw eligibleCount. Without this, freshly-processed users still
    // appear eligible on the next call (their timestamp is only seconds old),
    // so `remaining` never reaches 0 for > BATCH_SIZE users and the loop
    // always runs to MAX_ITER (30 × ~4 min = 2 h of wasted Actions time).
    //
    // With this fix: once all users have been freshly computed this cycle,
    // `staleCount` drops to 0 and the loop terminates immediately.
    // `staleCount` uses the pre-compute eligibleAll snapshot (DB-fetched objects
    // are plain values, not mutated by subsequent DB writes, so this always
    // reflects the state at the start of this invocation).
    // `remaining = staleCount - batch.length`:
    //   staleCount  = eligible users who weren't freshly computed before this call
    //   batch.length = how many we attempted this call (includes any failures;
    //                  failed users keep their null timestamp → reappear next run)
    // This formula reaches 0 as soon as no more stale users exist beyond this
    // batch, giving correct loop termination for any user-count without running
    // needlessly to MAX_ITER.
    const SIX_HOURS_MS = 6 * 3_600_000;
    const staleThreshold = startedAt - SIX_HOURS_MS;
    const staleCount = eligibleAll.filter(
      (p) => p.last_match_compute_at === null ||
             new Date(p.last_match_compute_at).getTime() < staleThreshold
    ).length;
    const totalSucceeded = results.filter((r) => r.ok).length;
    const remaining = Math.max(0, staleCount - batch.length);

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

      await (admin.rpc as any)("release_cron_lock", {
        lock_name:        LOCK_NAME,
        expected_holder:  lockHolder,
      });
    }
  }
}
