"use server";

// Sprint 5 — Apply Toolkit server actions.
//
// Two LLM-powered generators (tailored resume, negotiation memo) plus
// helpers to mint signed-download URLs for the generated .docx files.
//
// Shared patterns:
//   - All actions require an authenticated user with `matching` consent.
//   - All actions are cache-aware: re-running on the same (user × job)
//     pair returns the existing row when resume_signature + job_signature
//     are unchanged, unless { force: true } is passed (the "Regenerate"
//     button).
//   - All actions return discriminated unions { ok: true, ... } | { ok:
//     false, error }. Friendly Gemini-failure messages mirror the
//     pre-existing pattern in profile/actions.ts.

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { LlmRunError } from "@/lib/llm/gemini";
import {
  generateTailoredResume, type TailoredResumeContent,
} from "@/lib/llm/prompts/tailor-resume";
import { renderTailoredResumeDocx } from "@/lib/docx/tailored-resume";
import {
  generateNegotiationMemo, type NegotiationMemoContent,
} from "@/lib/llm/prompts/negotiation-memo";
import {
  buildCompPercentileTable, lookupCompBracket, type CompBracket,
} from "@/lib/insights/comp-percentiles";
import { logEvent } from "@/lib/observability/log";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { Json } from "@/lib/supabase/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STORAGE_BUCKET = "tailored-resumes";
const SIGNED_URL_TTL_SECONDS = 600; // 10 min — enough for click + download

function friendlyLlmError(err: unknown): string {
  if (err instanceof LlmRunError) {
    switch (err.detail.kind) {
      case "rate_limited":      return "We're busy right now. Please try again in about a minute.";
      case "quota_disabled":    return "AI services temporarily unavailable. Please try again later.";
      case "auth":              return "AI services temporarily unavailable. Please try again later.";
      default:                  return "Couldn't generate this just now. Please retry.";
    }
  }
  return "Couldn't generate this just now. Please retry.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Common preflight — auth, consent, fetch profile + job + (optional) cached FC.
// ─────────────────────────────────────────────────────────────────────────────

async function preflight(jobId: string) {
  if (!UUID_RE.test(jobId)) {
    return { ok: false as const, error: "Invalid job id." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return {
      ok: false as const,
      error: "Enable AI Matching consent in Settings → Privacy to use the Apply Toolkit.",
    };
  }

  const admin = createSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("display_name, current_role, years_experience, current_lpa, target_lpa, preferred_hubs, resume_parsed, resume_signature, seniority")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: {
        display_name: string | null;
        current_role: string | null;
        years_experience: number | null;
        current_lpa: number | null;
        target_lpa: number | null;
        preferred_hubs: string[] | null;
        resume_parsed: ParsedResume | null;
        resume_signature: string | null;
        seniority: string | null;
      } | null;
    };

  if (!profile?.resume_parsed) {
    return { ok: false as const, error: "Upload your resume first." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase
    .from("jobs")
    .select("id, title, location, role_function, seniority, jd_summary, must_have_skills, nice_to_have_skills, responsibilities, signature, comp_lpa_min, comp_lpa_max, companies(name)")
    .eq("id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string; title: string; location: string | null;
        role_function: string | null; seniority: string | null;
        jd_summary: string | null;
        must_have_skills: string[] | null;
        nice_to_have_skills: string[] | null;
        responsibilities: string[] | null;
        signature: string | null;
        comp_lpa_min: number | null;
        comp_lpa_max: number | null;
        companies: { name: string } | null;
      } | null;
    };

  if (!job) return { ok: false as const, error: "Job not found." };

  return {
    ok: true as const,
    user, admin, supabase, profile, job,
    candidateEmail: user.email ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 34a — Resume tailoring
// ─────────────────────────────────────────────────────────────────────────────

export type TailorResult =
  | { ok: true; cached: boolean; download_url: string; content: TailoredResumeContent; generated_at: string }
  | { ok: false; error: string };

export async function generateTailoredResumeAction(
  jobId: string,
  opts: { force?: boolean } = {},
): Promise<TailorResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;

  const { user, admin, profile, job, candidateEmail } = pre;

  // ── Cache check ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin
    .from("tailored_resumes")
    .select("id, content, docx_storage_path, resume_signature, job_signature, generated_at")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string; content: TailoredResumeContent;
        docx_storage_path: string | null;
        resume_signature: string | null;
        job_signature: string | null;
        generated_at: string;
      } | null;
    };

  const isFreshCache =
    !!existing &&
    existing.resume_signature === profile.resume_signature &&
    existing.job_signature === job.signature &&
    existing.docx_storage_path;

  if (!opts.force && isFreshCache && existing) {
    const { data: signed } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(existing.docx_storage_path!, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      return {
        ok: true,
        cached: true,
        download_url: signed.signedUrl,
        content: existing.content,
        generated_at: existing.generated_at,
      };
    }
    // Storage object was nuked but the row survived — fall through to
    // regenerate the .docx from the cached content (no LLM cost).
  }

  // ── LLM step (skipped on storage-only refresh) ─────────────────────────
  let content: TailoredResumeContent;
  if (!opts.force && isFreshCache && existing) {
    content = existing.content;
  } else {
    const tailorLimit = checkRateLimit({
      key: userActionKey(user.id, "toolkit-tailor"),
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!tailorLimit.ok) {
      return {
        ok: false,
        error: `Too many tailored resume generations. Please try again in ${Math.ceil(tailorLimit.retryAfterSeconds / 60)} minute(s).`,
      };
    }

    // Pull the fit-card row to surface pre-approved tweaks into the prompt.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: match } = await (admin
      .from("matches")
      .select("fit_card")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .maybeSingle() as any) as { data: { fit_card: { resume_tweaks?: Array<{ priority: number; suggestion: string; why: string }> } | null } | null };

    try {
      content = await generateTailoredResume({
        resume: profile.resume_parsed!,
        job: {
          title:         job.title,
          company:       job.companies?.name ?? "the company",
          role_function: job.role_function,
          seniority:     job.seniority,
          location:      job.location ?? "Remote-India",
        },
        jd: {
          summary:             job.jd_summary ?? "",
          must_have_skills:    job.must_have_skills ?? [],
          nice_to_have_skills: job.nice_to_have_skills ?? [],
          responsibilities:    job.responsibilities ?? [],
        },
        resume_tweaks: match?.fit_card?.resume_tweaks,
        candidate_email: candidateEmail,
      });
    } catch (err) {
      logEvent("warn", "toolkit_tailor_llm_failed", {
        user_id: user.id.slice(0, 8),
        job_id: jobId,
        error: err instanceof Error ? err.name : "unknown",
      });
      return { ok: false, error: friendlyLlmError(err) };
    }
  }

  // ── DOCX render + upload ───────────────────────────────────────────────
  const docxBuf = await renderTailoredResumeDocx(content);
  const storagePath = `${user.id}/${jobId}-${Date.now()}.docx`;
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, docxBuf, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: false,
    });
  if (uploadErr) {
    return { ok: false, error: `Storage error: ${uploadErr.message}` };
  }

  // ── Persist row (and clean up the prior .docx if there was one) ────────
  if (existing?.docx_storage_path && existing.docx_storage_path !== storagePath) {
    await admin.storage.from(STORAGE_BUCKET).remove([existing.docx_storage_path]).catch(() => {});
  }
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("tailored_resumes") as any).upsert({
    user_id:           user.id,
    job_id:            jobId,
    content:           content as unknown as Json,
    docx_storage_path: storagePath,
    resume_signature:  profile.resume_signature,
    job_signature:     job.signature,
    generated_at:      nowIso,
  }, { onConflict: "user_id,job_id" });

  // Mint a signed URL right after upload — admin client can sign for any
  // object in the bucket; the URL is valid for SIGNED_URL_TTL_SECONDS.
  const { data: signed } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  revalidatePath(`/jobs/${jobId}`);

  return {
    ok: true,
    cached: false,
    download_url: signed?.signedUrl ?? "",
    content,
    generated_at: nowIso,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature 34c — Negotiation memo
// ─────────────────────────────────────────────────────────────────────────────

export type MemoResult =
  | { ok: true; cached: boolean; content: NegotiationMemoContent; market_comp: CompBracket | null; generated_at: string }
  | { ok: false; error: string };

export async function generateNegotiationMemoAction(
  jobId: string,
  opts: { force?: boolean } = {},
): Promise<MemoResult> {
  const pre = await preflight(jobId);
  if (!pre.ok) return pre;

  const { user, admin, profile, job } = pre;

  // ── Cache check ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin
    .from("negotiation_memos")
    .select("id, content, market_comp, resume_signature, job_signature, candidate_target_lpa, candidate_current_lpa, generated_at")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as {
      data: {
        id: string;
        content: NegotiationMemoContent;
        market_comp: CompBracket | null;
        resume_signature: string | null;
        job_signature: string | null;
        candidate_target_lpa: number | null;
        candidate_current_lpa: number | null;
        generated_at: string;
      } | null;
    };

  // Cache busts when profile.target_lpa / current_lpa change too — a memo
  // is highly sensitive to those numbers.
  const isFreshCache =
    !!existing &&
    existing.resume_signature === profile.resume_signature &&
    existing.job_signature === job.signature &&
    existing.candidate_target_lpa === profile.target_lpa &&
    existing.candidate_current_lpa === profile.current_lpa;

  if (!opts.force && isFreshCache && existing) {
    return {
      ok: true,
      cached: true,
      content: existing.content,
      market_comp: existing.market_comp,
      generated_at: existing.generated_at,
    };
  }

  const memoLimit = checkRateLimit({
    key: userActionKey(user.id, "toolkit-memo"),
    limit: 8,
    windowMs: 60 * 60 * 1000,
  });
  if (!memoLimit.ok) {
    return {
      ok: false,
      error: `Too many negotiation memo generations. Please try again in ${Math.ceil(memoLimit.retryAfterSeconds / 60)} minute(s).`,
    };
  }

  // ── Build comp bracket from live catalog (same path as engine) ────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: catalogJobs } = await (admin
    .from("jobs")
    .select("seniority, role_function, comp_lpa_min, comp_lpa_max")
    .eq("is_active", true) as any) as { data: Array<{ seniority: string | null; role_function: string | null; comp_lpa_min: number | null; comp_lpa_max: number | null }> | null };
  const compTable = buildCompPercentileTable(catalogJobs ?? []);
  const marketComp = lookupCompBracket(compTable, job.seniority, job.role_function);

  // ── LLM ────────────────────────────────────────────────────────────────
  let content: NegotiationMemoContent;
  try {
    content = await generateNegotiationMemo({
      resume:           profile.resume_parsed!,
      candidate_name:   profile.display_name ?? profile.resume_parsed!.name ?? "Candidate",
      current_lpa:      profile.current_lpa,
      target_lpa:       profile.target_lpa,
      years_experience: profile.years_experience,
      job: {
        title:        job.title,
        company:      job.companies?.name ?? "the company",
        location:     job.location ?? "Remote-India",
        seniority:    job.seniority,
        role_function: job.role_function,
        comp_lpa_min: job.comp_lpa_min,
        comp_lpa_max: job.comp_lpa_max,
      },
      jd_summary: job.jd_summary,
      market_comp: marketComp,
    });
  } catch (err) {
    logEvent("warn", "toolkit_memo_llm_failed", {
      user_id: user.id.slice(0, 8),
      job_id: jobId,
      error: err instanceof Error ? err.name : "unknown",
    });
    return { ok: false, error: friendlyLlmError(err) };
  }

  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("negotiation_memos") as any).upsert({
    user_id:                user.id,
    job_id:                 jobId,
    content:                content as unknown as Json,
    market_comp:            (marketComp as unknown as Json) ?? null,
    resume_signature:       profile.resume_signature,
    job_signature:          job.signature,
    candidate_target_lpa:   profile.target_lpa,
    candidate_current_lpa:  profile.current_lpa,
    generated_at:           nowIso,
  }, { onConflict: "user_id,job_id" });

  revalidatePath(`/jobs/${jobId}`);

  return { ok: true, cached: false, content, market_comp: marketComp, generated_at: nowIso };
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-mint a signed download URL when an earlier one has expired (the user
// closes + reopens the panel hours later).
// ─────────────────────────────────────────────────────────────────────────────

export async function getTailoredResumeDownloadUrl(
  jobId: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(jobId)) return { ok: false, error: "Invalid job id." };

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin
    .from("tailored_resumes")
    .select("docx_storage_path")
    .eq("user_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle() as any) as { data: { docx_storage_path: string | null } | null };

  if (!data?.docx_storage_path) {
    return { ok: false, error: "No tailored resume found. Generate one first." };
  }

  const { data: signed, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(data.docx_storage_path, SIGNED_URL_TTL_SECONDS);
  if (error || !signed?.signedUrl) {
    return { ok: false, error: "Couldn't create download link. Try regenerating." };
  }
  return { ok: true, url: signed.signedUrl };
}
