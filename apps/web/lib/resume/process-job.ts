import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseResumePdf, type ParsedResume } from "@/lib/llm/prompts/resume-parse";
import { LlmRunError } from "@/lib/llm/gemini";
import { computeDnaBreakdown } from "@/lib/matching/dna-breakdown";
import { parsedResumeToJson } from "@/lib/resume/json-mapper";
import { notifyUser } from "@/lib/push/notify";
import { logEvent } from "@/lib/observability/log";
import {
  claimDurableJob,
  failDurableJob,
  requeueDurableJob,
  transitionDurableJob,
} from "@/lib/jobs/state";
import type { Json } from "@/lib/supabase/types";

const PARSE_STAGE_TIMEOUT_MS = 210_000;
export const MAX_RESUME_PARSE_ATTEMPTS = 3;

class ResumeParseStageTimeout extends Error {
  constructor() {
    super("resume_parse_stage_timeout");
    this.name = "ResumeParseStageTimeout";
  }
}

function computeResumeSignature(parsed: ParsedResume): string {
  const stable = JSON.stringify({
    role_function: parsed.role_function ?? "",
    target_role_functions: [...(parsed.target_role_functions ?? [])].sort(),
    total_years_experience: Math.round((parsed.total_years_experience ?? 0) * 10) / 10,
    tech_stack: [...(parsed.tech_stack ?? [])].map((s) => s.toLowerCase().trim()).sort(),
    companies: (parsed.companies ?? []).map((company) => ({
      name: (company.name ?? "").toLowerCase().trim(),
      role: (company.role ?? "").toLowerCase().trim(),
      years: Math.round((company.years ?? 0) * 10) / 10,
      is_product_company: Boolean(company.is_product_company),
    })),
    products_built: [...(parsed.products_built ?? [])].map((s) => s.trim()).sort(),
    summary: (parsed.summary ?? "").trim(),
  });
  return createHash("sha256").update(stable).digest("hex");
}

function parseFailure(err: unknown): {
  code: string;
  message: string;
  retryable: boolean;
} {
  if (err instanceof ResumeParseStageTimeout) {
    return {
      code: "parse_timeout",
      message: "Resume processing exceeded the safe limit. We will retry automatically.",
      retryable: true,
    };
  }
  if (err instanceof LlmRunError) {
    const retryable = err.detail.kind === "rate_limited" ||
      err.detail.kind === "quota_disabled" ||
      err.detail.kind === "all_keys_exhausted" ||
      err.detail.kind === "model_unavailable" ||
      err.detail.kind === "unknown";
    return {
      code: `llm_${err.detail.kind}`,
      message: retryable
        ? "Resume processing is temporarily delayed. We will retry automatically."
        : "Resume processing is temporarily unavailable. Please try again later.",
      retryable,
    };
  }
  return {
    code: "parse_failed",
    message: "We could not read this resume. Export a fresh, unlocked PDF and try again.",
    retryable: false,
  };
}

async function removeUploadedResume(path: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from("resumes").remove([path]);
  if (error) throw error;
}

export type ResumeParseJobInput = {
  jobId: string;
  userId: string;
  resumeVersionId: string;
  storagePath: string;
};

export async function processResumeParseJob(input: ResumeParseJobInput): Promise<{
  claimed: boolean;
  state: "succeeded" | "retrying" | "failed" | "superseded" | "not_claimed";
}> {
  const admin = createSupabaseAdminClient();
  const claimed = await claimDurableJob(admin, input.jobId);
  if (!claimed) return { claimed: false, state: "not_claimed" };

  logEvent("info", "resume_parse_worker_started", {
    job_id: input.jobId,
    user_id: input.userId.slice(0, 8),
    resume_version_id: input.resumeVersionId,
    attempt: claimed.attempts,
  });

  const { data: file, error: downloadError } = await admin.storage
    .from("resumes")
    .download(input.storagePath);
  if (downloadError || !file) {
    await failDurableJob(admin, input.jobId, "storage_download_failed", "Could not load the uploaded resume.");
    await (admin.from("profiles") as any)
      .update({
        resume_parsing_at: null,
        resume_parse_error: "We could not load the uploaded PDF. Please upload it again.",
        pending_resume_version_id: null,
      })
      .eq("id", input.userId)
      .eq("pending_resume_version_id", input.resumeVersionId);
    return { claimed: true, state: "failed" };
  }

  let parsed: ParsedResume;
  let parseTimer: ReturnType<typeof setTimeout> | undefined;
  try {
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    parsed = await Promise.race([
      parseResumePdf(base64),
      new Promise<never>((_, reject) => {
        parseTimer = setTimeout(
          () => reject(new ResumeParseStageTimeout()),
          PARSE_STAGE_TIMEOUT_MS,
        );
      }),
    ]);
  } catch (err) {
    const failure = parseFailure(err);
    logEvent("warn", "resume_parse_worker_failed", {
      job_id: input.jobId,
      user_id: input.userId.slice(0, 8),
      resume_version_id: input.resumeVersionId,
      attempt: claimed.attempts,
      error: failure.code,
      retryable: failure.retryable,
    });

    if (failure.retryable && claimed.attempts < MAX_RESUME_PARSE_ATTEMPTS) {
      const delayMs = Math.min(60_000, 5_000 * 2 ** Math.max(0, claimed.attempts - 1));
      await requeueDurableJob(admin, input.jobId, {
        errorCode: failure.code,
        errorMessage: failure.message,
        delayMs,
      });
      return { claimed: true, state: "retrying" };
    }

    try {
      await removeUploadedResume(input.storagePath);
    } catch (cleanupErr) {
      logEvent("warn", "resume_parse_cleanup_failed", {
        job_id: input.jobId,
        user_id: input.userId.slice(0, 8),
        error: cleanupErr instanceof Error ? cleanupErr.name : "unknown",
      });
    }
    await (admin.from("profiles") as any)
      .update({
        resume_parsing_at: null,
        resume_parse_error: failure.message,
        pending_resume_version_id: null,
      })
      .eq("id", input.userId)
      .eq("pending_resume_version_id", input.resumeVersionId);
    await failDurableJob(admin, input.jobId, failure.code, failure.message);
    await notifyUser(input.userId, {
      type: "resume_updates",
      title: "We couldn't process your resume",
      body: "Please review the PDF and upload it again.",
      url: "/profile",
      priority: "important",
      idempotencyKey: `resume_parse_failed:${input.resumeVersionId}`,
    }).catch(() => undefined);
    return { claimed: true, state: "failed" };
  } finally {
    if (parseTimer) clearTimeout(parseTimer);
  }

  try {
    const { data: currentProfile, error: currentError } = await (admin
      .from("profiles")
      .select("pending_resume_version_id")
      .eq("id", input.userId)
      .maybeSingle() as any) as {
        data: { pending_resume_version_id: string | null } | null;
        error: { message: string } | null;
      };
    if (currentError) throw new Error("Could not verify pending resume version.");
    if (currentProfile?.pending_resume_version_id !== input.resumeVersionId) {
      await removeUploadedResume(input.storagePath).catch(() => undefined);
      await transitionDurableJob(admin, input.jobId, "superseded", {
        errorCode: "superseded",
        errorMessage: "A newer resume upload superseded this parse.",
      });
      return { claimed: true, state: "superseded" };
    }

    const dnaBreakdown = computeDnaBreakdown(parsed);
    const { error: draftError } = await (admin.from("resume_versions") as any).upsert({
      id: input.resumeVersionId,
      user_id: input.userId,
      resume_parsed: parsed as unknown as Json,
      resume_json: parsedResumeToJson(parsed) as unknown as Json,
      resume_storage_path: input.storagePath,
      product_dna_score: dnaBreakdown.total,
      dna_breakdown: dnaBreakdown as unknown as Json,
      resume_signature: computeResumeSignature(parsed),
      source: "overwrite",
    }, { onConflict: "id" });
    if (draftError) throw draftError;

    const { data: updated, error: updateError } = await (admin.from("profiles") as any)
      .update({
        resume_parsing_at: null,
        resume_parse_error: null,
        pending_resume_version_id: input.resumeVersionId,
      })
      .eq("id", input.userId)
      .eq("pending_resume_version_id", input.resumeVersionId)
      .select("id")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      await removeUploadedResume(input.storagePath).catch(() => undefined);
      await transitionDurableJob(admin, input.jobId, "superseded", {
        errorCode: "superseded",
        errorMessage: "A newer resume upload superseded this parse.",
      });
      return { claimed: true, state: "superseded" };
    }

    await transitionDurableJob(admin, input.jobId, "succeeded");
    await notifyUser(input.userId, {
      type: "resume_updates",
      title: "Your resume is ready",
      body: "We analysed your profile. Review it before computing your latest matches.",
      url: "/profile/resume",
      priority: "important",
      idempotencyKey: `resume_parse_ready:${input.resumeVersionId}`,
    }).catch(() => undefined);
    logEvent("info", "resume_parse_worker_completed", {
      job_id: input.jobId,
      user_id: input.userId.slice(0, 8),
      resume_version_id: input.resumeVersionId,
      attempt: claimed.attempts,
    });
    return { claimed: true, state: "succeeded" };
  } catch (err) {
    logEvent("error", "resume_parse_post_processing_failed", {
      job_id: input.jobId,
      user_id: input.userId.slice(0, 8),
      resume_version_id: input.resumeVersionId,
      error: err instanceof Error ? err.name : "unknown",
    });
    await Promise.allSettled([
      admin.from("resume_versions")
        .delete()
        .eq("id", input.resumeVersionId)
        .eq("user_id", input.userId),
      removeUploadedResume(input.storagePath),
    ]);
    await (admin.from("profiles") as any)
      .update({
        resume_parsing_at: null,
        resume_parse_error: "Resume processing failed while saving the result. Please upload again.",
        pending_resume_version_id: null,
      })
      .eq("id", input.userId)
      .eq("pending_resume_version_id", input.resumeVersionId);
    await failDurableJob(
      admin,
      input.jobId,
      "post_processing_failed",
      "Resume processing failed while saving the result.",
    );
    await notifyUser(input.userId, {
      type: "resume_updates",
      title: "We couldn't finish processing your resume",
      body: "Your previous resume is still safe. Please upload the PDF again.",
      url: "/profile",
      priority: "important",
      idempotencyKey: `resume_parse_failed:${input.resumeVersionId}`,
    }).catch(() => undefined);
    return { claimed: true, state: "failed" };
  }
}
