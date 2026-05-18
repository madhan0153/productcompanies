"use server";

// Resume Intelligence — Server actions for the "Enhance my resume" flow.
//
// Flow:
//   1. POST diagnoseEnhancement()
//        → preflight (auth, consent, parsed resume)
//        → quota check
//        → discard old pending row for this signature (if any)
//        → run Step 1 diagnose prompt
//        → run Step 2 rewrite prompts (batched, best-effort)
//        → compute ats_before scorecard
//        → insert enhanced_resumes row {status: 'pending_review'}
//        → log resume_intel_event 'diagnosis'
//        → revalidatePath('/profile/enhance')
//   2. POST applyDecisions(id, decisions)
//        → preflight + ownership check
//        → merge decisions into the row
//   3. POST finaliseEnhancement(id, {replaceProfileResume})
//        → build enhanced_content (merge accepted alternatives into resume)
//        → render docx, store in bucket
//        → compute ats_after
//        → mark status='finalised', stamp finalised_at
//        → optionally write a new resume_versions snapshot if user opted in
//   4. POST discardEnhancement(id)
//        → mark status='discarded' (reversible up to 30d)
//   5. GET signedDownloadUrls(id)
//        → returns short-TTL signed URLs for the docx (and a /resume/print
//          link for native PDF).
//
// All actions return discriminated unions { ok: true, ... } | { ok: false, error }.

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
  type RewriteRiskFlag,
} from "@/lib/llm/prompts/bullet-rewrite";
import {
  extractResumeContent,
  renderExtractedAsText,
  hasUsableContent,
  type ExtractedResumeContent,
} from "@/lib/llm/prompts/extract-resume-content";
import {
  computeAtsScorecard,
  type AtsScorecard,
} from "@/lib/matching/ats-scorecard";
import { getQuotaState, resetsInHumanForm } from "@/lib/resume-intel/quota";
import { recordResumeIntelEvent } from "@/lib/resume-intel/telemetry";
import { renderTailoredResumeDocx } from "@/lib/docx/tailored-resume";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORAGE_BUCKET = "enhanced-resumes";
const SIGNED_URL_TTL = 600; // 10 min

function friendlyLlmError(err: unknown): string {
  if (err instanceof LlmRunError) {
    switch (err.detail.kind) {
      case "rate_limited":   return "We're busy right now. Please try again in about a minute.";
      case "quota_disabled": return "AI services temporarily unavailable. Please try again later.";
      case "auth":           return "AI services temporarily unavailable. Please try again later.";
      default:               return "Couldn't generate the diagnosis just now. Please retry.";
    }
  }
  return "Something went wrong. Please retry.";
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared preflight
// ─────────────────────────────────────────────────────────────────────────────

// The `profiles` table doesn't store raw resume_text — the original schema
// only persists `resume_parsed` (jsonb). To run the diagnosis prompt we
// synthesise a faithful text payload FROM the parsed structure (summary +
// experience role descriptions + projects). This is the same content the
// parser already extracted, so verbatim quoting still works.
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

async function preflight() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  if (!consents.resume_intelligence) {
    return { ok: false as const, error: "Enable 'Resume Intelligence' in Settings → Privacy to use this feature." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("display_name, role_function, target_role_functions, resume_parsed, resume_signature, resume_storage_path, tech_stack, preferred_hubs")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: {
        display_name: string | null;
        role_function: string | null;
        target_role_functions: string[] | null;
        resume_parsed: ParsedResume | null;
        resume_signature: string | null;
        resume_storage_path: string | null;
        tech_stack: string[] | null;
        preferred_hubs: string[] | null;
      } | null;
    };

  if (!profile?.resume_parsed) {
    return { ok: false as const, error: "Upload your resume first so we can analyse it." };
  }
  if (!profile.resume_signature) {
    return { ok: false as const, error: "Resume still processing — try again in a few seconds." };
  }

  // Synthesise resume_text from the parsed JSON. This is identical to the
  // content the parser extracted, so verbatim quoting in the diagnosis is
  // still accurate. Returned alongside the typed profile so downstream
  // callers don't need to repeat the synthesis.
  const resume_text = synthesiseResumeText(profile.resume_parsed);

  return { ok: true as const, user, supabase, admin: createSupabaseAdminClient(), profile: { ...profile, resume_text } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — diagnose
// ─────────────────────────────────────────────────────────────────────────────

export type DiagnoseEnhancementResult =
  | { ok: true; id: string; cached: boolean }
  | { ok: false; error: string; quota_resets?: string };

export async function diagnoseEnhancement(): Promise<DiagnoseEnhancementResult> {
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin, profile } = pre;

  // (1) If there's already a fresh pending review for this signature, return it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin
    .from("enhanced_resumes")
    .select("id, source_resume_signature, status")
    .eq("user_id", user.id)
    .eq("source_resume_signature", profile.resume_signature!)
    .eq("status", "pending_review")
    .maybeSingle() as any) as { data: { id: string; source_resume_signature: string; status: string } | null };

  if (existing) {
    return { ok: true, id: existing.id, cached: true };
  }

  // (2) Quota check.
  const quota = await getQuotaState(user.id, "enhanced");
  if (quota.exhausted) {
    return {
      ok: false,
      error: `You've used your ${quota.limit} resume enhancements for this 30-day window. Resets ${resetsInHumanForm(quota.resets_at)}.`,
      quota_resets: quota.resets_at ?? undefined,
    };
  }

  // (3) Build market keywords — top 30 must-haves across the user's shortlist.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: shortlistRaw } = await (admin
    .from("matches")
    .select("jobs(must_have_skills, nice_to_have_skills)")
    .eq("user_id", user.id)
    .gte("score", 60)
    .order("score", { ascending: false })
    .limit(40) as any) as { data: Array<{ jobs: { must_have_skills: string[] | null; nice_to_have_skills: string[] | null } | null }> | null };

  const keywordCounts = new Map<string, number>();
  for (const row of shortlistRaw ?? []) {
    for (const s of row.jobs?.must_have_skills ?? []) keywordCounts.set(s, (keywordCounts.get(s) ?? 0) + 3);
    for (const s of row.jobs?.nice_to_have_skills ?? []) keywordCounts.set(s, (keywordCounts.get(s) ?? 0) + 1);
  }
  const market_keywords = Array.from(keywordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k]) => k);

  // (3.5) Step 0 — extract REAL bullet content from the source PDF.
  //       The parseResumePdf flow only captured structured fields (titles,
  //       project names). Enhancement needs the actual bullet lines, so we
  //       re-call Gemini with a content-extraction prompt against the
  //       stored PDF. Cost: ~1 extra heavy-tier call, counted against the
  //       enhancement quota.
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
      console.warn("[enhance] bullet-extraction failed, falling back to parsed JSON:",
        err instanceof Error ? err.message : String(err));
    }
  }

  // Build the resume_text the diagnosis prompt will consume. If extraction
  // succeeded we use the rich content; otherwise fall back to the lean
  // synthesis (which still works for diagnosis but yields fewer rewrites).
  const resumeTextForDiagnosis = extracted
    ? renderExtractedAsText(extracted)
    : profile.resume_text!;

  // If extraction succeeded but there are still ≤3 bullets total, the
  // resume is structurally thin — surface a clear message rather than
  // running diagnosis + rewrites that won't help.
  if (extracted && !hasUsableContent(extracted)) {
    return {
      ok: false,
      error: "Your resume is short on bullet content — most entries are just titles. Add 2-3 bullets per role describing what you did, then run the enhancement again. The AI can only improve what's already there.",
    };
  }

  // (4) Step 1 — diagnose against the rich extracted text.
  let diagnosis: ResumeDiagnosis;
  const startedAt = Date.now();
  try {
    const result = await diagnoseResume({
      resume:           profile.resume_parsed!,
      resume_text:      resumeTextForDiagnosis,
      role_function:    profile.role_function ?? null,
      market_keywords,
    });
    diagnosis = result.diagnosis;
    void recordResumeIntelEvent({
      user_id: user.id,
      kind: "diagnosis",
      scope: "enhanced",
      llm_tier: "heavy",
      latency_ms: result.latency_ms,
      ok: true,
    });
  } catch (err) {
    void recordResumeIntelEvent({
      user_id: user.id,
      kind: "diagnosis",
      scope: "enhanced",
      llm_tier: "heavy",
      latency_ms: Date.now() - startedAt,
      ok: false,
      error_kind: err instanceof LlmRunError ? err.detail.kind : "unknown",
    });
    return { ok: false, error: friendlyLlmError(err) };
  }

  // (5) Step 2 — bullet rewrites (best-effort, batched). Failures here
  //     don't abort the whole pipeline — the user can still review the
  //     diagnosis without alternatives.
  const rewriteRequests: RewriteRequest[] = diagnosis.weak_bullets.map((b, idx) => ({
    index: idx,
    original: b.original,
    weakness: b.weakness,
  }));
  const chunks = chunkBullets(rewriteRequests, 8);

  // Map<bullet_index_in_diagnosis, BulletRewrite>
  const rewritesById: Record<number, BulletRewrite> = {};

  for (const chunk of chunks) {
    try {
      const res = await rewriteBullets({
        bullets:           chunk,
        role_function:     profile.role_function ?? null,
        mode:              "polish",
        resume_tech_stack: profile.tech_stack ?? [],
      });
      for (const r of res.rewrites) {
        // Apply heuristic flag pass on each alt
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
        user_id: user.id, kind: "rewrite_batch", scope: "enhanced",
        llm_tier: "heavy", latency_ms: res.latency_ms, ok: true,
      });
    } catch (err) {
      void recordResumeIntelEvent({
        user_id: user.id, kind: "rewrite_batch", scope: "enhanced",
        llm_tier: "heavy", ok: false,
        error_kind: err instanceof LlmRunError ? err.detail.kind : "unknown",
      });
      // continue with other chunks
    }
  }

  // (6) Step 3 — deterministic ATS scorecard on the source.
  const ats_before: AtsScorecard = computeAtsScorecard({
    resume:        profile.resume_parsed!,
    resume_text:   profile.resume_text!,
    role_function: profile.role_function ?? null,
  });

  // (7) Persist. enhanced_content is initialised with the EXTRACTED bullets
  //     so finalise can patch in user decisions without re-running the
  //     extraction. The user's decisions are written separately and merged
  //     at finalise time.
  const baseContent = extracted ? buildContentFromExtracted({
    extracted,
    displayName: profile.display_name ?? profile.resume_parsed!.name,
    currentRole: profile.resume_parsed!.current_role,
    preferredHubs: profile.preferred_hubs ?? [],
  }) : null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inserted, error: insertErr } = await (admin
    .from("enhanced_resumes") as any)
    .insert({
      user_id:                 user.id,
      source_resume_signature: profile.resume_signature!,
      target_role_function:    profile.role_function ?? null,
      market_keywords,
      diagnosis,
      rewrites: rewritesById,
      ats_before,
      enhanced_content: baseContent,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    return { ok: false, error: "Couldn't save the diagnosis. Please retry." };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/enhance");
  return { ok: true, id: (inserted as { id: string }).id, cached: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Decisions — incremental save while user reviews
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancementDecision {
  /** "kept" | "skipped" | "edited" | "alt-<n>" (accepted alternative index) */
  choice: string;
  /** If choice='edited', the final edited bullet text. */
  text?: string;
}

export type ApplyDecisionsResult = { ok: true } | { ok: false; error: string };

export async function applyEnhancementDecisions(
  id: string,
  decisions: Record<string, EnhancementDecision>,
): Promise<ApplyDecisionsResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." };
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("enhanced_resumes")
    .select("id, user_id, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle() as any) as { data: { id: string; user_id: string; status: string } | null };

  if (!row) return { ok: false, error: "Enhancement not found." };
  if (row.status !== "pending_review") {
    return { ok: false, error: "This enhancement is already finalised or discarded." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("enhanced_resumes") as any)
    .update({ decisions, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: "Couldn't save your changes. Please retry." };
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Finalise — render + persist
// ─────────────────────────────────────────────────────────────────────────────

export type FinaliseResult =
  | { ok: true; id: string; docx_url: string; print_url: string }
  | { ok: false; error: string };

interface RowForFinalise {
  id: string;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  ats_before: AtsScorecard;
  /** Base content built from the extracted bullets at diagnose time.
   *  May be null for rows created before the bullet-extraction step
   *  existed (back-compat). */
  enhanced_content: TailoredResumeContent | null;
}

export async function finaliseEnhancement(
  id: string,
  opts: { replaceProfileResume?: boolean } = {},
): Promise<FinaliseResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." };
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin, profile } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("enhanced_resumes")
    .select("id, diagnosis, rewrites, decisions, ats_before, enhanced_content, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle() as any) as { data: (RowForFinalise & { status: string }) | null };

  if (!row) return { ok: false, error: "Enhancement not found." };
  if (row.status !== "pending_review") {
    return { ok: false, error: "Already finalised or discarded." };
  }

  try {
    // Build the final TailoredResumeContent:
    //   - If enhanced_content (rich base from extraction) exists, patch the
    //     user's decisions into it. Strong bullets carry through unchanged;
    //     weak ones get the accepted alt / edit / original-kept choice.
    //   - Fall back to the lean structure path for back-compat (old rows
    //     that pre-date the bullet-extraction step).
    const enhancedContent = row.enhanced_content
      ? patchContentWithDecisions({
          base:      row.enhanced_content,
          diagnosis: row.diagnosis,
          rewrites:  row.rewrites,
          decisions: row.decisions,
        })
      : buildEnhancedContent({
          resume:    profile.resume_parsed!,
          diagnosis: row.diagnosis,
          rewrites:  row.rewrites,
          decisions: row.decisions,
          displayName: profile.display_name ?? profile.resume_parsed!.name,
          preferredHubs: profile.preferred_hubs ?? [],
        });

    // Render docx (this can throw on malformed content — caught below).
    const docxBuffer = await renderTailoredResumeDocx(enhancedContent);
    const storagePath = `${user.id}/${id}.docx`;
    const { error: uploadErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
    if (uploadErr) {
      console.error("[enhance.finalise] storage upload failed:", uploadErr.message);
      return { ok: false, error: `Couldn't save the resume file: ${uploadErr.message}` };
    }

    // Compute ATS after — same scorer against the updated content.
    const enhancedText = synthesiseTextFromContent(enhancedContent);
    const synthesizedParsed: ParsedResume = {
      ...profile.resume_parsed!,
      summary: enhancedContent.summary,
      tech_stack: enhancedContent.skills.flatMap((g) => g.items),
      products_built: enhancedContent.experience.flatMap((r) => r.bullets),
    };
    const ats_after: AtsScorecard = computeAtsScorecard({
      resume:        synthesizedParsed,
      resume_text:   enhancedText,
      role_function: profile.role_function ?? null,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateErr } = await (admin.from("enhanced_resumes") as any)
      .update({
        enhanced_content: enhancedContent,
        docx_storage_path: storagePath,
        ats_after,
        status: "finalised",
        finalised_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateErr) {
      console.error("[enhance.finalise] DB update failed:", updateErr.message);
      return { ok: false, error: `Couldn't save the finalised resume: ${updateErr.message}` };
    }

    // Close the score loop — update profiles.resume_score so the user sees
    // the improvement reflected on the profile/dashboard. The ats_after
    // total IS the new market-readable strength of the enhanced version.
    if (ats_after.total > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("profiles") as any)
        .update({
          resume_score: ats_after.total,
          resume_score_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    void recordResumeIntelEvent({
      user_id: user.id, kind: "render_docx", scope: "enhanced",
      scope_ref_id: id, ok: true,
    });
    void recordResumeIntelEvent({
      user_id: user.id, kind: "finalise", scope: "enhanced",
      scope_ref_id: id, ok: true,
    });

    // We INTENTIONALLY do NOT auto-overwrite the source resume PDF. The
    // user explicitly opts in via replaceProfileResume — kept here as a
    // hook for the R4+ polish step.
    void opts;

    const { data: signed } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    revalidatePath("/profile");
    revalidatePath("/profile/enhance");

    return {
      ok: true,
      id,
      docx_url:  signed?.signedUrl ?? "",
      print_url: `/profile/enhance/${id}/print`,
    };
  } catch (err) {
    // Any thrown error (docx generation, storage, etc.) lands here.
    // Without this the client-side transition completes with no result
    // and the spinner sticks forever.
    console.error("[enhance.finalise] unexpected error:", err);
    void recordResumeIntelEvent({
      user_id: user.id, kind: "finalise", scope: "enhanced",
      scope_ref_id: id, ok: false,
      error_kind: err instanceof Error ? err.message.slice(0, 100) : "unknown",
    });
    return {
      ok: false,
      error: err instanceof Error
        ? `Couldn't finalise: ${err.message}`
        : "Couldn't finalise the resume. Please retry.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Discard
// ─────────────────────────────────────────────────────────────────────────────

export type DiscardResult = { ok: true } | { ok: false; error: string };

export async function discardEnhancement(id: string): Promise<DiscardResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." };
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("enhanced_resumes") as any)
    .update({ status: "discarded", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending_review");

  if (error) return { ok: false, error: "Couldn't discard. Please retry." };

  void recordResumeIntelEvent({
    user_id: user.id, kind: "discard", scope: "enhanced",
    scope_ref_id: id, ok: true,
  });

  revalidatePath("/profile");
  revalidatePath("/profile/enhance");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed download URL — separate so the client doesn't hold long-lived URLs.
// ─────────────────────────────────────────────────────────────────────────────

export async function getEnhancementDownloadUrl(
  id: string,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." };
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("enhanced_resumes")
    .select("docx_storage_path, status")
    .eq("id", id)
    .eq("user_id", user.id)
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
// Helpers — content builders
// ─────────────────────────────────────────────────────────────────────────────

interface BuildContentInput {
  resume: ParsedResume;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  displayName: string;
  preferredHubs: string[];
}

function resolveBulletText(
  weak: ResumeDiagnosis["weak_bullets"][number],
  rewrite: BulletRewrite | undefined,
  decision: EnhancementDecision | undefined,
): string {
  if (!decision || decision.choice === "kept" || decision.choice === "skipped") {
    return weak.original;
  }
  if (decision.choice === "edited" && decision.text) return decision.text;
  const m = /^alt-(\d+)$/.exec(decision.choice);
  if (m && rewrite) {
    const idx = parseInt(m[1], 10);
    return rewrite.alternatives[idx]?.text ?? weak.original;
  }
  return weak.original;
}

function buildEnhancedContent(input: BuildContentInput): TailoredResumeContent {
  const { resume, diagnosis, rewrites, decisions, displayName, preferredHubs } = input;

  // Index weak bullets by (section, company, bullet_index)
  // so we can patch them back into the right slot.
  const weakByCompany = new Map<string, ResumeDiagnosis["weak_bullets"]>();
  const weakByIdx = new Map<number, ResumeDiagnosis["weak_bullets"][number]>();
  diagnosis.weak_bullets.forEach((b, i) => weakByIdx.set(i, b));
  for (const b of diagnosis.weak_bullets) {
    if (b.section === "experience" && b.company) {
      const arr = weakByCompany.get(b.company) ?? [];
      arr.push(b);
      weakByCompany.set(b.company, arr);
    }
  }

  // Summary
  const summaryWeak = diagnosis.weak_bullets.find((b) => b.section === "summary");
  let summary = resume.summary || "";
  if (summaryWeak) {
    const idx = diagnosis.weak_bullets.indexOf(summaryWeak);
    summary = resolveBulletText(summaryWeak, rewrites[idx], decisions[String(idx)]);
  }

  // Skills — preserve the existing tech_stack, grouped simply
  const skills = [{ group: "Skills", items: resume.tech_stack ?? [] }];

  // Experience — for each company, surface up to 5 bullets. If weak bullets
  // exist for that company, resolve them per decisions; otherwise pass the
  // role.role description through unchanged.
  const experience: TailoredResumeContent["experience"] = (resume.companies ?? []).map((c) => {
    const weakHere = weakByCompany.get(c.name) ?? [];
    const baseBullets: string[] = c.role ? [c.role] : [];
    const patched = baseBullets.map((b, bIdx) => {
      const match = weakHere.find((w) => w.bullet_index === bIdx);
      if (!match) return b;
      const globalIdx = diagnosis.weak_bullets.indexOf(match);
      return resolveBulletText(match, rewrites[globalIdx], decisions[String(globalIdx)]);
    });
    // Also include any weak-bullets diagnosed for this company at higher
    // indexes (didn't have a base bullet) — these are the rewrites that
    // need to appear.
    const extras = weakHere
      .filter((w) => w.bullet_index >= patched.length)
      .map((w) => {
        const globalIdx = diagnosis.weak_bullets.indexOf(w);
        return resolveBulletText(w, rewrites[globalIdx], decisions[String(globalIdx)]);
      });
    return {
      company:  c.name,
      role:     c.role || "",
      duration: c.years > 0 ? `${c.years}+ yrs` : "",
      bullets:  [...patched, ...extras].slice(0, 5),
    };
  });

  // Projects — surfaced from products_built. Weak bullets in the
  // 'projects' section come from the diagnosis prompt.
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

  return {
    header: {
      name:         displayName,
      title:        resume.current_role || "Software Engineer",
      location:     preferredHubs[0] || "India",
      contact_line: "",
    },
    summary,
    skills,
    experience,
    education,
    projects,
    tailoring_notes: "Enhanced via Resume Intelligence — every change reviewed and accepted by you.",
  };
}

/**
 * Build a TailoredResumeContent shape from the rich PDF-extracted content.
 * Used at diagnose time to lock in the source-of-truth bullets, so finalise
 * doesn't need to re-extract.
 */
function buildContentFromExtracted(input: {
  extracted: ExtractedResumeContent;
  displayName: string;
  currentRole: string;
  preferredHubs: string[];
}): TailoredResumeContent {
  const { extracted, displayName, currentRole, preferredHubs } = input;
  return {
    header: {
      name:         displayName,
      title:        currentRole || "Software Engineer",
      location:     preferredHubs[0] || "India",
      contact_line: "",
    },
    summary: extracted.summary,
    skills:  extracted.skills.length > 0 ? [{ group: "Skills", items: extracted.skills }] : [],
    experience: extracted.experience.map((r) => ({
      company:  r.company,
      role:     r.role,
      duration: r.duration,
      bullets:  r.bullets.slice(0, 6),
    })),
    education: extracted.education.map((e) => ({
      institution: e.institution,
      degree:      e.degree,
      year:        e.year,
    })),
    projects: extracted.projects.map((p) => ({
      name:    p.name,
      tech:    [],
      summary: p.bullets.join(" · "),
    })),
    tailoring_notes: "Enhanced via Resume Intelligence — every change reviewed and accepted by you.",
  };
}

/**
 * Patch user decisions into a rich base TailoredResumeContent.
 *
 * For each weak_bullet that the user reviewed:
 *   - `kept`  / `skipped`        → bullet stays as-is (the diagnostic
 *                                    original, which IS in the base
 *                                    content).
 *   - `edited`                   → swap the bullet with the edited text.
 *   - `alt-<n>`                  → swap with the chosen alternative.
 *
 * Bullets the diagnosis didn't flag carry through unchanged. This is the
 * critical fix that lets finalise preserve the full resume content while
 * applying only the targeted improvements.
 */
function patchContentWithDecisions(input: {
  base: TailoredResumeContent;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
}): TailoredResumeContent {
  const { base, diagnosis, rewrites, decisions } = input;

  // Resolve user's choice for a given weak-bullet index → final text.
  // Returns null when no decision was made (caller keeps the source).
  const resolved = new Map<number, string>();
  diagnosis.weak_bullets.forEach((wb, idx) => {
    const d = decisions[String(idx)];
    if (!d) return;
    if (d.choice === "kept" || d.choice === "skipped") {
      resolved.set(idx, wb.original);
      return;
    }
    if (d.choice === "edited" && d.text) {
      resolved.set(idx, d.text);
      return;
    }
    const m = /^alt-(\d+)$/.exec(d.choice);
    if (m) {
      const altIdx = parseInt(m[1], 10);
      const alt = rewrites[String(idx)]?.alternatives[altIdx];
      if (alt?.text) resolved.set(idx, alt.text);
    }
  });

  // Apply per-section. We patch a bullet inside the base by exact-match on
  // its original text (the diagnosis quoted verbatim, the base was built
  // from the same extraction, so the match is reliable).
  const patchedExperience = base.experience.map((r) => {
    const weakHere = diagnosis.weak_bullets.filter(
      (wb) => wb.section === "experience" && wb.company === r.company,
    );
    if (weakHere.length === 0) return r;
    const newBullets = r.bullets.map((bul) => {
      const match = weakHere.find((wb) => wb.original === bul);
      if (!match) return bul;
      const idx = diagnosis.weak_bullets.indexOf(match);
      return resolved.get(idx) ?? bul;
    });
    return { ...r, bullets: newBullets };
  });

  let patchedSummary = base.summary;
  const summaryWeak = diagnosis.weak_bullets.find((wb) => wb.section === "summary");
  if (summaryWeak) {
    const idx = diagnosis.weak_bullets.indexOf(summaryWeak);
    const r = resolved.get(idx);
    if (r) patchedSummary = r;
  }

  const patchedProjects = (base.projects ?? []).map((p, projectIdx) => {
    const weakHere = diagnosis.weak_bullets.filter(
      (wb) => wb.section === "projects" && wb.bullet_index === projectIdx,
    );
    if (weakHere.length === 0) return p;
    // Project summary is a flat string in TailoredResumeContent; patch it
    // when ANY of its associated weak-bullets has a resolved choice.
    let newSummary = p.summary;
    for (const wb of weakHere) {
      const idx = diagnosis.weak_bullets.indexOf(wb);
      const r = resolved.get(idx);
      if (r) newSummary = r;
    }
    return { ...p, summary: newSummary };
  });

  return {
    ...base,
    summary: patchedSummary,
    experience: patchedExperience,
    projects: patchedProjects,
  };
}

function synthesiseTextFromContent(content: TailoredResumeContent): string {
  // Build a flat text representation for the ATS scorer to consume.
  const parts: string[] = [];
  parts.push(content.header.name);
  parts.push(`${content.header.title} · ${content.header.location}`);
  if (content.header.contact_line) parts.push(content.header.contact_line);
  parts.push("\nSummary\n" + (content.summary ?? ""));
  if (content.skills.length > 0) {
    parts.push("\nSkills\n" + content.skills.map((g) => `${g.group}: ${g.items.join(", ")}`).join("\n"));
  }
  parts.push("\nExperience");
  for (const r of content.experience) {
    parts.push(`${r.role} — ${r.company} (${r.duration})`);
    for (const b of r.bullets) parts.push(`• ${b}`);
  }
  if (content.education.length > 0) {
    parts.push("\nEducation");
    for (const e of content.education) {
      parts.push(`${e.degree} — ${e.institution}${e.year ? `, ${e.year}` : ""}`);
    }
  }
  return parts.join("\n");
}
