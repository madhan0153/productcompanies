import type { SupabaseClient } from "@supabase/supabase-js";
import { findActiveJob, type DurableJob } from "@/lib/jobs/state";

type AdminClient = SupabaseClient;

export type ResumeReadinessCode =
  | "missing_resume"
  | "parse_running"
  | "parse_failed"
  | "parsed_not_current"
  | "embedding_not_current"
  | "compute_running"
  | "ready";

export interface ResumeReadiness {
  ready: boolean;
  code: ResumeReadinessCode;
  message: string;
  activeResumeVersionId: string | null;
  matchesResumeVersionId: string | null;
  activeComputeJob: DurableJob | null;
}

type ProfileReadinessRow = {
  resume_storage_path: string | null;
  resume_parsed: unknown | null;
  resume_parse_error: string | null;
  resume_parsing_at: string | null;
  active_resume_version_id: string | null;
  pending_resume_version_id: string | null;
  resume_parsed_version_id: string | null;
  resume_embedding: number[] | null;
  resume_embedding_version_id: string | null;
  matches_resume_version_id: string | null;
};

export async function getResumeReadinessForCompute(
  admin: AdminClient,
  userId: string,
): Promise<ResumeReadiness> {
  const { data, error } = await admin
    .from("profiles")
    .select([
      "resume_storage_path",
      "resume_parsed",
      "resume_parse_error",
      "resume_parsing_at",
      "active_resume_version_id",
      "pending_resume_version_id",
      "resume_parsed_version_id",
      "resume_embedding",
      "resume_embedding_version_id",
      "matches_resume_version_id",
    ].join(", "))
    .eq("id", userId)
    .maybeSingle() as { data: ProfileReadinessRow | null; error: { message: string } | null };

  if (error) throw new Error(`Could not read resume readiness: ${error.message}`);

  const base = {
    activeResumeVersionId: data?.active_resume_version_id ?? null,
    matchesResumeVersionId: data?.matches_resume_version_id ?? null,
    activeComputeJob: null,
  };

  if (!data?.resume_storage_path || !data.active_resume_version_id) {
    return {
      ...base,
      ready: false,
      code: "missing_resume",
      message: "Upload a resume before computing matches.",
    };
  }

  const activeParseJob = await findActiveJob(admin, { userId, type: "resume_parse" });
  if (data.pending_resume_version_id || data.resume_parsing_at || activeParseJob) {
    return {
      ...base,
      ready: false,
      code: "parse_running",
      message: "Your resume is still being processed. Compute will be available after parsing finishes.",
    };
  }

  if (data.resume_parse_error) {
    return {
      ...base,
      ready: false,
      code: "parse_failed",
      message: "Resume parsing failed. Re-upload your PDF before computing matches.",
    };
  }

  if (!data.resume_parsed || data.resume_parsed_version_id !== data.active_resume_version_id) {
    return {
      ...base,
      ready: false,
      code: "parsed_not_current",
      message: "Your current resume has not finished parsing yet.",
    };
  }

  if (!data.resume_embedding || data.resume_embedding_version_id !== data.active_resume_version_id) {
    return {
      ...base,
      ready: false,
      code: "embedding_not_current",
      message: "Resume matching signals are still being prepared. Please re-upload if this does not clear.",
    };
  }

  const activeComputeJob = await findActiveJob(admin, {
    userId,
    type: "match_compute",
    resumeVersionId: data.active_resume_version_id,
  });
  if (activeComputeJob) {
    return {
      ...base,
      activeComputeJob,
      ready: false,
      code: "compute_running",
      message: "A match computation is already running for this resume.",
    };
  }

  return {
    ...base,
    ready: true,
    code: "ready",
    message: "Resume is ready for matching.",
  };
}
