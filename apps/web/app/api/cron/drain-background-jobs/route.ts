// Drains queued `match_compute` rows from background_jobs.
//
// Triggered by:
//   - Vercel cron every 15 minutes (vercel.json) — production safety net.
//     If a user uploads a resume and the after()-block recompute dies
//     (cold-lambda kill, after() write failed, etc.), the durable job sits
//     "queued". The 15-min cron picks it up and re-runs the recompute
//     under a durable jobId so state transitions stay correct.
//   - The /admin/ops "Drain queue" button (manual operator trigger).
//
// Per invocation we take up to MAX_JOBS rows ordered oldest-first, then
// process them sequentially under a wall-clock budget. Bailing on budget
// is fine — the next cron tick picks up whatever didn't run.

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runUserRecomputeBlocking } from "@/lib/queue/recompute";
import {
  MAX_RESUME_PARSE_ATTEMPTS,
  processResumeParseJob,
} from "@/lib/resume/process-job";
import {
  failDurableJob,
  requeueDurableJob,
  transitionDurableJob,
} from "@/lib/jobs/state";
import { logEvent } from "@/lib/observability/log";
import { requireCronAuth } from "@/lib/security/cron";
import { notifyUser } from "@/lib/push/notify";

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

// How many queued jobs to pull per cron tick. Each match_compute typically
// takes 10–30s; 12 jobs × ~20s = ~240s, leaves 60s headroom under the 300s
// cap for tail latency.
const MAX_JOBS = 12;

// Wall-clock budget — bail before Vercel kills us at maxDuration, leaving
// remaining queued rows for the next 15-min tick.
const BUDGET_MS = 270_000;
const STALE_RESUME_PARSE_MS = 5 * 60_000;

type QueuedJobRow = {
  id: string;
  user_id: string;
  resume_version_id: string | null;
  job_type: "resume_parse" | "match_compute";
  source: string | null;
  attempts: number | null;
  payload: Record<string, unknown> | null;
};

async function drain(req: NextRequest): Promise<NextResponse> {
  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();

  const { data: interruptedJobs, error: interruptedError } = await (admin
    .from("background_jobs")
    .select("id, user_id, resume_version_id, attempts, payload")
    .eq("job_type", "resume_parse")
    .eq("status", "running")
    .lte("started_at", new Date(Date.now() - STALE_RESUME_PARSE_MS).toISOString())
    .order("started_at", { ascending: true })
    .limit(MAX_JOBS) as never) as {
      data: Array<{
        id: string;
        user_id: string;
        resume_version_id: string | null;
        attempts: number | null;
        payload: Record<string, unknown> | null;
      }> | null;
      error: { message: string } | null;
    };
  if (interruptedError) {
    logEvent("error", "resume_queue_recovery_read_failed", { error: "database" });
    return NextResponse.json({ ok: false, error: "Could not recover interrupted jobs." }, { status: 500 });
  }

  for (const job of interruptedJobs ?? []) {
    if ((job.attempts ?? 0) < MAX_RESUME_PARSE_ATTEMPTS) {
      await requeueDurableJob(admin, job.id, {
        errorCode: "worker_interrupted",
        errorMessage: "The previous worker stopped before finishing. Retrying.",
        delayMs: 0,
      });
      continue;
    }

    const message = "Resume processing stopped before it could finish. Please upload the PDF again.";
    await failDurableJob(admin, job.id, "worker_interrupted", message);
    await (admin.from("profiles") as any)
      .update({
        resume_parsing_at: null,
        resume_parse_error: message,
        pending_resume_version_id: null,
      })
      .eq("id", job.user_id)
      .eq("pending_resume_version_id", job.resume_version_id);
    const storagePath = job.payload?.storage_path;
    if (typeof storagePath === "string") {
      await admin.storage.from("resumes").remove([storagePath]);
    }
    await notifyUser(job.user_id, {
      type: "resume_updates",
      title: "We couldn't process your resume",
      body: "Your previous resume is still safe. Please upload the PDF again.",
      url: "/profile",
      priority: "important",
      idempotencyKey: `resume_parse_failed:${job.resume_version_id ?? job.id}`,
    }).catch(() => undefined);
  }

  const { data: jobs, error } = await (admin
    .from("background_jobs")
    .select("id, user_id, resume_version_id, job_type, source, attempts, payload")
    .in("job_type", ["resume_parse", "match_compute"])
    .eq("status", "queued")
    .lte("queued_at", new Date().toISOString())
    .order("queued_at", { ascending: true })
    .limit(MAX_JOBS) as never) as { data: QueuedJobRow[] | null; error: { message: string } | null };

  if (error) {
    logEvent("error", "background_queue_read_failed", { error: "database" });
    return NextResponse.json({ ok: false, error: "Could not read queue." }, { status: 500 });
  }

  const results: Array<{ jobId: string; type: QueuedJobRow["job_type"]; ok: boolean; total?: number; error?: string }> = [];
  let bailedOnBudget = false;
  for (const job of jobs ?? []) {
    if (Date.now() - startedAt > BUDGET_MS) {
      bailedOnBudget = true;
      break;
    }
    if (job.job_type === "resume_parse") {
      const storagePath = job.payload?.storage_path;
      if (!job.resume_version_id || typeof storagePath !== "string") {
        await transitionDurableJob(admin, job.id, "failed", {
          errorCode: "invalid_payload",
          errorMessage: "Resume parse job is missing its version or storage path.",
        });
        results.push({ jobId: job.id, type: job.job_type, ok: false, error: "invalid_payload" });
        continue;
      }
      const result = await processResumeParseJob({
        jobId: job.id,
        userId: job.user_id,
        resumeVersionId: job.resume_version_id,
        storagePath,
      });
      results.push({
        jobId: job.id,
        type: job.job_type,
        ok: result.state === "succeeded" || result.state === "superseded",
        error: result.state === "failed" ? "resume_parse_failed" : undefined,
      });
      continue;
    }

    const result = await runUserRecomputeBlocking(job.user_id, {
      forceFull: true,
      source: job.source ?? "queue_drain",
      resumeVersionId: job.resume_version_id,
      jobId: job.id,
    });
    if (!result.ok) {
      // runTrackedRecompute already flipped the durable job to failed /
      // superseded inside the catch. transitionDurableJob here is a
      // belt-and-braces only for the unusual case where the throw
      // happened before that catch had a chance to run.
      await transitionDurableJob(admin, job.id, "failed", {
        errorCode: "queue_drain_failed",
        errorMessage: result.error.slice(0, 240),
      });
      results.push({ jobId: job.id, type: job.job_type, ok: false, error: result.error });
      logEvent("warn", "queue_drain_job_failed", {
        job_id: job.id,
        user_id: job.user_id.slice(0, 8),
        source: job.source ?? "queue_drain",
        attempts: job.attempts ?? 0,
      });
    } else {
      results.push({ jobId: job.id, type: job.job_type, ok: true, total: result.total });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    failed: results.filter((r) => !r.ok).length,
    queue_size_seen: (jobs ?? []).length,
    bailed_on_budget: bailedOnBudget,
    elapsed_ms: Date.now() - startedAt,
    results,
  });
}

// Vercel cron defaults to GET. Operator-triggered Ops Console button can
// use POST. Both paths route to the same drainer.
export async function GET(req: NextRequest) { return drain(req); }
export async function POST(req: NextRequest) { return drain(req); }
