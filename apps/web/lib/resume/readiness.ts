import type { SupabaseClient } from "@supabase/supabase-js";
import { findActiveJob, findLatestJob, type DurableJob } from "@/lib/jobs/state";

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
  last_match_compute_at: string | null;
};

export type ResumeStatusKind = "missing" | "parsing" | "failed" | "ready";
export type MatchStatusKind = "blocked" | "computing" | "failed" | "stale" | "up_to_date" | "not_computed";

export interface ResumeMatchStatus {
  resume: {
    kind: ResumeStatusKind;
    title: string;
    message: string;
  };
  matches: {
    kind: MatchStatusKind;
    title: string;
    message: string;
  };
  canCompute: boolean;
  activeResumeVersionId: string | null;
  matchesResumeVersionId: string | null;
  lastMatchComputeAt: string | null;
  latestParseJob: DurableJob | null;
  latestComputeJob: DurableJob | null;
  activeComputeJob: DurableJob | null;
}

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
      "last_match_compute_at",
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

export async function getResumeMatchStatus(
  admin: AdminClient,
  userId: string,
): Promise<ResumeMatchStatus> {
  const readiness = await getResumeReadinessForCompute(admin, userId);
  const { data, error } = await admin
    .from("profiles")
    .select("last_match_compute_at")
    .eq("id", userId)
    .maybeSingle() as { data: { last_match_compute_at: string | null } | null; error: { message: string } | null };
  if (error) throw new Error(`Could not read match status: ${error.message}`);

  const latestParseJob = await findLatestJob(admin, { userId, type: "resume_parse" });
  const latestComputeJob = await findLatestJob(admin, {
    userId,
    type: "match_compute",
    resumeVersionId: readiness.activeResumeVersionId,
  });

  const resume = (() => {
    switch (readiness.code) {
      case "missing_resume":
        return {
          kind: "missing" as const,
          title: "Resume required",
          message: "Upload a PDF resume before computing matches.",
        };
      case "parse_running":
        return {
          kind: "parsing" as const,
          title: "Resume is being processed",
          message: "Matching unlocks as soon as parsing and embeddings finish.",
        };
      case "parse_failed":
      case "parsed_not_current":
      case "embedding_not_current":
        return {
          kind: "failed" as const,
          title: "Resume is not ready",
          message: readiness.message,
        };
      case "compute_running":
      case "ready":
        return {
          kind: "ready" as const,
          title: "Resume ready",
          message: "Your current resume is parsed and ready for matching.",
        };
    }
  })();

  let matches: ResumeMatchStatus["matches"];
  if (!readiness.ready && readiness.code !== "compute_running") {
    matches = {
      kind: "blocked",
      title: "Matches paused",
      message: "Fix the resume status above before computing matches.",
    };
  } else if (readiness.activeComputeJob) {
    matches = {
      kind: "computing",
      title: "Matches computing",
      message: "A recompute is running for the current resume. Results update automatically after it finishes.",
    };
  } else if (latestComputeJob?.status === "failed") {
    matches = {
      kind: "failed",
      title: "Last compute failed",
      message: latestComputeJob.error_message ?? "Compute could not finish. You can retry when the resume is ready.",
    };
  } else if (
    readiness.activeResumeVersionId &&
    readiness.matchesResumeVersionId &&
    readiness.matchesResumeVersionId !== readiness.activeResumeVersionId
  ) {
    matches = {
      kind: "stale",
      title: "Matches are from an older resume",
      message: "Your resume was replaced after these matches were computed. Recompute to refresh rankings.",
    };
  } else if (readiness.activeResumeVersionId && readiness.matchesResumeVersionId === readiness.activeResumeVersionId) {
    matches = {
      kind: "up_to_date",
      title: "Matches up to date",
      message: "Rankings were computed from your current resume version.",
    };
  } else {
    matches = {
      kind: "not_computed",
      title: "Matches not computed yet",
      message: "Run Compute to rank active jobs against your current resume.",
    };
  }

  return {
    resume,
    matches,
    canCompute: readiness.ready,
    activeResumeVersionId: readiness.activeResumeVersionId,
    matchesResumeVersionId: readiness.matchesResumeVersionId,
    lastMatchComputeAt: data?.last_match_compute_at ?? null,
    latestParseJob,
    latestComputeJob,
    activeComputeJob: readiness.activeComputeJob,
  };
}
