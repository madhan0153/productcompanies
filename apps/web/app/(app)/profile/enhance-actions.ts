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
  type ExtractedResumeContent,
} from "@/lib/llm/prompts/extract-resume-content";
import {
  generateGapFill,
  type GapFillResult,
} from "@/lib/llm/prompts/gap-fill";
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

  // (Note: the gap-fill step in autoEnhanceResume handles thin resumes by
  // generating plausible content for empty roles/projects. The diagnose +
  // rewrite path here proceeds even if extracted is thin — diagnosis will
  // simply have fewer weak_bullets to flag.)

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
// Auto-enhance — one-shot pipeline (no per-bullet review)
// ─────────────────────────────────────────────────────────────────────────────
//
// Single server action that runs the whole pipeline end-to-end:
//   1. extract bullets from PDF
//   2. diagnose
//   3. rewrite weak bullets
//   4. AUTO-PICK the safest alternative for each (lowest risk first;
//      ties broken by alternative containing more concrete signal)
//   5. render docx
//   6. compute ats_after, write finalised row with all decisions captured
//
// Returns the new ATS score, list of changes, and signed download URL —
// the UI surfaces this as a single result page, no per-bullet UX.
//
// Authenticity guard rails are unchanged: the rewriter prompt is identical,
// risk_flag logic is identical. Auto-acceptance just removes the human
// click — every flagged change is still SURFACED in the result page so
// the user knows what was assumed.

interface AutoChangeDescriptor {
  location: string;       // "NTT Data · Experience" / "Summary"
  original: string;
  rewritten: string;
  risk_flag: RewriteRiskFlag;
  why: string;
}

export type AutoEnhanceResult =
  | {
      ok: true;
      id: string;
      ats_before: number;
      ats_after: number;
      docx_url: string;
      print_url: string;
      changes: AutoChangeDescriptor[];
      risk_flag_count: number;
    }
  | { ok: false; error: string };

// Picks the best alternative for an auto-flow:
//   1. Prefer alternatives with no risk_flag (fully grounded).
//   2. Among ties, prefer the longest / most-quantified text — proxy for
//      "more useful improvement".
//   3. If only flagged alts exist, take the safest flag tier
//      (scope_inferred < tech_inferred < metric_inferred), since
//      scope-inferred is the least likely to be a fabrication.
function pickBestAlternative(
  alts: BulletRewrite["alternatives"],
): BulletRewrite["alternatives"][number] | null {
  if (!alts || alts.length === 0) return null;
  const noRisk = alts.filter((a) => a.risk_flag === null);
  if (noRisk.length > 0) {
    // Among no-risk alts, prefer the one with a number (more concrete).
    return noRisk.sort((a, b) => {
      const aHasNum = /\d/.test(a.text) ? 1 : 0;
      const bHasNum = /\d/.test(b.text) ? 1 : 0;
      if (aHasNum !== bHasNum) return bHasNum - aHasNum;
      return b.text.length - a.text.length;
    })[0];
  }
  // All alts are flagged; pick the safest flag tier.
  const order: Record<string, number> = {
    scope_inferred: 1, tech_inferred: 2, metric_inferred: 3,
  };
  return [...alts].sort((a, b) =>
    (order[a.risk_flag ?? ""] ?? 4) - (order[b.risk_flag ?? ""] ?? 4),
  )[0];
}

export async function autoEnhanceResume(): Promise<AutoEnhanceResult> {
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin, profile } = pre;

  // Quota — counts against the same 5/30d enhanced bucket as the
  // per-bullet flow. A user choosing the auto-flow consumes one slot;
  // re-running consumes another.
  const quota = await getQuotaState(user.id, "enhanced");
  if (quota.exhausted) {
    return {
      ok: false,
      error: `You've used your ${quota.limit} resume enhancements for this 30-day window. Resets ${resetsInHumanForm(quota.resets_at)}.`,
    };
  }

  // ── Step 0: extract real bullets from the source PDF ─────────────────
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
      console.warn("[auto-enhance] extraction failed:",
        err instanceof Error ? err.message : String(err));
    }
  }

  // If extraction failed (no storage path, download error, or Gemini error),
  // fall back to the synthesised text built from the parsed JSON. This still
  // contains all structured content (roles, skills, companies, projects) and
  // is sufficient for diagnosis + rewrite — we just won't have raw bullet text.
  const resumeTextForDiagnosis = extracted
    ? renderExtractedAsText(extracted)
    : synthesiseResumeText(profile.resume_parsed!);

  // Market keyword pool (same as diagnoseEnhancement).
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
    .sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k]) => k);

  // ── Step 1: diagnose ─────────────────────────────────────────────────
  let diagnosis: ResumeDiagnosis;
  try {
    const result = await diagnoseResume({
      resume:        profile.resume_parsed!,
      resume_text:   resumeTextForDiagnosis,
      role_function: profile.role_function ?? null,
      market_keywords,
    });
    diagnosis = result.diagnosis;
    void recordResumeIntelEvent({
      user_id: user.id, kind: "diagnosis", scope: "enhanced",
      llm_tier: "heavy", latency_ms: result.latency_ms, ok: true,
    });
  } catch (err) {
    return { ok: false, error: friendlyLlmError(err) };
  }

  // ── Step 2: rewrite weak bullets in batches ──────────────────────────
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
        mode:              "polish",
        resume_tech_stack: profile.tech_stack ?? [],
      });
      for (const r of res.rewrites) {
        r.alternatives = r.alternatives.map((a) => ({
          ...a,
          risk_flag: heuristicallyFlagRewrite({
            original: r.original, alt: a,
            resume_tech_stack: profile.tech_stack ?? [],
          }) as RewriteRiskFlag,
        }));
        rewritesById[r.index] = r;
      }
    } catch {
      // Continue with other chunks — best-effort.
    }
  }

  // ── Step 3: auto-pick decisions + assemble changes summary ───────────
  const decisions: Record<string, EnhancementDecision> = {};
  const changes: AutoChangeDescriptor[] = [];

  diagnosis.weak_bullets.forEach((wb, idx) => {
    const rw = rewritesById[idx];
    if (!rw) {
      decisions[String(idx)] = { choice: "kept" };
      return;
    }
    const best = pickBestAlternative(rw.alternatives);
    if (!best) {
      decisions[String(idx)] = { choice: "kept" };
      return;
    }
    const altIdx = rw.alternatives.indexOf(best);
    decisions[String(idx)] = { choice: `alt-${altIdx}` };
    changes.push({
      location: wb.section === "summary"
        ? "Summary"
        : wb.section === "projects"
          ? `Projects · ${wb.bullet_index + 1}`
          : `${wb.company ?? "Experience"}`,
      original: wb.original,
      rewritten: best.text,
      risk_flag: best.risk_flag,
      why: best.why,
    });
  });

  // ── Step 3.5: gap-fill — generate content for empty roles/projects ───
  // This is what makes the auto-flow useful for resumes that have only
  // titles. Every generated bullet is marked `scope_inferred` in the
  // changes list so the user sees a risk flag and can verify.
  let gapFill: GapFillResult | null = null;
  // Gap-fill only possible when we have real extracted bullets from the PDF.
  if (extracted) {
    try {
      gapFill = await generateGapFill({
        extracted,
        role_function:    profile.role_function ?? null,
        market_keywords,
        years_experience: profile.resume_parsed!.total_years_experience ?? null,
      });
      void recordResumeIntelEvent({
        user_id: user.id, kind: "rewrite_batch", scope: "enhanced",
        llm_tier: "heavy", ok: true,
      });
    } catch (err) {
      console.warn("[auto-enhance] gap-fill failed (continuing without it):",
        err instanceof Error ? err.message : String(err));
    }
  }

  // Surface each gap-fill into the changes list with a prominent risk
  // flag so the result UI tells the user these are AI-generated drafts.
  if (gapFill) {
    if (gapFill.summary_needed && gapFill.summary_suggestion) {
      changes.push({
        location: "Summary (new)",
        original: extracted?.summary || "(empty)",
        rewritten: gapFill.summary_suggestion,
        risk_flag: "scope_inferred",
        why: "Drafted a professional summary — verify it reflects your actual focus.",
      });
    }
    for (const rf of gapFill.role_fills) {
      for (const b of rf.bullets) {
        changes.push({
          location: `${rf.company} (new bullet)`,
          original: "(role had no bullets)",
          rewritten: b,
          risk_flag: "scope_inferred",
          why: `Drafted plausible work for "${rf.role}" — confirm it matches what you actually did.`,
        });
      }
    }
    for (const pf of gapFill.project_fills) {
      changes.push({
        location: `${pf.name} (new description)`,
        original: "(project had no description)",
        rewritten: pf.description,
        risk_flag: "scope_inferred",
        why: "Drafted a description from your stack — confirm tech list and scope.",
      });
    }
  }

  // ── Step 4: build content + merge gap-fills ──────────────────────────
  // When rich PDF extraction succeeded, use extracted bullets as the base.
  // Otherwise fall back to the lean builder from the parsed JSON (same path
  // as the per-bullet review flow's back-compat path).
  const baseContent = extracted
    ? buildContentFromExtracted({
        extracted,
        displayName:   profile.display_name ?? profile.resume_parsed!.name,
        currentRole:   profile.resume_parsed!.current_role,
        preferredHubs: profile.preferred_hubs ?? [],
      })
    : buildEnhancedContent({
        resume:      profile.resume_parsed!,
        diagnosis,
        rewrites:    rewritesById,
        decisions,
        displayName: profile.display_name ?? profile.resume_parsed!.name,
        preferredHubs: profile.preferred_hubs ?? [],
      });
  const patchedContent = extracted
    ? patchContentWithDecisions({
        base: baseContent, diagnosis, rewrites: rewritesById, decisions,
      })
    : baseContent; // lean path already incorporates decisions
  const enhancedContent = gapFill
    ? mergeGapFillIntoContent(patchedContent, gapFill)
    : patchedContent;

  // ── Step 5: ATS before + after ───────────────────────────────────────
  const ats_before = computeAtsScorecard({
    resume:        profile.resume_parsed!,
    resume_text:   resumeTextForDiagnosis,
    role_function: profile.role_function ?? null,
  });

  const enhancedText = synthesiseTextFromContent(enhancedContent);
  const synthesizedParsed: ParsedResume = {
    ...profile.resume_parsed!,
    summary: enhancedContent.summary,
    tech_stack: enhancedContent.skills.flatMap((g) => g.items),
    products_built: enhancedContent.experience.flatMap((r) => r.bullets),
  };
  const ats_after = computeAtsScorecard({
    resume:        synthesizedParsed,
    resume_text:   enhancedText,
    role_function: profile.role_function ?? null,
  });

  // ── Step 6: render docx, upload, persist as finalised ────────────────
  try {
    // Discard any prior pending row for this resume signature — the
    // auto-flow supersedes the per-bullet pending state.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("enhanced_resumes") as any)
      .update({ status: "discarded", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("source_resume_signature", profile.resume_signature!)
      .eq("status", "pending_review");

    // Persist the auto-flow changes list in decisions under a reserved
    // key so the result view can render the full list (including gap-fills)
    // when the user navigates back later. The per-bullet review flow
    // ignores keys starting with "_".
    const decisionsWithChanges: Record<string, unknown> = {
      ...decisions,
      _auto_changes: changes,
    };

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
        decisions: decisionsWithChanges,
        ats_before,
        ats_after,
        enhanced_content: enhancedContent,
        status: "finalised",
        finalised_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: insertErr?.message ?? "Couldn't save the enhancement." };
    }
    const id = (inserted as { id: string }).id;

    const docxBuffer = await renderTailoredResumeDocx(enhancedContent);
    const storagePath = `${user.id}/${id}.docx`;
    const { error: uploadErr } = await admin.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, docxBuffer, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        upsert: true,
      });
    if (uploadErr) {
      return { ok: false, error: `Couldn't render the resume file: ${uploadErr.message}` };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("enhanced_resumes") as any)
      .update({ docx_storage_path: storagePath })
      .eq("id", id);

    // Close the loop on profile.resume_score so the user sees the lift.
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

    const { data: signed } = await admin.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_TTL);

    revalidatePath("/profile");
    revalidatePath("/profile/enhance");

    const risk_flag_count = changes.filter((c) => c.risk_flag !== null).length;

    return {
      ok: true,
      id,
      ats_before: ats_before.total,
      ats_after: ats_after.total,
      docx_url: signed?.signedUrl ?? "",
      print_url: `/profile/enhance/${id}/print`,
      changes,
      risk_flag_count,
    };
  } catch (err) {
    console.error("[auto-enhance] unexpected error:", err);
    return {
      ok: false,
      error: err instanceof Error
        ? `Couldn't finalise: ${err.message}`
        : "Couldn't finalise the resume. Please retry.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Keep enhanced resume as my profile resume — closes the loop
// ─────────────────────────────────────────────────────────────────────────────
//
// Promotes a finalised enhanced_resumes row to be the user's canonical
// parsed resume. Snapshots the existing parsed state into resume_versions
// (always reversible). Updates denormalized fields (tech_stack,
// current_role, etc.) so downstream matching uses the new content.
//
// Does NOT replace the stored PDF — the user's source PDF stays unchanged
// in the resumes bucket. Matching uses parsed JSON + embedding, not the
// PDF itself.

export type KeepEnhancedResult =
  | { ok: true; new_resume_score: number }
  | { ok: false; error: string };

export async function keepEnhancedAsResume(id: string): Promise<KeepEnhancedResult> {
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid id." };
  const pre = await preflight();
  if (!pre.ok) return pre;
  const { user, admin, profile } = pre;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("enhanced_resumes")
    .select("id, enhanced_content, ats_after, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle() as any) as {
      data: {
        id: string;
        enhanced_content: TailoredResumeContent | null;
        ats_after: AtsScorecard | null;
        status: string;
      } | null;
    };

  if (!row) return { ok: false, error: "Enhancement not found." };
  if (row.status !== "finalised" || !row.enhanced_content) {
    return { ok: false, error: "Enhancement isn't ready yet." };
  }

  // ── Snapshot current profile resume to resume_versions (always reversible)
  if (profile.resume_parsed) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("resume_versions") as any).insert({
      user_id:             user.id,
      resume_parsed:       profile.resume_parsed,
      resume_storage_path: profile.resume_storage_path,
      product_dna_score:   null,        // not relevant for the snapshot
      dna_breakdown:       null,
      resume_signature:    profile.resume_signature,
      source:              "auto_enhance_swap",
    });
  }

  // ── Map TailoredResumeContent → ParsedResume shape ───────────────────
  // The matching engine consumes ParsedResume; we synthesise it from the
  // enhanced content while preserving the candidate's stated current_role
  // and education from the prior parsed copy (those don't change).
  const ec = row.enhanced_content;
  const newParsed: ParsedResume = {
    ...profile.resume_parsed!,
    name: ec.header.name || profile.resume_parsed!.name,
    current_role: ec.header.title || profile.resume_parsed!.current_role,
    summary: ec.summary || profile.resume_parsed!.summary,
    tech_stack: ec.skills.flatMap((g) => g.items),
    products_built: ec.projects?.map((p) => p.summary) ?? profile.resume_parsed!.products_built,
    companies: ec.experience.map((r) => {
      // Try to preserve is_product_company from the source companies array
      // so DNA / matching signals don't reset on swap.
      const src = (profile.resume_parsed!.companies ?? []).find((c) => c.name === r.company);
      return {
        name:               r.company,
        role:               r.role,
        years:              src?.years ?? 0,
        is_product_company: src?.is_product_company ?? false,
      };
    }),
    education: ec.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      year: e.year ?? undefined,
    })),
  };

  // New signature so caches invalidate cleanly. Mirrors the formula in
  // profile/actions.ts:computeResumeSignature so we stay in lock-step
  // with the upload path (re-uploading the same content produces the
  // same signature).
  const { createHash } = await import("node:crypto");
  const stable = JSON.stringify({
    role_function:          newParsed.role_function ?? "",
    target_role_functions:  [...(newParsed.target_role_functions ?? [])].sort(),
    total_years_experience: Math.round((newParsed.total_years_experience ?? 0) * 10) / 10,
    tech_stack:             [...(newParsed.tech_stack ?? [])].map((s) => s.toLowerCase().trim()).sort(),
    companies:              (newParsed.companies ?? []).map((c) => ({
                              name: (c.name ?? "").toLowerCase().trim(),
                              role: (c.role ?? "").toLowerCase().trim(),
                              years: Math.round((c.years ?? 0) * 10) / 10,
                              is_product_company: Boolean(c.is_product_company),
                            })),
    products_built:         [...(newParsed.products_built ?? [])].map((s) => s.trim()).sort(),
    summary:                (newParsed.summary ?? "").trim(),
  });
  const newSignature = createHash("sha256").update(stable).digest("hex");

  // ── Recompute DNA breakdown on the new parsed payload ────────────────
  const { computeDnaBreakdown } = await import("@/lib/matching/dna-breakdown");
  const newDna = computeDnaBreakdown(newParsed);

  // ── Update profile with new parsed JSON + signature + denormalized fields
  // Sets resume_embedding_at=null so the next matches recompute re-embeds.
  // Sets last_match_compute_at=null so the matches page knows to refresh.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("profiles") as any)
    .update({
      resume_parsed:           newParsed,
      resume_signature:        newSignature,
      tech_stack:              newParsed.tech_stack,
      current_role:            newParsed.current_role,
      product_dna_score:       newDna.total,
      dna_breakdown:           newDna,
      resume_score:            row.ats_after?.total ?? profile.resume_parsed!.product_dna_score,
      resume_score_at:         new Date().toISOString(),
      resume_embedding_at:     null,    // queue re-embed
      last_match_compute_at:   null,    // matches page knows to refresh
      updated_at:              new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateErr) {
    return { ok: false, error: `Couldn't update profile: ${updateErr.message}` };
  }

  revalidatePath("/profile");
  revalidatePath("/profile/enhance");
  revalidatePath("/matches");

  return { ok: true, new_resume_score: row.ats_after?.total ?? 0 };
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

/**
 * Merge gap-fill suggestions into a base TailoredResumeContent.
 *
 * Rules:
 *   • Summary — replaced only if needed AND the gap-fill produced one.
 *   • Roles  — only roles whose existing bullets list is empty get the
 *     generated bullets appended. Roles with existing content are
 *     untouched (the rewriter handles those).
 *   • Projects — only projects with empty summary text get the generated
 *     description.
 *
 * Strict additive: never overwrites content the user already has.
 */
function mergeGapFillIntoContent(
  base: TailoredResumeContent,
  gap: GapFillResult,
): TailoredResumeContent {
  // Summary
  const summary = gap.summary_needed && gap.summary_suggestion
    ? gap.summary_suggestion
    : base.summary;

  // Experience — index gap-fill role fills by company for O(1) lookup.
  const roleFillsByCompany = new Map<string, GapFillResult["role_fills"][number]>();
  for (const rf of gap.role_fills) {
    roleFillsByCompany.set(rf.company, rf);
  }
  const experience = base.experience.map((r) => {
    if (r.bullets.length > 0) return r; // already has content
    const fill = roleFillsByCompany.get(r.company);
    if (!fill) return r;
    return { ...r, bullets: fill.bullets.slice(0, 4) };
  });

  // Projects — index project fills by name.
  const projectFillsByName = new Map<string, GapFillResult["project_fills"][number]>();
  for (const pf of gap.project_fills) {
    projectFillsByName.set(pf.name, pf);
  }
  const projects = (base.projects ?? []).map((p) => {
    const hasContent = p.summary && p.summary.trim().length > 4;
    if (hasContent) return p;
    const fill = projectFillsByName.get(p.name);
    if (!fill) return p;
    return { ...p, summary: fill.description };
  });

  return { ...base, summary, experience, projects };
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
