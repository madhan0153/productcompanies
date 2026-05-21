"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit, userActionKey } from "@/lib/security/rate-limit";
import {
  DSA_CATALOG,
  getDsaLearningGuide,
  getDsaProblemBySlug,
  pickNextDsaProblem,
  planDsaReview,
  type DsaConfidence,
  type DsaPattern,
  type DsaProblem,
} from "@prodmatch/shared";

type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type TodayDispatch = {
  problem: DsaProblem;
  personalised_note: string;
  what_youll_learn: string[];
  is_complete: boolean;
};

const RECENT_DAYS_WINDOW = 14;

export async function getTodayDispatchAction(): Promise<ActionResult<TodayDispatch>> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in required." };

    const rate = checkRateLimit({ key: userActionKey(user.id, "dsa_dispatch"), limit: 30, windowMs: 24 * 60 * 60_000 });
    if (!rate.ok) return { ok: false, error: "Too many DSA refreshes today. Try again tomorrow." };

    const today = new Date().toISOString().slice(0, 10);
    const existing = await loadExistingDispatch(supabase, user.id, today);
    if (existing?.problem_slug) {
      const problem = getDsaProblemBySlug(existing.problem_slug);
      if (problem) {
        const guide = getDsaLearningGuide(problem);
        return {
          ok: true,
          data: {
            problem,
            personalised_note: existing.personalised_note ?? defaultNote(true),
            what_youll_learn: guide.approach.slice(0, 3),
            is_complete: existing.is_complete,
          },
        };
      }
    }

    const [profile, readiness, recentSlugs, solvedCount, targetCompanies] = await Promise.all([
      loadProfile(supabase, user.id),
      loadReadiness(supabase, user.id),
      loadRecentSlugs(supabase, user.id),
      loadSolvedCount(supabase, user.id),
      loadTargetCompanies(supabase, user.id),
    ]);

    const problem = pickNextDsaProblem({
      weakPatterns: inferWeakPatterns(readiness),
      targetCompanies,
      recentSlugs,
      solvedCount,
    });
    if (!problem) return { ok: false, error: "No recommended DSA problem is available right now." };

    const guide = getDsaLearningGuide(problem);
    const personalisedNote = defaultNote(Boolean(profile?.resume_parsed));
    await saveDispatch(supabase, {
      user_id: user.id,
      day: today,
      problem_slug: problem.slug,
      personalised_note: personalisedNote,
    });

    revalidatePath("/dsa");
    return {
      ok: true,
      data: {
        problem,
        personalised_note: personalisedNote,
        what_youll_learn: guide.approach.slice(0, 3),
        is_complete: false,
      },
    };
  } catch {
    return { ok: false, error: "Could not pick today's problem. Please try again shortly." };
  }
}

const VALID_CONFIDENCE: DsaConfidence[] = ["got_it", "review", "confused"];
const VALID_SLUGS = new Set(DSA_CATALOG.map((p) => p.slug));

export type DsaReviewRow = {
  problem_slug: string;
  confidence: DsaConfidence;
  next_review_at: string;
  repetitions: number;
};

export async function rateDsaConfidenceAction(input: {
  problem_slug: string;
  confidence: DsaConfidence;
}): Promise<ActionResult<DsaReviewRow>> {
  try {
    if (!VALID_SLUGS.has(input.problem_slug)) {
      return { ok: false, error: "Unknown problem." };
    }
    if (!VALID_CONFIDENCE.includes(input.confidence)) {
      return { ok: false, error: "Invalid confidence rating." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in required." };

    const rate = checkRateLimit({ key: userActionKey(user.id, "dsa_rate"), limit: 120, windowMs: 60 * 60_000 });
    if (!rate.ok) return { ok: false, error: "Too many rating updates this hour. Try again later." };

    // Read existing repetitions so the curve advances correctly.
    const { data: existing } = await (supabase
      .from("dsa_user_progress")
      .select("repetitions")
      .eq("user_id", user.id)
      .eq("problem_slug", input.problem_slug)
      .maybeSingle() as unknown as Promise<{ data: { repetitions: number } | null }>);

    const schedule = planDsaReview({
      confidence: input.confidence,
      currentRepetitions: existing?.repetitions ?? 1,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextReview = new Date(today);
    nextReview.setDate(nextReview.getDate() + schedule.nextOffsetDays);
    const todayIso = today.toISOString().slice(0, 10);
    const nextReviewIso = nextReview.toISOString().slice(0, 10);

    const { error } = await (supabase
      .from("dsa_user_progress")
      .upsert({
        user_id: user.id,
        problem_slug: input.problem_slug,
        confidence: input.confidence,
        last_reviewed_on: todayIso,
        repetitions: schedule.nextRepetitions,
        next_review_at: nextReviewIso,
        updated_at: new Date().toISOString(),
      } as unknown as never, { onConflict: "user_id,problem_slug" }) as unknown as Promise<{
        error: { message: string } | null;
      }>);

    if (error) return { ok: false, error: "Could not save your rating." };

    revalidatePath("/dsa");
    return {
      ok: true,
      data: {
        problem_slug: input.problem_slug,
        confidence: input.confidence,
        next_review_at: nextReviewIso,
        repetitions: schedule.nextRepetitions,
      },
    };
  } catch {
    return { ok: false, error: "Could not save your rating. Please try again." };
  }
}

export async function completeDsaAction(input: { day: string }): Promise<ActionResult> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.day)) {
      return { ok: false, error: "Bad date." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Sign in required." };

    const completedAt = new Date().toISOString();
    const { error } = await (supabase
      .from("interview_daily_dispatch")
      .update({ is_complete: true, completed_at: completedAt } as unknown as never)
      .eq("user_id", user.id)
      .eq("day", input.day) as unknown as Promise<{ error: { message: string } | null }>);
    if (error) return { ok: false, error: "Could not mark complete." };

    await (supabase
      .from("interview_study_day_progress")
      .upsert({
        user_id: user.id,
        day: input.day,
        dsa_done: true,
        completed_at: completedAt,
        updated_at: completedAt,
      } as unknown as never, { onConflict: "user_id,day" }) as unknown as Promise<{ error: { message: string } | null }>);

    revalidatePath("/dsa");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Could not mark complete." };
  }
}

function defaultNote(hasResume: boolean): string {
  return hasResume
    ? "Today's problem is picked from your DSA roadmap and recent practice history."
    : "Starting with a general DSA track. Upload a resume later to tune picks around your target role and companies.";
}

function inferWeakPatterns(readiness: { dsa_score: number } | null): DsaPattern[] {
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

async function loadExistingDispatch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  day: string,
): Promise<{ problem_slug: string; personalised_note: string | null; is_complete: boolean } | null> {
  try {
    const { data } = await (supabase
      .from("interview_daily_dispatch")
      .select("problem_slug, personalised_note, is_complete")
      .eq("user_id", userId)
      .eq("day", day)
      .maybeSingle() as unknown as Promise<{
        data: { problem_slug: string; personalised_note: string | null; is_complete: boolean } | null;
      }>);
    return data ?? null;
  } catch {
    return null;
  }
}

async function loadProfile(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<{ resume_parsed: unknown } | null> {
  try {
    const { data } = await (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", userId)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>);
    return data ?? null;
  } catch {
    return null;
  }
}

async function loadReadiness(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<{ dsa_score: number } | null> {
  try {
    const { data } = await (supabase
      .from("interview_readiness")
      .select("dsa_score")
      .eq("user_id", userId)
      .maybeSingle() as unknown as Promise<{ data: { dsa_score: number } | null }>);
    return data ?? null;
  } catch {
    return null;
  }
}

async function loadRecentSlugs(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<Set<string>> {
  try {
    const { data } = await (supabase
      .from("interview_daily_dispatch")
      .select("problem_slug, day")
      .eq("user_id", userId)
      .gte("day", windowStartIso(RECENT_DAYS_WINDOW)) as unknown as Promise<{ data: Array<{ problem_slug: string }> | null }>);
    return new Set((data ?? []).map((row) => row.problem_slug));
  } catch {
    return new Set();
  }
}

async function loadSolvedCount(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<number> {
  try {
    const { count } = await (supabase
      .from("interview_daily_dispatch")
      .select("problem_slug", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_complete", true) as unknown as Promise<{ count: number | null }>);
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function loadTargetCompanies(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<string[]> {
  try {
    const { data } = await (supabase
      .from("interview_study_plan")
      .select("target_companies")
      .eq("user_id", userId)
      .maybeSingle() as unknown as Promise<{ data: { target_companies: string[] | null } | null }>);
    return data?.target_companies ?? [];
  } catch {
    return [];
  }
}

async function saveDispatch(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  row: { user_id: string; day: string; problem_slug: string; personalised_note: string },
): Promise<void> {
  try {
    await (supabase
      .from("interview_daily_dispatch")
      .upsert({
        ...row,
        is_complete: false,
        created_at: new Date().toISOString(),
      } as unknown as never, { onConflict: "user_id,day" }) as unknown as Promise<{ error: { message: string } | null }>);
  } catch {
    // DSA can still render without persistence; the next refresh may pick again.
  }
}
