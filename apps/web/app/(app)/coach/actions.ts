"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type JobLite, aggregate, adjacencyUnlocks,
} from "@/lib/insights/aggregate";
import { generateCoachPlan, type CoachContext, type CoachPlan } from "@/lib/llm/prompts/coach-plan";
import { LlmRunError } from "@/lib/llm/gemini";
import type { Json } from "@/lib/supabase/types";

export type GenerateResult =
  | { ok: true }
  | { ok: false; reason: string };

export async function generateAndStorePlan(): Promise<GenerateResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "Not signed in" };

  const [{ data: profile }, { data: rawJobs }, { data: companies }] = await Promise.all([
    supabase.from("profiles")
      .select("tech_stack, seniority, target_lpa, current_lpa, years_experience, preferred_hubs")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("jobs")
      .select("id, company_id, tech_stack, seniority, comp_lpa_min, comp_lpa_max, hubs")
      .eq("is_active", true),
    supabase.from("companies").select("name"),
  ]);

  if (!profile || (profile.tech_stack ?? []).length === 0) {
    return { ok: false, reason: "Upload a resume first so we know your stack." };
  }

  const jobs = (rawJobs as JobLite[] | null) ?? [];
  if (jobs.length === 0) {
    return { ok: false, reason: "No active roles indexed yet — wait for the next crawl." };
  }

  const agg = aggregate(jobs, profile);
  const adjacency = adjacencyUnlocks(jobs, profile, 6);

  const ctx: CoachContext = {
    seniority: profile.seniority ?? null,
    target_lpa: profile.target_lpa ?? null,
    current_lpa: profile.current_lpa ?? null,
    years_experience: profile.years_experience ?? null,
    user_stack: profile.tech_stack ?? [],
    top_gaps: agg.gaps.slice(0, 8).map((g) => ({ label: g.label, jobs: g.jobs })),
    adjacency: adjacency.map((a) => ({ label: a.label, unlocked: a.unlocked })),
    hot_hubs: agg.topHubs.slice(0, 4).map(([h]) => h),
    total_active_roles: jobs.length,
    approved_companies: ((companies as { name: string }[] | null) ?? []).map((c) => c.name),
  };

  let plan: CoachPlan;
  try {
    plan = await generateCoachPlan(ctx);
  } catch (err) {
    const reason = err instanceof LlmRunError
      ? `Model unavailable (${err.detail.kind}). Try again in a minute.`
      : "Failed to generate plan. Try again.";
    return { ok: false, reason };
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      coach_plan: plan as unknown as Json,
      coach_plan_at: new Date().toISOString(),
    })
    .eq("id", user.id);
  if (updateError) {
    return { ok: false, reason: "Could not save the plan." };
  }

  revalidatePath("/coach");
  return { ok: true };
}
