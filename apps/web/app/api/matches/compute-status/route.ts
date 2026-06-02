import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ComputeStatus =
  | "no_resume"
  | "computing"
  | "ready"
  | "needs_compute"
  | "failed";

export async function GET() {
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
}
