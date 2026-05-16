// Sprint 4 — Item 13. Match-recompute queue facade.
//
// Single entry point for "compute matches for this user, eventually."
// Today's implementation runs the work in next/server's after() so the
// request returns immediately; on Vercel that's bound to the same
// function invocation's maxDuration but works fine at our current scale.
//
// To migrate to Inngest / Trigger.dev / a real queue:
//   1. Replace the body of enqueueUserRecompute() with the queue's send()
//      call (e.g., inngest.send({ name: "user.recompute", data: { userId } })).
//   2. Move the actual computeMatchesForUser invocation into the queue's
//      handler/webhook endpoint.
//   3. Delete the cron lock + cron pagination logic — the queue handles
//      both ordering and concurrency.
//
// Until then, this file is the ONLY place in the codebase that knows how
// recomputes are dispatched. All other code calls this facade.

import { after } from "next/server";
import { computeMatchesForUser } from "@/lib/matching/engine";

interface EnqueueOptions {
  /** Force a full recompute (e.g., resume re-upload). Default: incremental. */
  forceFull?: boolean;
  /** Caller-supplied identifier for logging — e.g., "resume_upload",
   *  "cron_daily", "user_button". Helps trace which path triggered a run. */
  source?: string;
}

/**
 * Schedule a match recompute for a single user. Returns immediately —
 * the work happens after the response is flushed (today via `after()`).
 *
 * Errors during compute are logged, NEVER re-raised. Callers can't await
 * the actual compute — that's the whole point of enqueuing.
 */
export function enqueueUserRecompute(userId: string, opts: EnqueueOptions = {}): void {
  const source = opts.source ?? "unspecified";
  after(async () => {
    const t0 = Date.now();
    try {
      const r = await computeMatchesForUser(userId, { forceFull: opts.forceFull });
      console.log(
        `[queue.recompute] user=${userId.slice(0, 8)} source=${source} ` +
        `mode=${r.mode} total=${r.total} new=${r.new_matches} fc=${r.with_fit_card} ${r.duration_ms}ms`,
      );
    } catch (err) {
      console.warn(
        `[queue.recompute] user=${userId.slice(0, 8)} source=${source} failed after ${Date.now() - t0}ms: ` +
        (err instanceof Error ? err.message : String(err)),
      );
    }
  });
}

/**
 * Synchronous variant for callers that explicitly need the result (e.g.,
 * the cron route which paginates through users). NEVER expose this to
 * request handlers that face users — it can take 30s+ and will burn
 * Vercel function time.
 */
export async function runUserRecomputeBlocking(
  userId: string,
  opts: EnqueueOptions = {},
): Promise<{ ok: true; mode: string; total: number; new_matches: number; with_fit_card: number; duration_ms: number } | { ok: false; error: string }> {
  try {
    const r = await computeMatchesForUser(userId, { forceFull: opts.forceFull });
    return {
      ok: true,
      mode: r.mode, total: r.total, new_matches: r.new_matches,
      with_fit_card: r.with_fit_card, duration_ms: r.duration_ms,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
