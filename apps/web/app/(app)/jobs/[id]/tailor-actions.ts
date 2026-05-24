"use server";

// JD-Tailored Resume — Phase R3 diff-review server actions.
//
// Builds on the same diagnose → rewrite → render pipeline as Capability A,
// but scopes everything to a specific (user, job) pair and threads the JD's
// must-haves through both prompts. Modes:
//   • polish  (default) — minimal, voice-preserving edits.
//   • tailor  — aggressive JD-aligned rewrites with risk flags visible.
//
// Cache contract: tailored_resumes is unique on (user_id, job_id). When a
// new diagnosis is requested for the same pair:
//   - if a 'finalised' row exists for the SAME (resume_signature, job_signature, mode) → return it
//   - if a 'pending_review' row exists for the same triplet → resume it
//   - otherwise discard and start fresh

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { LlmRunError } from "@/lib/llm/gemini";
import {
  diagnoseResume,
  type ResumeDiagnosis,
} from "@/lib/llm/prompts/resume-diagnose";
import {
  rewriteBullets,
  chunkBullets,
  heuristicallyFlagRewrite,
  type BulletRewrite,
  type RewriteRequest,
  type RewriteMode,
  type RewriteRiskFlag,
} from "@/lib/llm/prompts/bullet-rewrite";
import {
  extractResumeContent,
  renderExtractedAsText,
  type ExtractedResumeContent,
} from "@/lib/llm/prompts/extract-resume-content";
import { computeAtsScorecard, type AtsScorecard } from "@/lib/matching/ats-scorecard";
import {
  buildEvidenceBackedTailoredContent,
  type TailoredEnhancementDecision,
} from "@/lib/resume-intel/tailored-content";
import { getQuotaState, resetsInHumanForm } from "@/lib/resume-intel/quota";
import { recordResumeIntelEvent } from "@/lib/resume-intel/telemetry";
import { renderTailoredResumeDocx } from "@/lib/docx/tailored-resume";
import { renderTailoredResumePdf } from "@/lib/pdf/tailored-resume";
import { logEvent } from "@/lib/observability/log";
import { checkRateLimit, checkRateLimitShared, userActionKey } from "@/lib/security/rate-limit";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { Json } from "@/lib/supabase/types";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

export type EnhancementDecision = TailoredEnhancementDecision;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_BUCKET = "tailored-resumes";
const SIGNED_URL_TTL = 600;

// Synthesise an ATS-shaped text payload from the parsed JSON. Used by the
// diagnosis prompt to quote verbatim — the profiles table has no raw
// resume_text column so we reconstruct it from what the parser already
// captured.
function synthesiseResumeText(parsed: ParsedResume): string {
  const parts: string[] = [];
  if (parsed.name) parts.push(parsed.name);
  if (parsed.current_role) parts.push(parsed.current_role);
  if (parsed.summary) parts.push("\nSummary\n" + parsed.summary);
  const stack = parsed.tech_stack ?? [];
  if (stack.length > 0) parts.push("\nSkills\n" + stack.join(", "));
  const companies = parsed.companies ?? [];
  if (companies.length > 0) {
    parts.push("\nExperience");
    for (const c of companies) {
      const dur = c.years > 0 ? ` (${c.years}+ yrs)` : "";
      parts.push(`${c.role || "Engineer"} — ${c.name}${dur}`);
      if (c.role) parts.push(`• ${c.role}`);
    }
  }
  const products = parsed.products_built ?? [];
  if (products.length > 0) {
    parts.push("\nProjects");
    for (const p of products) parts.push(`• ${p}`);
  }
  const edu = parsed.education ?? [];
  if (edu.length > 0) {
    parts.push("\nEducation");
    for (const e of edu) {
      const y = e.year ? `, ${e.year}` : "";
      parts.push(`${e.degree} — ${e.institution}${y}`);
    }
  }
  return parts.join("\n");
}

function friendlyLlmError(err: unknown): string {
  if (err instanceof LlmRunError) {
    switch (err.detail.kind) {
      case "rate_limited":   return "We're busy right now. Please try again in about a minute.";
      case "quota_disabled": return "AI services temporarily unavailable. Please try again later.";
      case "auth":           return "AI services temporarily unavailable. Please try again later.";
      default:               return "Couldn't generate this just now. Please retry.";
    }
  }
  return "Something went wrong. Please retry.";
}

async function extractStoredResumeContent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  storagePath: string | null,
  userId: string,
  jobId: string,
): Promise<ExtractedResumeContent | null> {
  if (!storagePath) return null;
  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from("resumes")
      .download(storagePath);
    if (dlErr || !blob) return null;
    const bytes = Buffer.from(await blob.arrayBuffer());
    return await extractResumeContent(bytes.toString("base64"));
  } catch (err) {
    logEvent("warn", "tailor_bullet_extraction_failed", {
      user_id: userId.slice(0, 8),
      job_id: jobId,
      error: err instanceof Error ? err.name : "unknown",
    });
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preflight
// ─────────────────────────────────────────────────────────────────────────────

async function preflight(jobId: string) {
  if (!UUID_RE.test(jobId)) {
    return { ok: false as const, error: "Invalid job id." };
  }
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  if (!consents.resume_intelligence) {
    return { ok: false as const, error: "Enable 'Resume Intelligence' in Settings → Privacy to tailor resumes with review." };
  }
  if (!consents.matching) {
    return { ok: false as const, error: "Enable AI Matching consent to use the Apply Toolkit." };
  }


  const { data: profileRow } = await (supabase
    .from("profiles")
    .select("display_name, role_function, resume_parsed, resume_signature, resume_storage_path, tech_stack, preferred_hubs")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: {
        display_name: string | null;
        role_function: string | null;
        resume_parsed: ParsedResume | null;
        resume_signature: string | null;
        resume_storage_path: string | null;
        tech_stack: string[] | null;
        preferred_hubs: string[] | null;
      } | null;
    };

  if (!profileRow?.resume_parsed || !profileRow.resume_signature) {
    return { ok: false as const, error: "Upload your resume first." };
  }

  // The profiles table has no raw resume_text column — synthesise an
  // ATS-shaped text payload from the parsed JSON so the diagnosis prompt
  // can still quote verbatim. Same content the parser already extracted.
  const profile = {
    ...profileRow,
    resume_text: synthesiseResumeText(profileRow.resume_parsed),
  };

  const admin = createSupabaseAdminClient();

  const { data: job } = await (admin
    .from("jobs")
    .select("id, title, jd_summary, must_have_skills, nice_to_have_skills, role_function, seniority, signature, companies(name)")
    .eq("id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string;
        title: string;
        jd_summary: string | null;
        must_have_skills: string[] | null;
        nice_to_have_skills: string[] | null;
        role_function: string | null;
        seniority: string | null;
        signature: string | null;
        companies: { name: string } | null;
      } | null;
    };
  if (!job) return { ok: false as const, error: "Job not found." };

  return { ok: true as const, user, supabase, admin, profile, job };
}

// ─────────────────────────────────────────────────────────────────────────────
// diagnose
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnoseTailoredResult =
  | { ok: true; id: string; resumed: boolean }
  | { ok: false; error: string };

export async function diagnoseTailored(
  jobId: string,
  mode: RewriteMode = "polish",
): Promise<DiagnoseTailoredResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin, profile, job } = pre;

  // (1) Look for an existing row for this (user, job).

  const { data: existing } = await (admin
    .from("tailored_resumes")
    .select("id, status, mode, resume_signature, job_signature, diagnosis, rewrites")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string;
        status: "pending_review" | "finalised" | "discarded";
        mode: "polish" | "tailor" | null;
        resume_signature: string | null;
        job_signature: string | null;
        diagnosis: ResumeDiagnosis | null;
        rewrites: Record<string, BulletRewrite> | null;
      } | null;
    };

  const fingerprintMatches =
    !!existing &&
    existing.resume_signature === profile.resume_signature &&
    existing.job_signature === job.signature &&
    existing.mode === mode;

  if (
    existing &&
    fingerprintMatches &&
    existing.status === "pending_review" &&
    existing.diagnosis
  ) {
    // Resume the pending review — no LLM cost.
    return { ok: true, id: existing.id, resumed: true };
  }

  const diagnoseLimit = checkRateLimit({
    key: userActionKey(user.id, "tailor-diagnose"),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!diagnoseLimit.ok) {
    return {
      ok: false,
      error: `Too many tailored diagnoses. Please try again in ${Math.ceil(diagnoseLimit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  // (2) Quota check (only the LLM-spending path).
  const quota = await getQuotaState(user.id, "tailored");
  if (quota.exhausted) {
    return {
      ok: false,
      error: `You've used your ${quota.limit} tailored-resume diagnoses for this 30-day window. Resets ${resetsInHumanForm(quota.resets_at)}.`,
    };
  }

  // (2.5) Extract REAL bullets from the source PDF. Same trick as the
  //       enhancement flow — profiles.resume_parsed only has titles, not
  //       the bullet content the rewriter needs to work with.
  const extracted = await extractStoredResumeContent(
    admin,
    profile.resume_storage_path,
    user.id,
    jobId,
  );

  const resumeTextForDiagnosis = extracted
    ? renderExtractedAsText(extracted)
    : profile.resume_text;

  // Thin resumes (titles without bullets) proceed — the diagnosis will
  // simply flag fewer weak bullets. For the auto-enhance flow we also
  // run a gap-fill step that generates plausible content for empty
  // sections; the per-bullet review flow doesn't, by design.

  // (3) Step 1 — diagnose with JD context, against the rich extracted text.
  let diagnosis: ResumeDiagnosis;
  try {
    const result = await diagnoseResume({
      resume:        profile.resume_parsed!,
      resume_text:   resumeTextForDiagnosis,
      role_function: profile.role_function ?? null,
      market_keywords: (job.must_have_skills ?? []).slice(0, 30),
      jd_context: {
        title:               job.title,
        must_have_skills:    job.must_have_skills ?? [],
        nice_to_have_skills: job.nice_to_have_skills ?? [],
        seniority:           job.seniority ?? null,
      },
    });
    diagnosis = result.diagnosis;
    void recordResumeIntelEvent({
      user_id: user.id, kind: "diagnosis", scope: "tailored",
      llm_tier: "heavy", latency_ms: result.latency_ms, ok: true,
    });
  } catch (err) {
    void recordResumeIntelEvent({
      user_id: user.id, kind: "diagnosis", scope: "tailored",
      llm_tier: "heavy", ok: false,
      error_kind: err instanceof LlmRunError ? err.detail.kind : "unknown",
    });
    return { ok: false, error: friendlyLlmError(err) };
  }

  // (4) Step 2 — rewrites with mode + JD must-haves threaded.
  const rewriteRequests: RewriteRequest[] = diagnosis.weak_bullets.map((b, idx) => ({
    index: idx,
    original: b.original,
    weakness: b.weakness,
  }));
  const chunks = chunkBullets(rewriteRequests, 8);
  const rewritesById: Record<number, BulletRewrite> = {};

  for (const chunk of chunks) {
    try {
      const res = await rewriteBullets({
        bullets:           chunk,
        role_function:     profile.role_function ?? null,
        mode,
        jd_must_haves:     job.must_have_skills ?? [],
        jd_nice_to_haves:  job.nice_to_have_skills ?? [],
        resume_tech_stack: profile.tech_stack ?? [],
      });
      for (const r of res.rewrites) {
        r.alternatives = r.alternatives.map((a) => ({
          ...a,
          risk_flag: heuristicallyFlagRewrite({
            original: r.original,
            alt: a,
            resume_tech_stack: profile.tech_stack ?? [],
          }) as RewriteRiskFlag,
        }));
        rewritesById[r.index] = r;
      }
      void recordResumeIntelEvent({
        user_id: user.id, kind: "rewrite_batch", scope: "tailored",
        llm_tier: "heavy", latency_ms: res.latency_ms, ok: true,
      });
    } catch (err) {
      void recordResumeIntelEvent({
        user_id: user.id, kind: "rewrite_batch", scope: "tailored",
        llm_tier: "heavy", ok: false,
        error_kind: err instanceof LlmRunError ? err.detail.kind : "unknown",
      });
    }
  }

  // (5) Persist — upsert on (user_id, job_id). Reset prior content/docx so
  //     the review screen always starts from the current diagnosis.
  const now = new Date().toISOString();

  const { data: row, error: upsertErr } = await (admin.from("tailored_resumes") as any)
    .upsert({
      user_id:          user.id,
      job_id:           jobId,
      content:          {} as unknown,  // legacy NOT NULL; set on finalise
      docx_storage_path: null,
      pdf_storage_path:  null,
      resume_signature: profile.resume_signature,
      job_signature:    job.signature,
      extracted_resume: extracted as unknown as Json,
      diagnosis,
      rewrites: rewritesById,
      decisions: {},
      mode,
      status: "pending_review",
      generated_at: now,
    }, { onConflict: "user_id,job_id" })
    .select("id")
    .single();

  if (upsertErr || !row) {
    return { ok: false, error: "Couldn't save the diagnosis. Please retry." };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/tailor`);
  return { ok: true, id: (row as { id: string }).id, resumed: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// decisions save
// ─────────────────────────────────────────────────────────────────────────────

export async function applyTailoredDecisions(
  jobId: string,
  decisions: Record<string, EnhancementDecision>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;


  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { id: string; status: string } | null };

  if (!row) return { ok: false, error: "No tailored resume in review for this job." };
  if (row.status !== "pending_review") {
    return { ok: false, error: "Already finalised. Re-run diagnosis to revise." };
  }


  const { error } = await (admin.from("tailored_resumes") as any)
    .update({ decisions, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (error) return { ok: false, error: "Couldn't save your changes. Please retry." };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// finalise (render docx)
// ─────────────────────────────────────────────────────────────────────────────

export type FinaliseTailoredResult =
  | { ok: true; docx_url: string; pdf_url: string; print_url: string }
  | { ok: false; error: string };

export type GenerateTailoredResumeDownloadResult =
  | {
      ok: true;
      docx_url: string;
      pdf_url: string;
      print_url: string;
      content: TailoredResumeContent;
      generated_at: string;
      cached: boolean;
    }
  | { ok: false; error: string };

type TailoredPreflight = Extract<Awaited<ReturnType<typeof preflight>>, { ok: true }>;

type TailoredRenderRow = {
  id: string;
  status: string;
  diagnosis: ResumeDiagnosis | null;
  rewrites: Record<string, BulletRewrite> | null;
  decisions: Record<string, EnhancementDecision> | null;
  extracted_resume: ExtractedResumeContent | null;
};

type TailoredArtifactRow = TailoredRenderRow & {
  content: TailoredResumeContent | null;
  docx_storage_path: string | null;
  pdf_storage_path: string | null;
  generated_at: string;
  mode: "polish" | "tailor" | null;
  resume_signature: string | null;
  job_signature: string | null;
};

function buildAutoDecisions(
  diagnosis: ResumeDiagnosis,
  rewrites: Record<string, BulletRewrite>,
): Record<string, EnhancementDecision> {
  const decisions: Record<string, EnhancementDecision> = {};
  diagnosis.weak_bullets.forEach((_, index) => {
    const rewrite = rewrites[String(index)];
    const safeIndex = rewrite?.alternatives.findIndex((alt) => !alt.risk_flag) ?? -1;
    decisions[String(index)] = safeIndex >= 0
      ? { choice: `alt-${safeIndex}` }
      : { choice: "kept" };
  });
  return decisions;
}

async function signTailoredArtifact(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  docxPath: string,
  pdfPath: string,
  jobId: string,
): Promise<FinaliseTailoredResult> {
  const [{ data: signedDocx, error: docxErr }, { data: signedPdf, error: pdfErr }] = await Promise.all([
    admin.storage.from(STORAGE_BUCKET).createSignedUrl(docxPath, SIGNED_URL_TTL),
    admin.storage.from(STORAGE_BUCKET).createSignedUrl(pdfPath, SIGNED_URL_TTL),
  ]);

  if (docxErr || pdfErr || !signedDocx?.signedUrl || !signedPdf?.signedUrl) {
    return { ok: false, error: "Couldn't create download links. Please retry." };
  }

  return {
    ok: true,
    docx_url: signedDocx.signedUrl,
    pdf_url: signedPdf.signedUrl,
    print_url: `/jobs/${jobId}/tailor/print`,
  };
}

async function renderAndStoreTailoredArtifact(
  pre: TailoredPreflight,
  row: TailoredRenderRow,
  decisions: Record<string, EnhancementDecision>,
): Promise<GenerateTailoredResumeDownloadResult> {
  const { user, admin, profile, job } = pre;

  if (!row.diagnosis) return { ok: false, error: "No tailored diagnosis found." };

  let stage: "extract" | "build_content" | "render" | "upload" | "persist" | "sign" = "extract";
  const uploadedPaths: string[] = [];

  try {
    stage = "extract";
    const extracted = row.extracted_resume ?? await extractStoredResumeContent(
      admin,
      profile.resume_storage_path,
      user.id,
      job.id,
    );

    stage = "build_content";
    const content = buildEvidenceBackedTailoredContent({
      resume: profile.resume_parsed!,
      extracted,
      diagnosis: row.diagnosis,
      rewrites: row.rewrites ?? {},
      decisions,
      displayName: profile.display_name || profile.resume_parsed!.name || "Candidate",
      preferredHubs: profile.preferred_hubs ?? [],
      jdTitle: job.title,
      jdMustHaves: job.must_have_skills ?? [],
      jdNiceToHaves: job.nice_to_have_skills ?? [],
    });

    content.tailoring_notes =
      `Generated directly for "${job.title}" using safe JD-backed edits only. Risky suggestions were left unchanged so the resume stays evidence-based.`;

    stage = "render";
    const [docxBuffer, pdfBuffer] = await Promise.all([
      renderTailoredResumeDocx(content),
      renderTailoredResumePdf(content),
    ]);
    const stamp = Date.now();
    const docxPath = `${user.id}/${job.id}-${stamp}.docx`;
    const pdfPath = `${user.id}/${job.id}-${stamp}.pdf`;

    stage = "upload";
    const [{ error: docxUploadErr }, { error: pdfUploadErr }] = await Promise.all([
      admin.storage.from(STORAGE_BUCKET).upload(docxPath, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: false,
      }),
      admin.storage.from(STORAGE_BUCKET).upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      }),
    ]);
    if (docxUploadErr || pdfUploadErr) {
      await Promise.allSettled([
        admin.storage.from(STORAGE_BUCKET).remove([docxPath]),
        admin.storage.from(STORAGE_BUCKET).remove([pdfPath]),
      ]);
      return { ok: false, error: "Couldn't store the tailored resume. Please retry." };
    }
    uploadedPaths.push(docxPath, pdfPath);

    const generatedAt = new Date().toISOString();
    stage = "persist";
    const { error: updateErr } = await (admin.from("tailored_resumes") as any)
      .update({
        content,
        docx_storage_path: docxPath,
        pdf_storage_path: pdfPath,
        decisions,
        status: "finalised",
        generated_at: generatedAt,
        updated_at: generatedAt,
      })
      .eq("user_id", user.id)
      .eq("job_id", job.id);

    if (updateErr) {
      await admin.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
      return { ok: false, error: "Couldn't save the tailored resume. Please retry." };
    }

    void recordResumeIntelEvent({
      user_id: user.id, kind: "render_docx", scope: "tailored",
      scope_ref_id: row.id, ok: true,
    });
    void recordResumeIntelEvent({
      user_id: user.id, kind: "render_pdf", scope: "tailored",
      scope_ref_id: row.id, ok: true,
    });
    void recordResumeIntelEvent({
      user_id: user.id, kind: "finalise", scope: "tailored",
      scope_ref_id: row.id, ok: true,
    });

    stage = "sign";
    const signed = await signTailoredArtifact(admin, docxPath, pdfPath, job.id);
    if (!signed.ok) return signed;

    revalidatePath(`/jobs/${job.id}`);
    revalidatePath(`/jobs/${job.id}/tailor`);

    return {
      ...signed,
      content,
      generated_at: generatedAt,
      cached: false,
    };
  } catch (err) {
    logEvent("error", "tailored_resume_direct_render_failed", {
      user_id: user.id.slice(0, 8),
      job_id: job.id,
      stage,
      error: err instanceof Error ? err.name : "unknown",
      message: err instanceof Error ? err.message.slice(0, 160) : undefined,
    });
    if (uploadedPaths.length > 0) {
      await admin.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
    }
    void recordResumeIntelEvent({
      user_id: user.id, kind: "finalise", scope: "tailored",
      scope_ref_id: row.id, ok: false,
      error_kind: err instanceof Error ? err.name : "unknown",
    });
    return { ok: false, error: "Couldn't generate the tailored resume file. Please retry." };
  }
}

export async function generateTailoredResumeDownload(
  jobId: string,
): Promise<GenerateTailoredResumeDownloadResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin, profile, job } = pre;

  const limit = await checkRateLimitShared({
    key: userActionKey(user.id, "tailor-direct-download"),
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.ok) {
    return {
      ok: false,
      error: `Too many tailored resume requests. Please try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  const selectColumns = `
    id, status, mode, resume_signature, job_signature,
    content, docx_storage_path, pdf_storage_path, generated_at,
    diagnosis, rewrites, decisions, extracted_resume
  `;

  const { data: existing } = await (admin
    .from("tailored_resumes")
    .select(selectColumns)
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: TailoredArtifactRow | null };

  const cacheMatches =
    existing?.status === "finalised" &&
    existing.mode === "tailor" &&
    existing.resume_signature === profile.resume_signature &&
    existing.job_signature === job.signature &&
    existing.content &&
    existing.docx_storage_path &&
    existing.pdf_storage_path;

  if (cacheMatches) {
    const signed = await signTailoredArtifact(admin, existing.docx_storage_path!, existing.pdf_storage_path!, jobId);
    if (!signed.ok) return signed;
    return {
      ...signed,
      content: existing.content!,
      generated_at: existing.generated_at,
      cached: true,
    };
  }

  const diagnosed = await diagnoseTailored(jobId, "tailor");
  if (!diagnosed.ok) return diagnosed;

  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("id, status, diagnosis, rewrites, decisions, extracted_resume")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: TailoredRenderRow | null };

  if (!row || !row.diagnosis) {
    return { ok: false, error: "Couldn't prepare the tailored resume. Please retry." };
  }

  const decisions = buildAutoDecisions(row.diagnosis, row.rewrites ?? {});
  return renderAndStoreTailoredArtifact(pre, row, decisions);
}

export async function finaliseTailored(jobId: string): Promise<FinaliseTailoredResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;


  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("id, status, diagnosis, rewrites, decisions, extracted_resume")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string;
        status: string;
        diagnosis: ResumeDiagnosis | null;
        rewrites: Record<string, BulletRewrite> | null;
        decisions: Record<string, EnhancementDecision> | null;
        extracted_resume: ExtractedResumeContent | null;
      } | null;
    };

  if (!row || !row.diagnosis) return { ok: false, error: "No tailored diagnosis found." };
  if (row.status !== "pending_review") return { ok: false, error: "Already finalised." };

  const generated = await renderAndStoreTailoredArtifact(pre, row, row.decisions ?? {});
  if (!generated.ok) return generated;
  return {
    ok: true,
    docx_url: generated.docx_url,
    pdf_url: generated.pdf_url,
    print_url: generated.print_url,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// discard
// ─────────────────────────────────────────────────────────────────────────────

export async function discardTailored(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;


  const { error } = await (admin.from("tailored_resumes") as any)
    .update({ status: "discarded", updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .eq("status", "pending_review");

  if (error) return { ok: false, error: "Couldn't discard. Please retry." };

  void recordResumeIntelEvent({
    user_id: user.id, kind: "discard", scope: "tailored", ok: true,
  });

  revalidatePath(`/jobs/${jobId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// signed download URL
// ─────────────────────────────────────────────────────────────────────────────

export async function getTailoredDownloadUrl(
  jobId: string,
  format: "docx" | "pdf" = "docx",
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;


  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("docx_storage_path, pdf_storage_path, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { docx_storage_path: string | null; pdf_storage_path: string | null; status: string } | null };

  const path = format === "pdf" ? row?.pdf_storage_path : row?.docx_storage_path;
  if (!row || !path || row.status !== "finalised") {
    return { ok: false, error: "Not ready." };
  }
  const { data } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL);
  if (!data?.signedUrl) return { ok: false, error: "Couldn't create download link." };
  return { ok: true, url: data.signedUrl };
}

export interface AtsBeforeAfter {
  before: AtsScorecard;
  after: AtsScorecard | null;
}

/**
 * Optional helper for the review screen — computes the ats_before scorecard
 * on demand. We don't persist it on tailored_resumes (keeps the row schema
 * minimal); the page calls this to render the side panel.
 */
export async function getTailoredAts(jobId: string): Promise<AtsBeforeAfter | null> {
  const pre = await preflight(jobId);
  if (!pre.ok) return null;
  const { profile } = pre;
  const before = computeAtsScorecard({
    resume:        profile.resume_parsed!,
    resume_text:   profile.resume_text!,
    role_function: profile.role_function ?? null,
  });
  return { before, after: null };
}
