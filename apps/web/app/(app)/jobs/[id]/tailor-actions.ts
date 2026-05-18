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
  hasUsableContent,
  type ExtractedResumeContent,
} from "@/lib/llm/prompts/extract-resume-content";
import { computeAtsScorecard, type AtsScorecard } from "@/lib/matching/ats-scorecard";
import { getQuotaState, resetsInHumanForm } from "@/lib/resume-intel/quota";
import { recordResumeIntelEvent } from "@/lib/resume-intel/telemetry";
import { renderTailoredResumeDocx } from "@/lib/docx/tailored-resume";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";
import type { EnhancementDecision } from "../../profile/enhance-actions";

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  let extracted: ExtractedResumeContent | null = null;
  if (profile.resume_storage_path) {
    try {
      const { data: blob, error: dlErr } = await admin.storage
        .from("resumes")
        .download(profile.resume_storage_path);
      if (!dlErr && blob) {
        const bytes = Buffer.from(await blob.arrayBuffer());
        const base64 = bytes.toString("base64");
        extracted = await extractResumeContent(base64);
      }
    } catch (err) {
      console.warn("[tailor] bullet-extraction failed, falling back to lean text:",
        err instanceof Error ? err.message : String(err));
    }
  }

  const resumeTextForDiagnosis = extracted
    ? renderExtractedAsText(extracted)
    : profile.resume_text;

  if (extracted && !hasUsableContent(extracted)) {
    return {
      ok: false,
      error: "Your resume is short on bullet content — most entries are just titles. Add 2-3 bullets per role describing what you did, then tailor again.",
    };
  }

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row, error: upsertErr } = await (admin.from("tailored_resumes") as any)
    .upsert({
      user_id:          user.id,
      job_id:           jobId,
      content:          {} as unknown,  // legacy NOT NULL; set on finalise
      docx_storage_path: null,
      pdf_storage_path:  null,
      resume_signature: profile.resume_signature,
      job_signature:    job.signature,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  | { ok: true; download_url: string; print_url: string }
  | { ok: false; error: string };

export async function finaliseTailored(jobId: string): Promise<FinaliseTailoredResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin, profile, job } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("id, status, diagnosis, rewrites, decisions")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string;
        status: string;
        diagnosis: ResumeDiagnosis | null;
        rewrites: Record<string, BulletRewrite> | null;
        decisions: Record<string, EnhancementDecision> | null;
      } | null;
    };

  if (!row || !row.diagnosis) return { ok: false, error: "No tailored diagnosis found." };
  if (row.status !== "pending_review") return { ok: false, error: "Already finalised." };

  const content = buildTailoredContent({
    resume:    profile.resume_parsed!,
    diagnosis: row.diagnosis,
    rewrites:  row.rewrites ?? {},
    decisions: row.decisions ?? {},
    displayName: profile.display_name ?? profile.resume_parsed!.name,
    preferredHubs: profile.preferred_hubs ?? [],
    jdTitle: job.title,
  });

  const docxBuffer = await renderTailoredResumeDocx(content);
  const storagePath = `${user.id}/${jobId}-${Date.now()}.docx`;

  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, docxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
  if (uploadErr) return { ok: false, error: `Storage error: ${uploadErr.message}` };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("tailored_resumes") as any)
    .update({
      content,
      docx_storage_path: storagePath,
      status: "finalised",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .eq("job_id", jobId);

  if (updateErr) return { ok: false, error: "Couldn't save the finalised resume." };

  void recordResumeIntelEvent({
    user_id: user.id, kind: "render_docx", scope: "tailored",
    scope_ref_id: row.id, ok: true,
  });
  void recordResumeIntelEvent({
    user_id: user.id, kind: "finalise", scope: "tailored",
    scope_ref_id: row.id, ok: true,
  });

  const { data: signed } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath(`/jobs/${jobId}/tailor`);

  return {
    ok: true,
    download_url: signed?.signedUrl ?? "",
    print_url:    `/jobs/${jobId}/tailor/print`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// discard
// ─────────────────────────────────────────────────────────────────────────────

export async function discardTailored(jobId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;
  const { user, admin } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("docx_storage_path, status")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { docx_storage_path: string | null; status: string } | null };

  if (!row || !row.docx_storage_path || row.status !== "finalised") {
    return { ok: false, error: "Not ready." };
  }
  const { data } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(row.docx_storage_path, SIGNED_URL_TTL);
  if (!data?.signedUrl) return { ok: false, error: "Couldn't create download link." };
  return { ok: true, url: data.signedUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers — mirrors enhance-actions buildEnhancedContent but JD-aware.
// ─────────────────────────────────────────────────────────────────────────────

function resolveBulletText(
  weak: ResumeDiagnosis["weak_bullets"][number],
  rewrite: BulletRewrite | undefined,
  decision: EnhancementDecision | undefined,
): string {
  if (!decision || decision.choice === "kept" || decision.choice === "skipped") return weak.original;
  if (decision.choice === "edited" && decision.text) return decision.text;
  const m = /^alt-(\d+)$/.exec(decision.choice);
  if (m && rewrite) {
    const idx = parseInt(m[1], 10);
    return rewrite.alternatives[idx]?.text ?? weak.original;
  }
  return weak.original;
}

interface BuildTailoredInput {
  resume: ParsedResume;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  displayName: string;
  preferredHubs: string[];
  jdTitle: string;
}

function buildTailoredContent(input: BuildTailoredInput): TailoredResumeContent {
  const { resume, diagnosis, rewrites, decisions, displayName, preferredHubs, jdTitle } = input;

  const weakByCompany = new Map<string, ResumeDiagnosis["weak_bullets"]>();
  for (const b of diagnosis.weak_bullets) {
    if (b.section === "experience" && b.company) {
      const arr = weakByCompany.get(b.company) ?? [];
      arr.push(b);
      weakByCompany.set(b.company, arr);
    }
  }

  const summaryWeak = diagnosis.weak_bullets.find((b) => b.section === "summary");
  let summary = resume.summary || "";
  if (summaryWeak) {
    const idx = diagnosis.weak_bullets.indexOf(summaryWeak);
    summary = resolveBulletText(summaryWeak, rewrites[idx], decisions[String(idx)]);
  }

  const skills = [{ group: "Skills", items: resume.tech_stack ?? [] }];

  const experience: TailoredResumeContent["experience"] = (resume.companies ?? []).map((c) => {
    const weakHere = weakByCompany.get(c.name) ?? [];
    const baseBullets: string[] = c.role ? [c.role] : [];
    const patched = baseBullets.map((b, bIdx) => {
      const match = weakHere.find((w) => w.bullet_index === bIdx);
      if (!match) return b;
      const idx = diagnosis.weak_bullets.indexOf(match);
      return resolveBulletText(match, rewrites[idx], decisions[String(idx)]);
    });
    const extras = weakHere
      .filter((w) => w.bullet_index >= patched.length)
      .map((w) => {
        const idx = diagnosis.weak_bullets.indexOf(w);
        return resolveBulletText(w, rewrites[idx], decisions[String(idx)]);
      });
    return {
      company:  c.name,
      role:     c.role || "",
      duration: c.years > 0 ? `${c.years}+ yrs` : "",
      bullets:  [...patched, ...extras].slice(0, 5),
    };
  });

  const projectsWeak = diagnosis.weak_bullets.filter((b) => b.section === "projects");
  const products = resume.products_built ?? [];
  const projects: TailoredResumeContent["projects"] = products.slice(0, 4).map((p, idx) => {
    const match = projectsWeak.find((w) => w.bullet_index === idx);
    const text = match
      ? resolveBulletText(match, rewrites[diagnosis.weak_bullets.indexOf(match)], decisions[String(diagnosis.weak_bullets.indexOf(match))])
      : p;
    return { name: text.split(":")[0]?.slice(0, 80) || `Project ${idx + 1}`, tech: [], summary: text };
  });

  const education: TailoredResumeContent["education"] = (resume.education ?? []).map((e) => ({
    institution: e.institution,
    degree:      e.degree,
    year:        e.year ?? null,
  }));

  // JD-aware title: prefer the candidate's own current_role but lean toward
  // the JD's role family for the header (no fact change — just framing).
  const headerTitle = resume.current_role || jdTitle || "Software Engineer";

  return {
    header: {
      name:         displayName,
      title:        headerTitle,
      location:     preferredHubs[0] || "India",
      contact_line: "",
    },
    summary,
    skills,
    experience,
    education,
    projects,
    tailoring_notes: `Tailored for "${jdTitle}" — every change reviewed and accepted by you.`,
  };
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
