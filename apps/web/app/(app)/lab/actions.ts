"use server";

// Server actions for the Interview Lab Phase 1 surface.
//
// Three feature areas, all owner-scoped:
//   - Story Bank (generate / polish / star / delete)
//   - Readiness Mirror (submit quiz → 4 scores + actions)
//   - Project Translator (translateBullet, per-click)
//
// Privacy: every call validates the Supabase session first. Inserts go
// through the user's session (NOT admin) so RLS enforces user_id =
// auth.uid(). LLM prompts that touch resume content declare resume_pii
// in their operation policy.
//
// Rate limits: per-user buckets prevent a single account from burning the
// LLM budget for the rest of the org.

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/observability/log";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import {
  generateInterviewStories,
  polishInterviewStory,
  STORY_COMPETENCIES,
  type GeneratedStory,
  type StoryCompetency,
} from "@/lib/llm/prompts/interview-stories";
import {
  computeInterviewReadiness,
  type ReadinessAssessment,
  type ReadinessScores,
} from "@/lib/llm/prompts/interview-readiness";
import {
  translateProjectBullet,
  type TranslatedBullet,
} from "@/lib/llm/prompts/interview-project-translate";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ── Story Bank ─────────────────────────────────────────────────────────────

export async function generateStoriesAction(): Promise<ActionResult<{ count: number }>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const rate = checkRateLimit({ key: userActionKey(user.id, "story_generate"), limit: 5, windowMs: 24 * 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: `You can regenerate stories up to 5 times per day. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} min.` };

  // Pull parsed resume + signature.
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_parsed, resume_signature")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: { resume_parsed: unknown; resume_signature: string | null } | null;
    }>);

  if (!profile?.resume_parsed) {
    return { ok: false, error: "Upload your resume first — Story Bank reads it to generate stories." };
  }

  let stories: GeneratedStory[];
  try {
    stories = await generateInterviewStories({
      parsed: profile.resume_parsed as ParsedResume,
    });
  } catch (err) {
    logEvent("error", "interview_story_generate_failed", {
      reason: errKind(err),
    });
    return { ok: false, error: "Could not generate stories. Try again in a few minutes." };
  }

  if (stories.length === 0) {
    return { ok: false, error: "Generation returned no usable stories. Edit your resume bullets for clarity and retry." };
  }

  // Replace any prior auto-generated rows that match the old signature.
  // User-edited (polished=true) rows are kept untouched.
  await (supabase
    .from("interview_stories")
    .delete()
    .eq("user_id", user.id)
    .eq("polished", false) as unknown as Promise<{ error: unknown }>);

  const sig = profile.resume_signature ?? null;
  const rows = stories.map((s) => ({
    user_id:             user.id,
    competency:          s.competency,
    title:               s.title.slice(0, 120),
    situation:           s.situation.slice(0, 1200),
    task:                s.task.slice(0, 600),
    action:              s.action.slice(0, 2000),
    result:              s.result.slice(0, 800),
    source_company:      s.source_company.slice(0, 80),
    source_role:         s.source_role.slice(0, 80),
    suggested_questions: s.suggested_questions,
    is_starred:          false,
    polished:            false,
    source_signature:    sig,
  }));

  const { error } = await (supabase
    .from("interview_stories")
    .insert(rows as unknown as never) as unknown as Promise<{ error: { code?: string; message: string } | null }>);
  if (error) {
    logEvent("error", "interview_story_insert_failed", { code: error.code ?? null });
    return { ok: false, error: "Could not save stories. Try again." };
  }

  logEvent("info", "interview_stories_generated", { count: stories.length });
  revalidatePath("/lab/stories");
  revalidatePath("/lab");
  return { ok: true, data: { count: stories.length } };
}

export async function polishStoryAction(storyId: string, fields: {
  competency: StoryCompetency;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  source_company: string;
  source_role: string;
}): Promise<ActionResult<GeneratedStory>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  if (!STORY_COMPETENCIES.includes(fields.competency)) {
    return { ok: false, error: "Invalid competency." };
  }

  const rate = checkRateLimit({ key: userActionKey(user.id, "story_polish"), limit: 30, windowMs: 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: "Too many polish requests this hour. Slow down and edit by hand for a bit." };

  let polished: GeneratedStory;
  try {
    polished = await polishInterviewStory({
      competency:          fields.competency,
      title:               fields.title.slice(0, 120),
      situation:           fields.situation.slice(0, 1200),
      task:                fields.task.slice(0, 600),
      action:              fields.action.slice(0, 2000),
      result:              fields.result.slice(0, 800),
      source_company:      fields.source_company,
      source_role:         fields.source_role,
      suggested_questions: [],
    });
  } catch (err) {
    logEvent("error", "interview_story_polish_failed", { reason: errKind(err) });
    return { ok: false, error: "Polish failed — keep your edits and try again." };
  }

  const { error } = await (supabase
    .from("interview_stories")
    .update({
      competency:     polished.competency,
      title:          polished.title.slice(0, 120),
      situation:      polished.situation.slice(0, 1200),
      task:           polished.task.slice(0, 600),
      action:         polished.action.slice(0, 2000),
      result:         polished.result.slice(0, 800),
      source_company: polished.source_company.slice(0, 80),
      source_role:    polished.source_role.slice(0, 80),
      polished:       true,
      updated_at:     new Date().toISOString(),
    } as unknown as never)
    .eq("id", storyId)
    .eq("user_id", user.id) as unknown as Promise<{ error: { message: string } | null }>);
  if (error) return { ok: false, error: "Could not save polished story." };

  revalidatePath("/lab/stories");
  revalidatePath("/lab");
  return { ok: true, data: polished };
}

export async function saveStoryAction(storyId: string, fields: {
  competency: StoryCompetency;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  source_company: string;
  source_role: string;
}): Promise<ActionResult> {
  // Manual save — does NOT call the LLM. Marks polished=true so the next
  // story-generate doesn't overwrite the user's edits.
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!STORY_COMPETENCIES.includes(fields.competency)) return { ok: false, error: "Invalid competency." };

  const { error } = await (supabase
    .from("interview_stories")
    .update({
      competency:     fields.competency,
      title:          fields.title.slice(0, 120),
      situation:      fields.situation.slice(0, 1200),
      task:           fields.task.slice(0, 600),
      action:         fields.action.slice(0, 2000),
      result:         fields.result.slice(0, 800),
      source_company: fields.source_company.slice(0, 80),
      source_role:    fields.source_role.slice(0, 80),
      polished:       true,
      updated_at:     new Date().toISOString(),
    } as unknown as never)
    .eq("id", storyId)
    .eq("user_id", user.id) as unknown as Promise<{ error: { message: string } | null }>);
  if (error) return { ok: false, error: "Could not save." };
  revalidatePath("/lab/stories");
  return { ok: true };
}

export async function starStoryAction(storyId: string, starred: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await (supabase
    .from("interview_stories")
    .update({ is_starred: starred, updated_at: new Date().toISOString() } as unknown as never)
    .eq("id", storyId)
    .eq("user_id", user.id) as unknown as Promise<{ error: { message: string } | null }>);
  if (error) return { ok: false, error: "Could not update star." };
  revalidatePath("/lab/stories");
  return { ok: true };
}

export async function deleteStoryAction(storyId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await (supabase
    .from("interview_stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id) as unknown as Promise<{ error: { message: string } | null }>);
  if (error) return { ok: false, error: "Could not delete." };
  revalidatePath("/lab/stories");
  revalidatePath("/lab");
  return { ok: true };
}

// ── Readiness Mirror ───────────────────────────────────────────────────────

export async function submitReadinessAssessmentAction(
  assessment: ReadinessAssessment,
): Promise<ActionResult<ReadinessScores>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const rate = checkRateLimit({ key: userActionKey(user.id, "readiness_score"), limit: 10, windowMs: 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: "Too many submissions this hour. Try again later." };

  // Pull resume + story-bank size in parallel.
  const [{ data: profile }, { count: storyCount }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed, resume_signature, target_role_functions")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: { resume_parsed: unknown; resume_signature: string | null; target_role_functions: string[] | null } | null;
      }>),
    (supabase
      .from("interview_stories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id) as unknown as Promise<{ count: number | null }>),
  ]);

  if (!profile?.resume_parsed) {
    return { ok: false, error: "Upload your resume first." };
  }

  let scores: ReadinessScores;
  try {
    scores = await computeInterviewReadiness({
      parsed: profile.resume_parsed as ParsedResume,
      assessment,
      storyBankSize: storyCount ?? 0,
    });
  } catch (err) {
    logEvent("error", "interview_readiness_compute_failed", { reason: errKind(err) });
    return { ok: false, error: "Could not compute scores. Try again." };
  }

  // Upsert one row per user.
  const row = {
    user_id:              user.id,
    target_role_function: assessment.target_role_function,
    dsa_score:            scores.dsa_score,
    system_design_score:  scores.system_design_score,
    behavioral_score:     scores.behavioral_score,
    domain_score:         scores.domain_score,
    actions:              scores.actions,
    assessment_answers:   assessment,
    source_signature:     profile.resume_signature ?? null,
    generated_at:         new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  };
  const { error } = await (supabase
    .from("interview_readiness")
    .upsert(row as unknown as never, { onConflict: "user_id" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);
  if (error) {
    logEvent("error", "interview_readiness_persist_failed", {});
    return { ok: false, error: "Scored but could not save. Try again." };
  }

  logEvent("info", "interview_readiness_computed", {
    is_fallback: scores.is_fallback,
    avg: Math.round((scores.dsa_score + scores.system_design_score + scores.behavioral_score + scores.domain_score) / 4),
  });

  revalidatePath("/lab");
  revalidatePath("/lab/readiness");
  return { ok: true, data: scores };
}

// ── Project Translator ────────────────────────────────────────────────────

export async function translateBulletAction(input: {
  bullet: string;
  role?: string;
  company?: string;
}): Promise<ActionResult<TranslatedBullet>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const bullet = input.bullet.trim();
  if (bullet.length < 8 || bullet.length > 600) {
    return { ok: false, error: "Bullet must be 8-600 characters." };
  }
  const rate = checkRateLimit({ key: userActionKey(user.id, "translate_bullet"), limit: 60, windowMs: 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: "Too many translations this hour. Try again later." };

  // Pull profile to pass target_role_function for grounding.
  const { data: profile } = await (supabase
    .from("profiles")
    .select("target_role_functions")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: { target_role_functions: string[] | null } | null;
    }>);

  let result: TranslatedBullet;
  try {
    result = await translateProjectBullet({
      bullet,
      role: input.role,
      company: input.company,
      target_role_function: profile?.target_role_functions?.[0],
    });
  } catch (err) {
    logEvent("error", "interview_project_translate_failed", { reason: errKind(err) });
    return { ok: false, error: "Translator unavailable right now." };
  }
  return { ok: true, data: result };
}

// ── Helpers ───────────────────────────────────────────────────────────────

function errKind(err: unknown): string {
  if (err && typeof err === "object" && "name" in err && typeof err.name === "string") {
    if (err.name === "LlmRunError") {
      const detail = (err as { detail?: { kind?: string } }).detail;
      return detail?.kind ?? "llm_unknown";
    }
  }
  if (err instanceof Error) return err.message.slice(0, 80);
  return "unknown";
}
