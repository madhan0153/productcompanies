import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { runUserRecomputeBlocking } from "@/lib/queue/recompute";
import { transitionDurableJob } from "@/lib/jobs/state";
import { logEvent } from "@/lib/observability/log";
import { requireCronAuth } from "@/lib/security/cron";

export const runtime = "nodejs";
export const maxDuration = 300;

type QueuedJobRow = {
  id: string;
  user_id: string;
  resume_version_id: string | null;
  job_type: "match_compute";
  source: string | null;
};

export async function GET(req: NextRequest) {
  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const admin = createSupabaseAdminClient();
  const { data: jobs, error } = await (admin
    .from("background_jobs")
    .select("id, user_id, resume_version_id, job_type, source")
    .eq("job_type", "match_compute")
    .eq("status", "queued")
    .order("queued_at", { ascending: true })
    .limit(5) as any) as { data: QueuedJobRow[] | null; error: { message: string } | null };

  if (error) {
    logEvent("error", "background_queue_read_failed", { error: "database" });
    return NextResponse.json({ ok: false, error: "Could not read queue." }, { status: 500 });
  }

  const results = [];
  for (const job of jobs ?? []) {
    const result = await runUserRecomputeBlocking(job.user_id, {
      forceFull: true,
      source: job.source ?? "queue_drain",
      resumeVersionId: job.resume_version_id,
      jobId: job.id,
    });
    if (!result.ok) {
      await transitionDurableJob(admin, job.id, "failed", {
        errorCode: "queue_drain_failed",
        errorMessage: "Queued recompute failed. Retry from Matches when your resume is ready.",
      });
      results.push({ jobId: job.id, ok: false });
    } else {
      results.push({ jobId: job.id, ok: true, total: result.total });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
