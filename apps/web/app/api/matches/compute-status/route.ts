import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isComputeJobStale, reapStaleComputeJobs } from "@/lib/jobs/state";
import { safeRoute } from "@/lib/http/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ComputeStatus =
  | "no_resume"
  | "computing"
  | "ready"
  | "needs_compute"
  | "failed";

// Wrapped so a transient DB/auth throw mid-poll returns a logged, safe 500
// (with a requestId) instead of an opaque crash. The poller reads `body.status`
// and simply keeps polling when it's absent, so behaviour is unchanged.
export const GET = safeRoute("matches.compute-status", async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ status: "no_resume" satisfies ComputeStatus }, { status: 401 });

  const admin = createSupabaseAdminClient();
  const { data: profile } = await (admin
    .from("profiles")
    .select("active_resume_version_id, matches_resume_version_id")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: {
        active_resume_version_id: string | null;
        matches_resume_version_id: string | null;
      } | null;
    };

  const activeResumeVersionId = profile?.active_resume_version_id ?? null;
  if (!activeResumeVersionId) {
    return NextResponse.json({
      status: "no_resume" satisfies ComputeStatus,
      activeResumeVersionId: null,
      matchesResumeVersionId: null,
    });
  }

  const { data: latestJob } = await ((admin.from("background_jobs") as any)
    .select("status, queued_at, started_at, finished_at, error_message")
    .eq("user_id", user.id)
    .eq("job_type", "match_compute")
    .eq("resume_version_id", activeResumeVersionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as any) as {
      data: {
        status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "superseded";
        queued_at: string | null;
        started_at: string | null;
        finished_at: string | null;
        error_message: string | null;
      } | null;
    };

  if (latestJob?.status === "queued" || latestJob?.status === "running") {
    // Self-heal: a job that has sat active far longer than any healthy run had
    // its serverless function killed mid-run. Reap it so the poller stops and
    // the user can retry, instead of polling a zombie "computing" forever.
    if (isComputeJobStale(latestJob)) {
      await reapStaleComputeJobs(admin, user.id);
      return NextResponse.json({
        status: "failed" satisfies ComputeStatus,
        error: "Match computation timed out before it finished. Please retry.",
        activeResumeVersionId,
        matchesResumeVersionId: profile?.matches_resume_version_id ?? null,
      });
    }
    return NextResponse.json({
      status: "computing" satisfies ComputeStatus,
      jobStatus: latestJob.status,
      queuedAt: latestJob.queued_at,
      startedAt: latestJob.started_at,
      activeResumeVersionId,
      matchesResumeVersionId: profile?.matches_resume_version_id ?? null,
    });
  }

  if (latestJob?.status === "failed") {
    return NextResponse.json({
      status: "failed" satisfies ComputeStatus,
      error: latestJob.error_message ?? "Match computation failed. Please try again.",
      activeResumeVersionId,
      matchesResumeVersionId: profile?.matches_resume_version_id ?? null,
    });
  }

  const matchesResumeVersionId = profile?.matches_resume_version_id ?? null;
  return NextResponse.json({
    status: matchesResumeVersionId === activeResumeVersionId
      ? ("ready" satisfies ComputeStatus)
      : ("needs_compute" satisfies ComputeStatus),
    activeResumeVersionId,
    matchesResumeVersionId,
  });
});
