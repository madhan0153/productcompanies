"use server";

// Server actions for Interview Lab Phase 3:
//   - Study Plan: generate + check-off days
//   - Daily DSA Dispatch: select today's problem + personalise + complete
//   - Company × Round Cheatsheets: fetch (LLM-generate on demand, cached)
//
// Privacy: every call validates the Supabase session; rows are inserted
// through the user's session so RLS enforces user_id = auth.uid().

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/observability/log";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";
import {
  DSA_CATALOG,
  getDsaProblemBySlug,
  pickNextDsaProblem,
  type DsaPattern,
  type DsaProblem,
  CRAWLER_META_BY_SLUG,
} from "@prodmatch/shared";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import {
  generateStudyPlan,
  type StudyPlan,
} from "@/lib/llm/prompts/interview-study-plan";
import {
  explainDsaProblem,
  type DsaExplanation,
} from "@/lib/llm/prompts/interview-dsa-explain";
import {
  generateCheatsheet,
  type CheatsheetRound,
  CHEATSHEET_ROUND_DISPLAY,
} from "@/lib/llm/prompts/interview-cheatsheet";

export interface ActionResult<T = void> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ── Study Plan ────────────────────────────────────────────────────────────

export async function generatePlanAction(input: {
  weeks: 4 | 6 | 8 | 12;
  target_companies: string[];
}): Promise<ActionResult<{ generated: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const rate = checkRateLimit({ key: userActionKey(user.id, "plan_generate"), limit: 3, windowMs: 24 * 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: `You can regenerate a plan up to 3 times per day. Try again in ${Math.ceil(rate.retryAfterSeconds / 60)} min.` };

  // Validate target_companies against the 18-slug allow-list.
  const targets = input.target_companies.filter((c) => Boolean(CRAWLER_META_BY_SLUG[c])).slice(0, 6);

  // Pull resume + readiness + target_role_function in parallel.
  const [{ data: profile }, { data: readiness }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed, resume_signature, target_role_functions")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: { resume_parsed: unknown; resume_signature: string | null; target_role_functions: string[] | null } | null;
      }>),
    (supabase
      .from("interview_readiness")
      .select("dsa_score, system_design_score, behavioral_score, domain_score, target_role_function")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: {
          dsa_score: number; system_design_score: number;
          behavioral_score: number; domain_score: number;
          target_role_function: string | null;
        } | null;
      }>),
  ]);

  if (!profile?.resume_parsed) {
    return { ok: false, error: "Upload your resume first — the plan reads it for personalisation." };
  }

  const targetRoleFunction =
    readiness?.target_role_function ||
    profile.target_role_functions?.[0] ||
    "backend";

  let plan: StudyPlan;
  try {
    plan = await generateStudyPlan({
      parsed: profile.resume_parsed as ParsedResume,
      readiness: readiness
        ? {
            dsa_score: readiness.dsa_score,
            system_design_score: readiness.system_design_score,
            behavioral_score: readiness.behavioral_score,
            domain_score: readiness.domain_score,
          }
        : null,
      weeks: input.weeks,
      target_companies: targets,
      target_role_function: targetRoleFunction,
    });
  } catch (err) {
    logEvent("error", "interview_plan_generate_failed", { reason: errKind(err) });
    return { ok: false, error: "Could not generate plan. Try again later." };
  }

  // Persist (upsert one row per user).
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + input.weeks * 7);

  const row = {
    user_id:              user.id,
    weeks:                input.weeks,
    target_role_function: targetRoleFunction,
    target_companies:     targets,
    plan,
    source_signature:     profile.resume_signature ?? null,
    start_date:           start.toISOString().slice(0, 10),
    end_date:             end.toISOString().slice(0, 10),
    generated_at:         new Date().toISOString(),
    updated_at:           new Date().toISOString(),
  };
  const { error } = await (supabase
    .from("interview_study_plan")
    .upsert(row as unknown as never, { onConflict: "user_id" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);
  if (error) {
    logEvent("error", "interview_plan_persist_failed", {});
    return { ok: false, error: "Plan generated but could not save. Try again." };
  }

  logEvent("info", "interview_plan_generated", {
    weeks: input.weeks,
    is_fallback: plan.is_fallback,
    target_count: targets.length,
  });

  revalidatePath("/lab/plan");
  revalidatePath("/lab");
  return { ok: true, data: { generated: true } };
}

export async function checkOffDayAction(input: {
  day: string; // YYYY-MM-DD
  dsa_done?: boolean;
  story_rehearsed?: boolean;
  system_design_done?: boolean;
  mock_done?: boolean;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) {
    return { ok: false, error: "Bad date." };
  }
  const allDone =
    Boolean(input.dsa_done) ||
    Boolean(input.story_rehearsed) ||
    Boolean(input.system_design_done) ||
    Boolean(input.mock_done);

  const row = {
    user_id:            user.id,
    day:                input.day,
    dsa_done:           input.dsa_done ?? false,
    story_rehearsed:    input.story_rehearsed ?? false,
    system_design_done: input.system_design_done ?? false,
    mock_done:          input.mock_done ?? false,
    notes:              input.notes?.slice(0, 500) ?? null,
    completed_at:       allDone ? new Date().toISOString() : null,
    updated_at:         new Date().toISOString(),
  };
  const { error } = await (supabase
    .from("interview_study_day_progress")
    .upsert(row as unknown as never, { onConflict: "user_id,day" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);
  if (error) return { ok: false, error: "Could not save progress." };

  revalidatePath("/lab/plan");
  revalidatePath("/lab");
  return { ok: true };
}

// ── Daily DSA Dispatch ────────────────────────────────────────────────────

export interface TodayDispatch {
  problem: DsaProblem;
  personalised_note: string;
  what_youll_learn: string[];
  is_complete: boolean;
}

const RECENT_DAYS_WINDOW = 14;

export async function getTodayDispatchAction(): Promise<ActionResult<TodayDispatch>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const today = new Date().toISOString().slice(0, 10);

  // Has a dispatch row for today already?
  const { data: existing } = await (supabase
    .from("interview_daily_dispatch")
    .select("problem_slug, personalised_note, is_complete")
    .eq("user_id", user.id)
    .eq("day", today)
    .maybeSingle() as unknown as Promise<{
      data: { problem_slug: string; personalised_note: string | null; is_complete: boolean } | null;
    }>);

  if (existing?.problem_slug) {
    const problem = getDsaProblemBySlug(existing.problem_slug);
    if (problem) {
      return {
        ok: true,
        data: {
          problem,
          personalised_note: existing.personalised_note ?? "",
          what_youll_learn: [],
          is_complete: existing.is_complete,
        },
      };
    }
    // catalog drifted — fall through to pick a new one.
  }

  // Pick next problem.
  const [{ data: profile }, { data: readiness }, { data: history }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed, target_role_functions")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: { resume_parsed: unknown; target_role_functions: string[] | null } | null;
      }>),
    (supabase
      .from("interview_readiness")
      .select("dsa_score, system_design_score, behavioral_score, domain_score, target_role_function")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: {
          dsa_score: number; system_design_score: number; behavioral_score: number;
          domain_score: number; target_role_function: string | null;
        } | null;
      }>),
    (supabase
      .from("interview_daily_dispatch")
      .select("problem_slug, day")
      .eq("user_id", user.id)
      .gte("day", windowStartIso(RECENT_DAYS_WINDOW)) as unknown as Promise<{
        data: Array<{ problem_slug: string; day: string }> | null;
      }>),
  ]);

  if (!profile?.resume_parsed) {
    return { ok: false, error: "Upload your resume first." };
  }

  const targetCompanies = profile.target_role_functions ? [] : []; // placeholder; pull from plan if needed
  // Actual target companies come from interview_study_plan if it exists.
  const { data: plan } = await (supabase
    .from("interview_study_plan")
    .select("target_companies")
    .eq("user_id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: { target_companies: string[] | null } | null;
    }>);

  const recentSlugs = new Set((history ?? []).map((h) => h.problem_slug));
  const { count: solvedCount } = await (supabase
    .from("interview_daily_dispatch")
    .select("problem_slug", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_complete", true) as unknown as Promise<{ count: number | null }>);

  const weakPatterns = inferWeakPatterns(readiness);
  const problem = pickNextDsaProblem({
    weakPatterns,
    targetCompanies: plan?.target_companies ?? targetCompanies,
    recentSlugs,
    solvedCount: solvedCount ?? 0,
  });
  if (!problem) return { ok: false, error: "Out of recommended problems for now — try again tomorrow." };

  // Personalise via LLM (cached on personalised_note column).
  let explanation: DsaExplanation;
  try {
    explanation = await explainDsaProblem({
      problem,
      parsed: profile.resume_parsed as ParsedResume,
      target_companies: plan?.target_companies ?? [],
    });
  } catch (err) {
    logEvent("warn", "interview_dsa_explain_failed", { reason: errKind(err) });
    explanation = { personalised_note: "", what_youll_learn: [] };
  }

  // Persist dispatch row.
  const row = {
    user_id:          user.id,
    day:              today,
    problem_slug:     problem.slug,
    personalised_note: explanation.personalised_note || null,
    is_complete:      false,
    created_at:       new Date().toISOString(),
  };
  await (supabase
    .from("interview_daily_dispatch")
    .upsert(row as unknown as never, { onConflict: "user_id,day" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  revalidatePath("/lab/dsa");
  return {
    ok: true,
    data: {
      problem,
      personalised_note: explanation.personalised_note,
      what_youll_learn: explanation.what_youll_learn,
      is_complete: false,
    },
  };
}

export async function completeDsaAction(input: { day: string }): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const { error } = await (supabase
    .from("interview_daily_dispatch")
    .update({ is_complete: true, completed_at: new Date().toISOString() } as unknown as never)
    .eq("user_id", user.id)
    .eq("day", input.day) as unknown as Promise<{
      error: { message: string } | null;
    }>);
  if (error) return { ok: false, error: "Could not mark complete." };

  // Mirror into day_progress.dsa_done so the streak meter reflects it.
  await (supabase
    .from("interview_study_day_progress")
    .upsert({
      user_id:    user.id,
      day:        input.day,
      dsa_done:   true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as unknown as never, { onConflict: "user_id,day" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  revalidatePath("/lab/dsa");
  revalidatePath("/lab/plan");
  revalidatePath("/lab");
  return { ok: true };
}

// ── Cheatsheets ───────────────────────────────────────────────────────────

export async function fetchOrGenerateCheatsheetAction(input: {
  company_slug: string;
  round_type: CheatsheetRound;
}): Promise<ActionResult<{ title: string; body_markdown: string; from_cache: boolean }>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const meta = CRAWLER_META_BY_SLUG[input.company_slug];
  if (!meta) return { ok: false, error: "Unknown company." };

  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_parsed, resume_signature, target_role_functions")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: { resume_parsed: unknown; resume_signature: string | null; target_role_functions: string[] | null } | null;
    }>);
  if (!profile?.resume_parsed) return { ok: false, error: "Upload your resume first." };

  const roleFunction = profile.target_role_functions?.[0] || "backend";

  // Cache lookup.
  const { data: cached } = await (supabase
    .from("interview_company_cheatsheet")
    .select("title, body_markdown, source_signature")
    .eq("user_id", user.id)
    .eq("company_slug", input.company_slug)
    .eq("role_function", roleFunction)
    .eq("round_type", input.round_type)
    .maybeSingle() as unknown as Promise<{
      data: { title: string; body_markdown: string; source_signature: string | null } | null;
    }>);

  if (cached && cached.source_signature === profile.resume_signature) {
    return { ok: true, data: { title: cached.title, body_markdown: cached.body_markdown, from_cache: true } };
  }

  const rate = checkRateLimit({ key: userActionKey(user.id, "cheatsheet_generate"), limit: 20, windowMs: 60 * 60_000 });
  if (!rate.ok) return { ok: false, error: "Too many cheatsheets generated this hour." };

  let cheatsheet: { title: string; body_markdown: string };
  try {
    cheatsheet = await generateCheatsheet({
      company_slug: input.company_slug,
      company_name: meta.name,
      role_function: roleFunction,
      round_type: input.round_type,
      parsed: profile.resume_parsed as ParsedResume,
    });
  } catch (err) {
    logEvent("error", "interview_cheatsheet_failed", { reason: errKind(err), company: input.company_slug, round: input.round_type });
    return { ok: false, error: "Could not generate cheatsheet right now." };
  }

  const row = {
    user_id:          user.id,
    company_slug:     input.company_slug,
    role_function:    roleFunction,
    round_type:       input.round_type,
    title:            cheatsheet.title,
    body_markdown:    cheatsheet.body_markdown,
    source_signature: profile.resume_signature ?? null,
    generated_at:     new Date().toISOString(),
    updated_at:       new Date().toISOString(),
  };
  await (supabase
    .from("interview_company_cheatsheet")
    .upsert(row as unknown as never, { onConflict: "user_id,company_slug,role_function,round_type" }) as unknown as Promise<{
      error: { message: string } | null;
    }>);

  revalidatePath("/lab/cheatsheets");
  return { ok: true, data: { ...cheatsheet, from_cache: false } };
}

// Optional explicit getter used by the cheatsheets list page.
export async function listCheatsheetsAction(): Promise<ActionResult<Array<{
  company_slug: string; role_function: string; round_type: string; title: string; updated_at: string;
}>>> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in required." };
  const { data } = await (supabase
    .from("interview_company_cheatsheet")
    .select("company_slug, role_function, round_type, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false }) as unknown as Promise<{
      data: Array<{
        company_slug: string; role_function: string; round_type: string; title: string; updated_at: string;
      }> | null;
    }>);
  return { ok: true, data: data ?? [] };
}

// Re-export the displayable mapping for UI use without forcing the UI to
// import directly from the LLM prompt module.
export { CHEATSHEET_ROUND_DISPLAY };

// ── Helpers ───────────────────────────────────────────────────────────────

function inferWeakPatterns(readiness: { dsa_score: number; system_design_score: number; behavioral_score: number; domain_score: number; target_role_function: string | null } | null | undefined): DsaPattern[] {
  // Crude heuristic: when overall DSA is weak, lean on foundational
  // patterns; otherwise broaden across all patterns the catalog uses.
  if (!readiness) return ["arrays_hashing", "two_pointers", "sliding_window", "linked_list"];
  if (readiness.dsa_score < 60) {
    return ["arrays_hashing", "two_pointers", "sliding_window", "linked_list", "trees", "stack_queue"];
  }
  return ["graphs", "trees", "heap_priority_queue", "dp_1d", "dp_2d", "binary_search", "backtracking", "intervals"];
}

function windowStartIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

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

// Avoid an unused-import warning when DSA_CATALOG is not referenced directly:
// the catalog is consumed indirectly via pickNextDsaProblem / getDsaProblemBySlug.
void DSA_CATALOG;
