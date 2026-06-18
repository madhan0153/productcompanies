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
import { logEvent } from "@/lib/observability/log";
import { notifyUser } from "@/lib/push/notify";

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
  // Hoisted so the catch can tell a pre-publish failure (mark failed/superseded)
  // from a post-publish one (matches already live — leave the job succeeded).
  let published = false;

  try {
    if (!jobId) {
      const job = await createDurableJob(admin, {
        userId,
        type: "match_compute",
        resumeVersionId: opts.resumeVersionId ?? null,
        source,
        idempotencyKey: opts.resumeVersionId ? `match_compute:${userId}:${opts.resumeVersionId}` : null,
      });
      jobId = job.id;
    }

    await transitionDurableJob(admin, jobId, "running", { incrementAttempts: true });
    // The engine flips the job to "succeeded" the moment baseline scores are
    // published (before the best-effort Fit-Card phase), so a function kill
    // during enrichment can never strand the job in "running".
    const publishedJobId = jobId;
    const result = await computeMatchesForUser(userId, {
      forceFull: opts.forceFull,
      resumeVersionId: opts.resumeVersionId,
      jobId,
      onPublished: async () => {
        await transitionDurableJob(admin, publishedJobId, "succeeded");
        published = true;
      },
    });
    if (!published) await transitionDurableJob(admin, jobId, "succeeded");
    await notifyUser(userId, {
      type: "resume_updates",
      title: "Your latest matches are ready",
      body:
        result.new_matches > 0
          ? `We found ${result.new_matches} new relevant role${result.new_matches === 1 ? "" : "s"}.`
          : "Your role rankings are up to date.",
      url: "/matches",
      data: { count: result.new_matches },
      priority: "important",
      idempotencyKey: `match_compute_ready:${jobId}`,
    }).catch(() => undefined);
    return result;
  } catch (err) {
    if (jobId && !published) {
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
      logEvent("info", "match_compute_finished", {
        user_id: userId.slice(0, 8),
        source,
        mode: r.mode,
        total: r.total,
        new_matches: r.new_matches,
        fit_cards: r.with_fit_card,
        duration_ms: r.duration_ms,
      });
    } catch (err) {
      logEvent("warn", "match_compute_failed", {
        user_id: userId.slice(0, 8),
        source,
        duration_ms: Date.now() - t0,
        error: err instanceof Error ? err.name : "unknown",
      });
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
