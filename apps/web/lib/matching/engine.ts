import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeRulesScore } from "./score";
import { explainMatch } from "@/lib/llm/prompts/match-explain";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

const GEMINI_EXPLAIN_TOP_N = 10; // top N by rules score get Gemini explanation

interface JobRow {
  id: string;
  title: string;
  description: string;
  hubs: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  comp_lpa_max: number | null;
  tech_stack: string[];
  seniority: string | null;
  location: string;
  company_name: string;
}

interface ProfileRow {
  years_experience: number | null;
  preferred_hubs: string[];
  target_lpa: number | null;
  tech_stack: string[];
  resume_parsed: ParsedResume | null;
}

export interface ComputeResult {
  total: number;
  withExplanations: number;
}

export async function computeMatchesForUser(userId: string): Promise<ComputeResult> {
  const admin = createSupabaseAdminClient();

  // Fetch profile
  const { data: profileRow } = await admin
    .from("profiles")
    .select("years_experience, preferred_hubs, target_lpa, tech_stack, resume_parsed")
    .eq("id", userId)
    .maybeSingle();

  if (!profileRow) throw new Error("Profile not found");

  const profile: ProfileRow = {
    years_experience: profileRow.years_experience as number | null,
    preferred_hubs: (profileRow.preferred_hubs as string[] | null) ?? [],
    target_lpa: profileRow.target_lpa as number | null,
    tech_stack: (profileRow.tech_stack as string[] | null) ?? [],
    resume_parsed: profileRow.resume_parsed as ParsedResume | null,
  };

  // Fetch all active jobs with company name
  const { data: jobRows } = await admin
    .from("jobs")
    .select("id, title, description, hubs, min_experience_years, max_experience_years, comp_lpa_max, tech_stack, seniority, location, companies(name)")
    .eq("is_active", true)
    .limit(600);

  if (!jobRows?.length) return { total: 0, withExplanations: 0 };

  const jobs: JobRow[] = (jobRows as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string | null) ?? "",
    hubs: (r.hubs as string[] | null) ?? [],
    min_experience_years: r.min_experience_years as number | null,
    max_experience_years: r.max_experience_years as number | null,
    comp_lpa_max: r.comp_lpa_max as number | null,
    tech_stack: (r.tech_stack as string[] | null) ?? [],
    seniority: r.seniority as string | null,
    location: (r.location as string | null) ?? "",
    company_name: ((r.companies as Record<string, unknown>)?.name as string) ?? "",
  }));

  // Step 1: rules score all jobs
  const scored = jobs.map((job) => {
    const rules = computeRulesScore(
      {
        years_experience: profile.years_experience,
        preferred_hubs: profile.preferred_hubs,
        target_lpa: profile.target_lpa,
        tech_stack: profile.tech_stack,
      },
      {
        min_experience_years: job.min_experience_years,
        max_experience_years: job.max_experience_years,
        hubs: job.hubs,
        comp_lpa_max: job.comp_lpa_max,
        tech_stack: job.tech_stack,
      },
    );
    return { job, rules };
  }).sort((a, b) => b.rules.total - a.rules.total);

  // Step 2: Gemini explanations for top N — only if resume is parsed
  const parsedResume = profile.resume_parsed;
  const topN = scored.slice(0, GEMINI_EXPLAIN_TOP_N);
  const restN = scored.slice(GEMINI_EXPLAIN_TOP_N);
  let withExplanations = 0;

  // Build upsert rows for all jobs first (rules-only score)
  // Scale rules total (0–60) proportionally to 0–75 to give a meaningful
  // initial ranking without Gemini. Top 10 will be enriched to 0–100.
  const allRows: MatchUpsertRow[] = scored.map(({ job, rules }) => ({
    user_id: userId,
    job_id: job.id,
    score: Math.round((rules.total / 60) * 75),
    strengths: [] as string[],
    gaps: [] as string[],
    reasoning: "Rules-based score — computing AI explanation for top matches.",
    computed_at: new Date().toISOString(),
  }));

  // Batch upsert rules-only scores first
  await batchUpsert(admin, allRows);

  // If we have a parsed resume, enrich top N with Gemini
  if (parsedResume && topN.length > 0) {
    const geminiRows: MatchUpsertRow[] = [];
    for (const { job, rules } of topN) {
      try {
        const explanation = await explainMatch(parsedResume, {
          title: job.title,
          company: job.company_name,
          location: job.location,
          description: job.description,
          tech_stack: job.tech_stack,
          seniority: job.seniority ?? undefined,
          min_exp: job.min_experience_years ?? undefined,
          max_exp: job.max_experience_years ?? undefined,
        });
        geminiRows.push({
          user_id: userId,
          job_id: job.id,
          score: rules.total + explanation.score,
          strengths: explanation.strengths,
          gaps: explanation.gaps,
          reasoning: explanation.reasoning,
          computed_at: new Date().toISOString(),
        });
        withExplanations++;
      } catch {
        // Keep rules-only score for this job
      }
    }
    if (geminiRows.length > 0) {
      await batchUpsert(admin, geminiRows);
    }
  }

  // Mark stale matches (jobs that are no longer active) — clean up
  await admin
    .from("matches")
    .delete()
    .eq("user_id", userId)
    .not("job_id", "in", `(${jobs.map((j) => `'${j.id}'`).join(",")})`);

  return { total: scored.length, withExplanations };
}

type MatchUpsertRow = {
  user_id: string;
  job_id: string;
  score: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  computed_at: string;
};

async function batchUpsert(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: MatchUpsertRow[],
) {
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await admin.from("matches").upsert(rows.slice(i, i + BATCH) as any, {
      onConflict: "user_id,job_id",
    });
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
