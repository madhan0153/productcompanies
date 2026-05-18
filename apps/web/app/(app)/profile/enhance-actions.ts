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

  // (4) Step 1 — diagnose.
  let diagnosis: ResumeDiagnosis;
  const startedAt = Date.now();
  try {
    const result = await diagnoseResume({
      resume:           profile.resume_parsed!,
      resume_text:      profile.resume_text!,
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

  // (7) Persist.
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
    .select("id, diagnosis, rewrites, decisions, ats_before, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle() as any) as { data: (RowForFinalise & { status: string }) | null };

  if (!row) return { ok: false, error: "Enhancement not found." };
  if (row.status !== "pending_review") {
    return { ok: false, error: "Already finalised or discarded." };
  }

  // Build enhanced_content. Bullets default to original; accepted alts
  // replace them; edited bullets use the user's text.
  const enhancedContent = buildEnhancedContent({
    resume:    profile.resume_parsed!,
    diagnosis: row.diagnosis,
    rewrites:  row.rewrites,
    decisions: row.decisions,
    displayName: profile.display_name ?? profile.resume_parsed!.name,
    preferredHubs: profile.preferred_hubs ?? [],
  });

  // Render docx and upload
  const docxBuffer = await renderTailoredResumeDocx(enhancedContent);
  const storagePath = `${user.id}/${id}.docx`;
  const { error: uploadErr } = await admin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, docxBuffer, {
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      upsert: true,
    });
  if (uploadErr) {
    return { ok: false, error: "Couldn't render the resume file. Please retry." };
  }

  // Compute ATS after — feed the new content back through the scorer.
  // We synthesise a resume-text payload from the enhanced bullets so the
  // scorer can run the same heuristics against the updated content.
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

  // Update row
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
    return { ok: false, error: "Couldn't save the finalised resume. Please retry." };
  }

  void recordResumeIntelEvent({
    user_id: user.id, kind: "render_docx", scope: "enhanced",
    scope_ref_id: id, ok: true,
  });
  void recordResumeIntelEvent({
    user_id: user.id, kind: "finalise", scope: "enhanced",
    scope_ref_id: id, ok: true,
  });

  // Optionally snapshot the existing profile resume into resume_versions
  // and... we INTENTIONALLY do NOT auto-overwrite the source resume here.
  // The user must explicitly call `replaceProfileResume` after reviewing.
  // The flag arrives via opts but is currently unused — kept on the
  // surface for the R4 polish step.
  void opts;

  // Signed URL for docx
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
