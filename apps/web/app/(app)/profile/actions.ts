"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseResumePdf } from "@/lib/llm/prompts/resume-parse";
import { LlmRunError } from "@/lib/llm/gemini";
import { getUserConsents } from "@/lib/dpdp/consent";
import { computeResumeScore } from "@/lib/matching/resume-score";
import { computeDnaBreakdown } from "@/lib/matching/dna-breakdown";
import { snapshotCurrentResume } from "@/lib/matching/resume-versions";
import { embed, buildResumeEmbedText } from "@/lib/llm/embed";
import { enqueueUserRecompute } from "@/lib/queue/recompute";
import {
  assertNoSupabaseError,
  countRecentJobs,
  createDurableJob,
  failDurableJob,
  findActiveJob,
  supersedeActiveJobs,
  transitionDurableJob,
} from "@/lib/jobs/state";
import { logEvent } from "@/lib/observability/log";
import { validateResumePdf, verifyPdfPageCount } from "@/lib/security/pdf";
import { checkRateLimitShared, userActionKey } from "@/lib/security/rate-limit";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { SeniorityLevel } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";

// Content-only signature for the parsed resume — drives the Fit-Card cache.
// Fields chosen to match what the Fit Card prompt reads. Stable across PDF
// re-uploads if the underlying content is identical; flips immediately when
// the user actually edits role, years, stack, or projects.
function computeResumeSignature(parsed: ParsedResume): string {
  const stable = JSON.stringify({
    role_function:          parsed.role_function ?? "",
    target_role_functions:  [...(parsed.target_role_functions ?? [])].sort(),
    total_years_experience: Math.round((parsed.total_years_experience ?? 0) * 10) / 10,
    tech_stack:             [...(parsed.tech_stack ?? [])].map((s) => s.toLowerCase().trim()).sort(),
    companies:              (parsed.companies ?? []).map((c) => ({
                              name: (c.name ?? "").toLowerCase().trim(),
                              role: (c.role ?? "").toLowerCase().trim(),
                              years: Math.round((c.years ?? 0) * 10) / 10,
                              is_product_company: Boolean(c.is_product_company),
                            })),
    products_built:         [...(parsed.products_built ?? [])].map((s) => s.trim()).sort(),
    summary:                (parsed.summary ?? "").trim(),
  });
  return createHash("sha256").update(stable).digest("hex");
}

// Compute the live top-30 most-demanded skills across active jobs. Same
// algorithm as the Insights page; centralised here so resume-score reads from
// authoritative market signal rather than guesses.
async function fetchTop30Demand(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string[]> {
  const { data: rows } = await admin
    .from("jobs")
    .select("must_have_skills, tech_stack")
    .eq("is_active", true);
  const demand = new Map<string, number>();
  const norm = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "").replace(/[.\-_]/g, "").replace(/js$/, "");
  for (const r of (rows as Array<{ must_have_skills: string[] | null; tech_stack: string[] | null }> | null) ?? []) {
    const seen = new Set<string>();
    // Prefer JD-parsed must-haves (high-quality signal); fall back to tech_stack
    const skills = (r.must_have_skills?.length ? r.must_have_skills : r.tech_stack) ?? [];
    for (const t of skills) {
      const c = norm(t);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      demand.set(c, (demand.get(c) ?? 0) + 1);
    }
  }
  return [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c]) => c);
}

async function removeUploadedResume(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  path: string,
): Promise<void> {
  const { error } = await admin.storage.from("resumes").remove([path]);
  assertNoSupabaseError(error, "Could not remove uploaded resume");
}

export async function refreshResumeScore(): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_parsed, target_role_functions")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = (profile as { resume_parsed?: ParsedResume | null } | null)?.resume_parsed;
  if (!parsed) return { ok: false, error: "Upload a resume first." };

  const top30 = await fetchTop30Demand(admin);
  const result = computeResumeScore({
    resume: parsed,
    top30Demand: top30,
    userTargets: ((profile as { target_role_functions?: string[] | null } | null)?.target_role_functions) ?? [],
  });
  // Recompute DNA breakdown too — both derive from the same parsed resume, so
  // a manual refresh keeps them in lock-step. resume_signature stays stable
  // (parsed content unchanged), so cached Fit Cards remain valid.
  const dna = computeDnaBreakdown(parsed);


  await (admin.from("profiles") as any).update({
    resume_score: result.score,
    resume_score_breakdown: result.breakdown as unknown as Json,
    resume_tips: result.tips as unknown as Json,
    resume_score_at: new Date().toISOString(),
    product_dna_score: dna.total,
    dna_breakdown: dna as unknown as Json,
  }).eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  return { ok: true, score: result.score };
}

const INDIA_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India"];

// ── Save profile fields (no resume) ──────────────────────────────────────────

export async function saveProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const displayName = (formData.get("display_name") as string).trim();
  const currentRole = (formData.get("current_role") as string).trim();
  const yearsRaw = formData.get("years_experience") as string;
  const currentLpaRaw = formData.get("current_lpa") as string;
  const targetLpaRaw = formData.get("target_lpa") as string;
  const techRaw = (formData.get("tech_stack") as string).trim();
  const hubs = INDIA_HUBS.filter((h) => formData.get(`hub_${h.replace(/\s+/g, "_")}`) === "on");
  const seniority = (formData.get("seniority") as string) || null;

  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName || null,
    current_role: currentRole || null,
    years_experience: yearsRaw ? parseInt(yearsRaw, 10) : null,
    current_lpa: currentLpaRaw ? parseFloat(currentLpaRaw) : null,
    target_lpa: targetLpaRaw ? parseFloat(targetLpaRaw) : null,
    tech_stack: techRaw ? techRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    preferred_hubs: hubs,
    seniority: seniority as SeniorityLevel | null,
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
}

// ── Upload PDF and parse ──────────────────────────────────────────────────────
//
// Non-blocking model:
//   1. The action saves the PDF + marks profiles.resume_parsing_at = now()
//      and returns within ~2s.
//   2. The Gemini parse + DNA + signature + snapshot + score + embedding all
//      run inside next/server `after()`.
//   3. The client polls `getParseStatus()` every few seconds. When parsing_at
//      clears, parsing is done — either resume_parsed is populated (success)
//      or resume_parse_error is set (failure).
//
// Why: parseResumePdf takes 15–45s on a cold-start. Holding the response open
// that long triggers browser/proxy timeouts ("unexpected response from
// server"). Returning fast eliminates the class of cold-start failures.

export type UploadResult =
  | { ok: true; processing: true; startedAt: string }
  | { ok: false; error: string; retryable?: boolean };

type PriorResumeProfile = {
  resume_storage_path: string | null;
  resume_parsed: unknown;
  product_dna_score: number | null;
  dna_breakdown: unknown | null;
  resume_signature: string | null;
  active_resume_version_id: string | null;
};

function friendlyParseError(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof LlmRunError) {
    switch (err.detail.kind) {
      case "rate_limited":
        return {
          message: "We're a bit busy right now. Please try again in about a minute.",
          retryable: true,
        };
      case "quota_disabled":
        return {
          message: "Resume processing is temporarily unavailable. Please try again later.",
          retryable: true,
        };
      case "auth":
        return {
          message: "Resume processing is temporarily unavailable. Please try again later.",
          retryable: false,
        };
      default:
        return {
          message: "We couldn't read your resume just now. Please try again.",
          retryable: true,
        };
    }
  }
  return {
    message: "We couldn't read your resume just now. Please try again.",
    retryable: true,
  };
}

export async function uploadAndParseResume(formData: FormData): Promise<UploadResult> {
  // Top-level safety net. Server actions in Next.js 15 turn any uncaught
  // throw into a 500 response with no application log — the user sees a
  // catastrophic "Previous resume is still active" banner even when the
  // failure was recoverable (storage hiccup, Supabase blip, body-size
  // overflow, etc.). Catch everything, log a structured detail line, and
  // return a graceful { ok: false } so the client can show a real reason.
  try {
    return await uploadAndParseResumeInner(formData);
  } catch (err) {
    const name = err instanceof Error ? err.name : "unknown";
    const message = err instanceof Error ? err.message : String(err);
    const firstStackLine = err instanceof Error
      ? (err.stack ?? "").split("\n").slice(1, 4).join(" | ").slice(0, 500)
      : null;
    console.error(`RUPLOAD_THROW [${name}] ${message.slice(0, 240)} || ${firstStackLine ?? ""}`);
    logEvent("error", "resume_upload_uncaught", {
      err_name:  name,
      err_msg:   message.slice(0, 240),
      err_stack: firstStackLine,
    });
    // Persist the full error to the profiles row so we can read it via the
    // admin API without fighting log-table truncation. resume_parse_error
    // already exists and is reset on every successful parse.
    try {
      const admin = createSupabaseAdminClient();
      const supabase = await createSupabaseServerClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tag = `[${name}] ${message.slice(0, 200)} || ${(firstStackLine ?? "").slice(0, 240)}`;
        await (admin.from("profiles") as any)
          .update({ resume_parse_error: tag })
          .eq("id", user.id);
      }
    } catch {
      // Best effort.
    }
    // Surface the actual TypeError name + first 200 chars to the UI so the
    // user (and we) can see what's happening instead of a black-box "try
    // again".
    return {
      ok: false,
      error: `Upload error [${name}]: ${message.slice(0, 200)}`,
      retryable: true,
    };
  }
}

async function uploadAndParseResumeInner(formData: FormData): Promise<UploadResult> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };
  const userId = user.id;

  const consents = await getUserConsents(userId);
  if (!consents.matching) {
    return { ok: false, error: "Enable AI Matching consent in Settings → Privacy to use this feature." };
  }

  const file = formData.get("resume") as File | null;
  if (!file || file.type !== "application/pdf") {
    return { ok: false, error: "Please upload a PDF file." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "File too large — max 5 MB." };
  }
  if (file.size < 4 * 1024) {
    return { ok: false, error: "PDF is too small to be a real resume — re-export and try again." };
  }

  const activeParseJob = await findActiveJob(admin, { userId, type: "resume_parse" });
  if (activeParseJob) {
    return { ok: false, error: "Resume parsing is already in progress. Please wait for it to finish." };
  }

  const recentUploadCount = await countRecentJobs(admin, {
    userId,
    type: "resume_parse",
    sinceIso: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  });
  if (recentUploadCount >= 6) {
    return { ok: false, error: "Resume upload limit reached. Please try again in about an hour.", retryable: true };
  }

  // Security fix (S-1): use the Postgres-backed shared rate-limit so the
  // 3-per-15-min cap holds across all serverless instances.
  const uploadLimit = await checkRateLimitShared({
    key: userActionKey(userId, "resume-upload"),
    limit: 3,
    windowMs: 15 * 60 * 1000,
  });
  if (!uploadLimit.ok) {
    return {
      ok: false,
      error: `Too many resume uploads. Please try again in ${Math.ceil(uploadLimit.retryAfterSeconds / 60)} minute(s).`,
      retryable: true,
    };
  }

  const resumeVersionId = crypto.randomUUID();
  const jobId = crypto.randomUUID();
  const path = `${userId}/${resumeVersionId}.pdf`;
  const uploadBuffer = Buffer.from(await file.arrayBuffer());
  const bytes = uploadBuffer.buffer.slice(
    uploadBuffer.byteOffset,
    uploadBuffer.byteOffset + uploadBuffer.byteLength,
  );
  const validation = validateResumePdf(bytes, file.type);
  if (!validation.ok) {
    logEvent("warn", "resume_pdf_rejected", {
      user_id: userId.slice(0, 8),
      code: validation.code,
      size_bytes: file.size,
    });
    return { ok: false, error: validation.message, retryable: true };
  }
  // QA fix (B5): regex-based page count above can be defeated; cross-check
  // with the PDF library before we trust the file. A null return means the
  // PDF can't be opened at all — reject it on principle (parser would fail
  // downstream anyway, but we want a clean user-facing error here).
  const authoritativePageCount = await verifyPdfPageCount(bytes.slice(0));
  if (authoritativePageCount === null) {
    logEvent("warn", "resume_pdf_rejected", {
      user_id: userId.slice(0, 8),
      code: "unreadable_pdf",
      size_bytes: file.size,
    });
    return {
      ok: false,
      error: "We could not read this PDF. Export a fresh text-based PDF and try again.",
      retryable: true,
    };
  }
  if (authoritativePageCount > 12) {
    logEvent("warn", "resume_pdf_rejected", {
      user_id: userId.slice(0, 8),
      code: "too_many_pages_authoritative",
      size_bytes: file.size,
    });
    return {
      ok: false,
      error: "Resume PDFs must be 12 pages or fewer. Upload a shorter resume.",
      retryable: true,
    };
  }
  const pdfHash = createHash("sha256").update(uploadBuffer).digest("hex");
  const { error: storageError } = await admin.storage
    .from("resumes")
    .upload(path, uploadBuffer, { contentType: "application/pdf", upsert: false });
  if (storageError) {
    logEvent("warn", "resume_upload_storage_failed", {
      user_id: userId.slice(0, 8),
      code: storageError.name ?? "storage_error",
    });
    return { ok: false, error: "Could not save your resume securely. Please retry.", retryable: true };
  }

  const startedAt = new Date().toISOString();
  let priorProfile: PriorResumeProfile | null = null;

  try {
    const { data, error } = await (admin
      .from("profiles")
      .select("resume_storage_path, resume_parsed, product_dna_score, dna_breakdown, resume_signature, active_resume_version_id")
      .eq("id", userId)
      .maybeSingle() as any) as { data: PriorResumeProfile | null; error: { message: string } | null };
    assertNoSupabaseError(error, "Could not read existing resume profile");
    priorProfile = data;

    await supersedeActiveJobs(admin, {
      userId,
      type: "match_compute",
      errorMessage: "A newer resume upload superseded this match computation.",
    });

    await createDurableJob(admin, {
      id: jobId,
      userId,
      type: "resume_parse",
      resumeVersionId,
      source: "resume_upload",
      idempotencyKey: `resume_parse:${userId}:${pdfHash}`,
      payload: { storage_path: path, page_count: validation.pageCount },
    });

    const { error: queueError } = await (admin.from("profiles") as any).upsert({
      id: userId,
      pending_resume_version_id: resumeVersionId,
      resume_parsing_at: startedAt,
      resume_parse_error: null,
    });
    assertNoSupabaseError(queueError, "Could not mark resume parsing as queued");
  } catch (err) {
    // CRITICAL: this catch was silent. The original error never reached
    // logs, so all the user saw was "Could not start resume processing"
    // with no way to know whether the DB rejected an INSERT, the schema
    // drifted, or RLS blocked the write. Mirror the top-level
    // RUPLOAD_THROW emission here so the next failure tells us exactly
    // which line in the DB-write chain threw.
    const name = err instanceof Error ? err.name : "unknown";
    const message = err instanceof Error ? err.message : String(err);
    const firstStackLine = err instanceof Error
      ? (err.stack ?? "").split("\n").slice(1, 3).join(" | ").slice(0, 400)
      : null;
    console.error(`RUPLOAD_QUEUE_FAIL [${name}] ${message.slice(0, 240)} || ${firstStackLine ?? ""}`);
    logEvent("error", "resume_upload_queue_failed", {
      user_id:   userId.slice(0, 8),
      err_name:  name,
      err_msg:   message.slice(0, 240),
      err_stack: firstStackLine,
    });
    try {
      await removeUploadedResume(admin, path);
    } catch {
      // Best effort cleanup; the user should see the original queue failure.
    }
    try {
      await failDurableJob(admin, jobId, "queue_failed", err instanceof Error ? err.message : "Could not queue resume parsing.");
    } catch {
      // The job row may not exist yet.
    }
    return {
      ok: false,
      error: `Could not start resume processing. Detail: ${message.slice(0, 120)}. Please retry.`,
      retryable: true,
    };
  }

  // Note: revalidatePath("/profile") used to live here, but it forced a
  // post-response RSC re-render that was throwing a #418-shape error
  // ("could not refresh your profile after starting the new parse")
  // even though the DB writes above succeeded. The page reads fresh data
  // from the DB on every load AND the client calls router.refresh() after
  // a successful action, so the cache stays correct without it. We still
  // revalidate from inside after() once the parse lands so other surfaces
  // (/matches, /dashboard, /coach, /insights) see the new state.

  // Encode bytes once on the request thread — buffers don't survive into
  // after() reliably across edge/node boundaries.
  const base64 = uploadBuffer.toString("base64");

  after(async () => {
    await transitionDurableJob(admin, jobId, "running", { incrementAttempts: true });

    async function failProcessing(errorCode: string, message: string): Promise<void> {
      try {
        await removeUploadedResume(admin, path);
      } catch (cleanupErr) {
        logEvent("warn", "resume_parse_cleanup_failed", {
          user_id: userId.slice(0, 8),
          resume_version_id: resumeVersionId,
          error: cleanupErr instanceof Error ? cleanupErr.name : "unknown",
        });
      }
      const { error } = await (admin.from("profiles") as any).update({
        resume_parsing_at: null,
        resume_parse_error: message,
        pending_resume_version_id: null,
      })
        .eq("id", userId)
        .eq("pending_resume_version_id", resumeVersionId);
      const durableMessage = error
        ? `${message} Support detail: profile failure state could not be saved.`
        : message;
      if (error) {
        logEvent("warn", "resume_parse_failure_state_write_failed", {
          user_id: userId.slice(0, 8),
          resume_version_id: resumeVersionId,
        });
      }
      await failDurableJob(admin, jobId, errorCode, durableMessage);
    }

    let parsed: ParsedResume;
    try {
      parsed = await parseResumePdf(base64);
    } catch (err) {
      const { message } = friendlyParseError(err);
      logEvent("warn", "resume_parse_failed", {
        user_id: userId.slice(0, 8),
        resume_version_id: resumeVersionId,
        error: err instanceof LlmRunError ? err.detail.kind : "parse_error",
      });
      await failProcessing("parse_failed", message);
      return;
    }

    try {
      const { data: currentProfile, error: currentError } = await (admin
        .from("profiles")
        .select("pending_resume_version_id")
        .eq("id", userId)
        .maybeSingle() as any) as { data: { pending_resume_version_id: string | null } | null; error: { message: string } | null };
      assertNoSupabaseError(currentError, "Could not verify pending resume version");
      if (currentProfile?.pending_resume_version_id !== resumeVersionId) {
        await removeUploadedResume(admin, path);
        await transitionDurableJob(admin, jobId, "superseded", {
          errorCode: "superseded",
          errorMessage: "A newer resume upload superseded this parse.",
        });
        return;
      }

      const dnaBreakdown = computeDnaBreakdown(parsed);
      const resumeSignature = computeResumeSignature(parsed);
      const resumeEmbedding = await embed(buildResumeEmbedText(parsed), "resume_embedding");
      if (resumeEmbedding.length === 0) {
        throw new Error("Resume embedding returned no vector.");
      }

      let resumeScorePatch: Record<string, unknown> = {};
      try {
        const top30 = await fetchTop30Demand(admin);
        const score = computeResumeScore({
          resume: parsed,
          top30Demand: top30,
          userTargets: parsed.target_role_functions ?? [],
        });
        resumeScorePatch = {
          resume_score: score.score,
          resume_score_breakdown: score.breakdown as unknown as Json,
          resume_tips: score.tips as unknown as Json,
          resume_score_at: new Date().toISOString(),
        };
      } catch (err) {
        logEvent("warn", "resume_score_post_upload_failed", {
          user_id: userId.slice(0, 8),
          resume_version_id: resumeVersionId,
          error: err instanceof Error ? err.name : "unknown",
        });
      }

      if (priorProfile?.resume_parsed) {
        await snapshotCurrentResume(admin, {
          userId,
          resume_parsed: priorProfile.resume_parsed,
          resume_storage_path: priorProfile.resume_storage_path,
          product_dna_score: priorProfile.product_dna_score,
          dna_breakdown: priorProfile.dna_breakdown,
          resume_signature: priorProfile.resume_signature,
          source: "overwrite",
        });
      }

      const promotedAt = new Date().toISOString();
      const promoteQuery = (admin.from("profiles") as any).update({
        resume_storage_path: path,
        resume_parsed: parsed as unknown as Json,
        resume_parsed_version_id: resumeVersionId,
        active_resume_version_id: resumeVersionId,
        pending_resume_version_id: null,
        display_name: parsed.name || undefined,
        current_role: parsed.current_role || null,
        role_function: parsed.role_function || null,
        target_role_functions: parsed.target_role_functions ?? [],
        years_experience: Math.round(parsed.total_years_experience) || null,
        current_lpa: parsed.estimated_current_lpa ?? null,
        tech_stack: parsed.tech_stack ?? [],
        preferred_hubs: (parsed.preferred_hubs ?? []).filter((h: string) => INDIA_HUBS.includes(h)),
        product_dna_score: dnaBreakdown.total,
        dna_breakdown: dnaBreakdown as unknown as Json,
        resume_signature: resumeSignature,
        resume_parsing_at: null,
        resume_parse_error: null,
        resume_embedding: resumeEmbedding,
        resume_embedding_at: promotedAt,
        resume_embedding_version_id: resumeVersionId,
        ...resumeScorePatch,
      })
        .eq("id", userId)
        .eq("pending_resume_version_id", resumeVersionId)
        .select("id")
        .maybeSingle();
      const promoteResult = await promoteQuery as { data: { id: string } | null; error: { message: string } | null };
      const { data: promoted, error: promoteError } = promoteResult;
      assertNoSupabaseError(promoteError, "Could not promote parsed resume");
      if (!promoted) {
        await removeUploadedResume(admin, path);
        await transitionDurableJob(admin, jobId, "superseded", {
          errorCode: "superseded",
          errorMessage: "A newer resume upload superseded this parse.",
        });
        return;
      }

      if (priorProfile?.resume_storage_path && priorProfile.resume_storage_path !== path) {
        try {
          await removeUploadedResume(admin, priorProfile.resume_storage_path);
        } catch (cleanupErr) {
          logEvent("warn", "resume_old_file_cleanup_failed", {
            user_id: userId.slice(0, 8),
            resume_version_id: resumeVersionId,
            error: cleanupErr instanceof Error ? cleanupErr.name : "unknown",
          });
        }
      }

      await transitionDurableJob(admin, jobId, "succeeded");
      enqueueUserRecompute(userId, {
        forceFull: true,
        source: "resume_upload",
        resumeVersionId,
      });
    } catch (err) {
      logEvent("warn", "resume_parse_post_processing_failed", {
        user_id: userId.slice(0, 8),
        resume_version_id: resumeVersionId,
        error: err instanceof Error ? err.name : "unknown",
      });
      await failProcessing("post_processing_failed", "Resume processing failed after parsing. Please re-upload your PDF.");
      return;
    }

    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/matches");
    revalidatePath("/coach");
    revalidatePath("/insights");
  });

  return { ok: true, processing: true, startedAt };
}

// ── Parse-status polling ──────────────────────────────────────────────────────
// Called by the client every few seconds after a non-blocking upload. The
// transition the client watches for: `state` flips from "parsing" to "done"
// (or "failed"). On "done", the client triggers router.refresh() so the page
// re-renders with the populated profile.

export type ParseStatus =
  | { state: "idle" }
  | { state: "parsing"; startedAt: string }
  | { state: "done"; dnaScore: number; role: string; years: number; techCount: number }
  | { state: "failed"; error: string };

export async function getParseStatus(): Promise<ParseStatus> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { state: "idle" };

  const { data } = await supabase
    .from("profiles")
    .select(
      "resume_parsing_at, resume_parse_error, resume_parsed, current_role, years_experience, product_dna_score, tech_stack, pending_resume_version_id, active_resume_version_id, resume_parsed_version_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return { state: "idle" };

  type ProfileRow = {
    resume_parsing_at:  string | null;
    resume_parse_error: string | null;
    resume_parsed:      unknown;
    current_role:       string | null;
    years_experience:   number | null;
    product_dna_score:  number | null;
    tech_stack:         string[] | null;
    pending_resume_version_id: string | null;
    active_resume_version_id: string | null;
    resume_parsed_version_id: string | null;
  };
  const row = data as unknown as ProfileRow;

  if (row.resume_parsing_at) {
    const startedMs = new Date(row.resume_parsing_at).getTime();
    const isStale = Number.isFinite(startedMs) && (Date.now() - startedMs) > 10 * 60 * 1000;
    if (isStale) {
      const timeoutError = "Resume parsing timed out. Please re-upload your PDF.";
      // Clear stale "in progress" state so the UI can recover instead of
      // being pinned to an endless spinner when background execution dies.
      const admin = createSupabaseAdminClient();

      const { error } = await (admin.from("profiles") as any).update({
        resume_parsing_at: null,
        resume_parse_error: timeoutError,
        pending_resume_version_id: null,
      }).eq("id", user.id);
      assertNoSupabaseError(error, "Could not clear stale resume parsing state");
      const activeParse = await findActiveJob(admin, { userId: user.id, type: "resume_parse" });
      if (activeParse) {
        await failDurableJob(admin, activeParse.id, "timeout", timeoutError);
      }
      return { state: "failed", error: timeoutError };
    }
    return { state: "parsing", startedAt: row.resume_parsing_at };
  }
  if (row.resume_parse_error) {
    return { state: "failed", error: row.resume_parse_error };
  }
  if (
    row.resume_parsed &&
    row.active_resume_version_id &&
    row.resume_parsed_version_id === row.active_resume_version_id &&
    !row.pending_resume_version_id
  ) {
    return {
      state: "done",
      dnaScore: row.product_dna_score ?? 0,
      role:     row.current_role ?? "",
      years:    row.years_experience ?? 0,
      techCount: (row.tech_stack ?? []).length,
    };
  }
  return { state: "idle" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2 Item 8 — list versions + revert action.
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RevertResult =
  | { ok: true; revertedAt: string }
  | { ok: false; error: string };

export async function revertResumeToVersion(versionId: string): Promise<RevertResult> {
  if (!UUID_RE.test(versionId)) return { ok: false, error: "Invalid version id." };

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // 1. Load the target snapshot (RLS scoped to user via select policy).

  const { data: snap, error: snapErr } = await (admin
    .from("resume_versions")
    .select("id, user_id, resume_parsed, resume_storage_path, product_dna_score, dna_breakdown, resume_signature")
    .eq("id", versionId)
    .eq("user_id", user.id)
    .maybeSingle() as any) as { data: {
      id: string;
      user_id: string;
      resume_parsed: ParsedResume;
      resume_storage_path: string | null;
      product_dna_score: number | null;
      dna_breakdown: unknown | null;
      resume_signature: string | null;
    } | null; error: { message: string } | null };
  if (snapErr)  return { ok: false, error: snapErr.message };
  if (!snap)    return { ok: false, error: "Snapshot not found." };

  // 2. Snapshot the CURRENT state before we overwrite it (so revert is undoable).

  const { data: current } = await (admin
    .from("profiles")
    .select("resume_parsed, resume_storage_path, product_dna_score, dna_breakdown, resume_signature")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: {
      resume_parsed: unknown;
      resume_storage_path: string | null;
      product_dna_score: number | null;
      dna_breakdown: unknown | null;
      resume_signature: string | null;
    } | null };

  if (current?.resume_parsed) {
    await snapshotCurrentResume(admin, {
      userId:              user.id,
      resume_parsed:       current.resume_parsed,
      resume_storage_path: current.resume_storage_path,
      product_dna_score:   current.product_dna_score,
      dna_breakdown:       current.dna_breakdown,
      resume_signature:    current.resume_signature,
      source:              "manual_revert",
    });
  }

  // 3. Restore. NB: resume_storage_path may point to a PDF that was already
  //    deleted in Sprint-2 Item-8 flows (we currently nuke prior PDFs on
  //    re-upload). We still restore the parsed JSON + score so matching
  //    works; the user can re-upload the PDF later if they want it back.
  const restored = snap.resume_parsed;

  const { error: updErr } = await (admin.from("profiles") as any).update({
    resume_parsed:         restored as unknown as Json,
    resume_storage_path:   snap.resume_storage_path,
    product_dna_score:     snap.product_dna_score,
    dna_breakdown:         snap.dna_breakdown as Json | null,
    resume_signature:      snap.resume_signature,
    // Mirror the convenience fields the parser otherwise sets directly.
    role_function:         restored.role_function ?? null,
    target_role_functions: restored.target_role_functions ?? [],
    years_experience:      Math.round(restored.total_years_experience ?? 0) || null,
    current_role:          restored.current_role ?? null,
    tech_stack:            restored.tech_stack ?? [],
    preferred_hubs:        (restored.preferred_hubs ?? []).filter((h: string) => INDIA_HUBS.includes(h)),
  }).eq("id", user.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");

  return { ok: true, revertedAt: new Date().toISOString() };
}

export type ResumeVersionLite = {
  id: string;
  product_dna_score: number | null;
  source: "overwrite" | "manual_revert";
  created_at: string;
  current_role: string | null;
  total_years_experience: number | null;
};

export async function listResumeVersions(): Promise<ResumeVersionLite[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];


  const { data } = await (supabase
    .from("resume_versions")
    .select("id, product_dna_score, source, created_at, resume_parsed")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10) as any) as { data: Array<{
      id: string;
      product_dna_score: number | null;
      source: "overwrite" | "manual_revert";
      created_at: string;
      resume_parsed: { current_role?: string | null; total_years_experience?: number | null } | null;
    }> | null };

  return (data ?? []).map((r) => ({
    id:                     r.id,
    product_dna_score:      r.product_dna_score,
    source:                 r.source,
    created_at:             r.created_at,
    current_role:           r.resume_parsed?.current_role ?? null,
    total_years_experience: r.resume_parsed?.total_years_experience ?? null,
  }));
}
