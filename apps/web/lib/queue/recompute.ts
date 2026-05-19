// Durable match-recompute facade.
//
// Phase 1 keeps execution in next/server after(), but every run now has a
// durable database job row so users and support can distinguish queued,
// running, succeeded, failed, cancelled, and superseded work. Phase 4 can move
// the execution body to a real queue without changing callers.

import { after } from "next/server";
import { computeMatchesForUser } from "@/lib/matching/engine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  createDurableJob,
  failDurableJob,
  transitionDurableJob,
} from "@/lib/jobs/state";

interface EnqueueOptions {
  /** Force a full recompute, for example after resume upload. */
  forceFull?: boolean;
  /** Caller-supplied identifier for privacy-safe operational tracing. */
  source?: string;
  /** Resume version this recompute must remain tied to. */
  resumeVersionId?: string | null;
  /** Pre-created durable job id for user-triggered computes. */
  jobId?: string | null;
}

async function runTrackedRecompute(
  userId: string,
  opts: EnqueueOptions,
): Promise<{ mode: string; total: number; new_matches: number; with_fit_card: number; duration_ms: number }> {
  const admin = createSupabaseAdminClient();
  const source = opts.source ?? "unspecified";
  let jobId = opts.jobId ?? null;

  try {
    if (!jobId) {
      const job = await createDurableJob(admin, {
        userId,
        type: "match_compute",
        resumeVersionId: opts.resumeVersionId ?? null,
        source,
      });
      jobId = job.id;
    }

    await transitionDurableJob(admin, jobId, "running", { incrementAttempts: true });
    const result = await computeMatchesForUser(userId, {
      forceFull: opts.forceFull,
      resumeVersionId: opts.resumeVersionId,
      jobId,
    });
    await transitionDurableJob(admin, jobId, "succeeded");
    return result;
  } catch (err) {
    if (jobId) {
      const message = err instanceof Error ? err.message : String(err);
      const superseded = /superseded|resume changed/i.test(message);
      if (superseded) {
        await transitionDurableJob(admin, jobId, "superseded", {
          errorCode: "superseded",
          errorMessage: message,
        });
      } else {
        await failDurableJob(admin, jobId, "compute_failed", message);
      }
    }
    throw err;
  }
}

export function enqueueUserRecompute(userId: string, opts: EnqueueOptions = {}): void {
  const source = opts.source ?? "unspecified";
  after(async () => {
    const t0 = Date.now();
    try {
      const r = await runTrackedRecompute(userId, opts);
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

export async function runUserRecomputeBlocking(
  userId: string,
  opts: EnqueueOptions = {},
): Promise<{ ok: true; mode: string; total: number; new_matches: number; with_fit_card: number; duration_ms: number } | { ok: false; error: string }> {
  try {
    const r = await runTrackedRecompute(userId, opts);
    return {
      ok: true,
      mode: r.mode,
      total: r.total,
      new_matches: r.new_matches,
      with_fit_card: r.with_fit_card,
      duration_ms: r.duration_ms,
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
