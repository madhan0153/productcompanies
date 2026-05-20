"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { enqueueUserRecompute } from "@/lib/queue/recompute";
import { createDurableJob, assertNoSupabaseError, countRecentJobs, findLatestJob } from "@/lib/jobs/state";
import { getResumeReadinessForCompute } from "@/lib/resume/readiness";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";

export type ComputeMatchesResult =
  | { ok: true; queued: true; startedAt: string; jobId: string }
  | { ok: false; error: string };

export type MatchComputeStatus =
  | { state: "idle"; lastMatchComputeAt: string | null }
  | { state: "running"; jobId: string; queuedAt: string; startedAt: string | null; lastMatchComputeAt: string | null }
  | { state: "succeeded"; jobId: string; finishedAt: string | null; lastMatchComputeAt: string | null }
  | { state: "failed"; jobId: string; error: string; lastMatchComputeAt: string | null };

export async function computeMatches(): Promise<ComputeMatchesResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return {
      ok: false,
      error: "Enable AI Matching consent in Settings -> Privacy to use this feature.",
    };
  }

  const admin = createSupabaseAdminClient();
  const readiness = await getResumeReadinessForCompute(admin, user.id);
  if (!readiness.ready || !readiness.activeResumeVersionId) {
    return { ok: false, error: readiness.message };
  }
  const recentComputeCount = await countRecentJobs(admin, {
    userId: user.id,
    type: "match_compute",
    sinceIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  if (recentComputeCount >= 10) {
    return { ok: false, error: "Compute retry limit reached. Please try again in about an hour." };
  }

  const computeLimit = checkRateLimit({
    key: userActionKey(user.id, "match-compute"),
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (!computeLimit.ok) {
    return {
      ok: false,
      error: `Too many match recomputes. Please try again in ${computeLimit.retryAfterSeconds} seconds.`,
    };
  }

  const startedAt = new Date().toISOString();
  let job;
  try {
    job = await createDurableJob(admin, {
      userId: user.id,
      type: "match_compute",
      resumeVersionId: readiness.activeResumeVersionId,
      source: "user_button",
      idempotencyKey: `match_compute:${user.id}:${readiness.activeResumeVersionId}`,
    });
  } catch {
    return { ok: false, error: "A match computation is already running for this resume." };
  }

  enqueueUserRecompute(user.id, {
    forceFull: true,
    source: "user_button",
    resumeVersionId: readiness.activeResumeVersionId,
    jobId: job.id,
  });

  return { ok: true, queued: true, startedAt, jobId: job.id };
}

export async function getMatchComputeStatus(jobId?: string | null): Promise<MatchComputeStatus> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { state: "idle", lastMatchComputeAt: null };

  const admin = createSupabaseAdminClient();
  const { data: profile } = await (supabase
    .from("profiles")
    .select("last_match_compute_at, active_resume_version_id")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: { last_match_compute_at: string | null; active_resume_version_id: string | null } | null;
    };
  const lastMatchComputeAt = profile?.last_match_compute_at ?? null;

  let job = null;
  if (jobId) {
    const { data, error } = await (admin
      .from("background_jobs")
      .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle() as any) as {
        data: {
          id: string;
          status: "queued" | "running" | "succeeded" | "failed" | "cancelled" | "superseded";
          error_message: string | null;
          queued_at: string;
          started_at: string | null;
          finished_at: string | null;
        } | null;
        error: { message: string } | null;
      };
    assertNoSupabaseError(error, "Could not read compute job");
    job = data;
  } else if (profile?.active_resume_version_id) {
    job = await findLatestJob(admin, {
      userId: user.id,
      type: "match_compute",
      resumeVersionId: profile.active_resume_version_id,
    });
  }

  if (!job) return { state: "idle", lastMatchComputeAt };
  if (job.status === "queued" || job.status === "running") {
    return {
      state: "running",
      jobId: job.id,
      queuedAt: job.queued_at,
      startedAt: job.started_at,
      lastMatchComputeAt,
    };
  }
  if (job.status === "failed") {
    return {
      state: "failed",
      jobId: job.id,
      error: job.error_message ?? "Compute failed. Please retry.",
      lastMatchComputeAt,
    };
  }
  if (job.status === "succeeded") {
    return {
      state: "succeeded",
      jobId: job.id,
      finishedAt: job.finished_at,
      lastMatchComputeAt,
    };
  }
  return { state: "idle", lastMatchComputeAt };
}

export async function markMatchesSeen(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const admin = createSupabaseAdminClient();

  const { error } = await (admin.from("matches") as any)
    .update({ seen_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("seen_at", null);
  assertNoSupabaseError(error, "Could not mark matches as seen");
}

// Dismiss / restore flow removed. All matches stay visible; users use tabs and
// filters to focus the list. The `user_hidden` column remains for feedback.
