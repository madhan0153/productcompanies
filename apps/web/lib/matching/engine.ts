import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeRulesScore } from "./score";
import { explainMatch } from "@/lib/llm/prompts/match-explain";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

// Top N by rules score receive Gemini explanation enrichment.
// Score is NOT changed — only strengths/gaps/reasoning are added.
// With hard-mismatch filtering, the top 20 are now genuinely good matches.
const GEMINI_EXPLAIN_TOP_N = 20;

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
  role_function: string | null; // NEW
}

interface ProfileRow {
  years_experience: number | null;
  preferred_hubs: string[];
  target_lpa: number | null;
  tech_stack: string[];
  seniority: string | null;            // NEW
  target_role_functions: string[];     // NEW
  resume_parsed: ParsedResume | null;
}

export interface ComputeResult {
  total: number;
  skipped: number;       // hard-mismatch jobs that were filtered out
  withExplanations: number;
}

export async function computeMatchesForUser(userId: string): Promise<ComputeResult> {
  const admin = createSupabaseAdminClient();

  // ── 1. Fetch profile ────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRow } = await (admin
    .from("profiles")
    .select(
      "years_experience, preferred_hubs, target_lpa, tech_stack, seniority, target_role_functions, resume_parsed",
    )
    .eq("id", userId)
    .maybeSingle() as any) as { data: Record<string, unknown> | null };

  if (!profileRow) throw new Error("Profile not found");

  const profile: ProfileRow = {
    years_experience:     profileRow.years_experience as number | null,
    preferred_hubs:       (profileRow.preferred_hubs as string[] | null) ?? [],
    target_lpa:           profileRow.target_lpa as number | null,
    tech_stack:           (profileRow.tech_stack as string[] | null) ?? [],
    seniority:            (profileRow.seniority as string | null) ?? null,
    target_role_functions:(profileRow.target_role_functions as string[] | null) ?? [],
    resume_parsed:        profileRow.resume_parsed as ParsedResume | null,
  };

  // If we have a parsed resume and target_role_functions is empty,
  // fall back to what the resume parse extracted.
  if (
    profile.target_role_functions.length === 0 &&
    profile.resume_parsed?.target_role_functions?.length
  ) {
    profile.target_role_functions = profile.resume_parsed.target_role_functions;
  }

  // ── 2. Fetch all active jobs ────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobRows } = await (admin
    .from("jobs")
    .select(
      "id, title, description, hubs, min_experience_years, max_experience_years, comp_lpa_max, tech_stack, seniority, location, role_function, companies(name)",
    )
    .eq("is_active", true)
    .limit(600) as any) as { data: Array<Record<string, unknown>> | null };

  if (!jobRows?.length) return { total: 0, skipped: 0, withExplanations: 0 };

  const jobs: JobRow[] = (jobRows as Array<Record<string, unknown>>).map((r) => ({
    id:                   r.id as string,
    title:                r.title as string,
    description:          (r.description as string | null) ?? "",
    hubs:                 (r.hubs as string[] | null) ?? [],
    min_experience_years: r.min_experience_years as number | null,
    max_experience_years: r.max_experience_years as number | null,
    comp_lpa_max:         r.comp_lpa_max as number | null,
    tech_stack:           (r.tech_stack as string[] | null) ?? [],
    seniority:            r.seniority as string | null,
    location:             (r.location as string | null) ?? "",
    company_name:         ((r.companies as Record<string, unknown>)?.name as string) ?? "",
    role_function:        (r.role_function as string | null) ?? null,
  }));

  // ── 3. Rules-score ALL jobs ─────────────────────────────────────────────────
  const scored = jobs
    .map((job) => {
      const rules = computeRulesScore(
        {
          target_role_functions: profile.target_role_functions,
          years_experience:      profile.years_experience,
          tech_stack:            profile.tech_stack,
          seniority:             profile.seniority,
          preferred_hubs:        profile.preferred_hubs,
          target_lpa:            profile.target_lpa,
        },
        {
          role_function:         job.role_function,
          min_experience_years:  job.min_experience_years,
          max_experience_years:  job.max_experience_years,
          tech_stack:            job.tech_stack,
          seniority:             job.seniority,
          hubs:                  job.hubs,
          comp_lpa_max:          job.comp_lpa_max,
        },
      );
      return { job, rules };
    })
    .sort((a, b) => b.rules.total - a.rules.total);

  // ── 4. Separate valid matches from hard mismatches ──────────────────────────
  const validMatches   = scored.filter((s) => !s.rules.hardMismatch);
  const hardMismatches = scored.filter((s) => s.rules.hardMismatch);
  const skipped        = hardMismatches.length;

  // ── 5. Upsert all valid matches with rules-only scores ─────────────────────
  const allRows: MatchUpsertRow[] = validMatches.map(({ job, rules }) => ({
    user_id:     userId,
    job_id:      job.id,
    score:       rules.total,   // 0–100, rules engine owns the number
    strengths:   [] as string[],
    gaps:        [] as string[],
    reasoning:   "Score computed. AI explanation generating for top matches…",
    computed_at: new Date().toISOString(),
  }));

  await batchUpsert(admin, allRows);

  // ── 6. Delete stale hard-mismatch rows ─────────────────────────────────────
  // Remove matches for jobs that are now a definite mismatch or no longer active.
  const validJobIds = new Set(validMatches.map((s) => s.job.id));
  const staleRows: MatchUpsertRow[] = hardMismatches.map(({ job }) => ({
    user_id:     userId,
    job_id:      job.id,
    score:       0,
    strengths:   [],
    gaps:        [],
    reasoning:   "",
    computed_at: new Date().toISOString(),
  }));
  // Delete hard-mismatch job rows from this user's matches
  if (hardMismatches.length > 0) {
    await admin
      .from("matches")
      .delete()
      .eq("user_id", userId)
      .in("job_id", hardMismatches.map((s) => s.job.id));
  }
  // Also delete rows for jobs no longer in the active list at all
  await admin
    .from("matches")
    .delete()
    .eq("user_id", userId)
    .not("job_id", "in", `(${jobs.map((j) => `'${j.id}'`).join(",")})`);

  // ── 7. Gemini explanation for top N valid matches ──────────────────────────
  const parsedResume = profile.resume_parsed;
  const topN = validMatches.slice(0, GEMINI_EXPLAIN_TOP_N);
  let withExplanations = 0;

  if (parsedResume && topN.length > 0) {
    const geminiRows: MatchUpsertRow[] = [];
    for (const { job, rules } of topN) {
      try {
        const explanation = await explainMatch(parsedResume, {
          title:         job.title,
          company:       job.company_name,
          location:      job.location,
          description:   job.description,
          tech_stack:    job.tech_stack,
          seniority:     job.seniority ?? undefined,
          min_exp:       job.min_experience_years ?? undefined,
          max_exp:       job.max_experience_years ?? undefined,
          role_function: job.role_function ?? undefined,
        });
        geminiRows.push({
          user_id:     userId,
          job_id:      job.id,
          score:       rules.total, // score does NOT change — Gemini is explanation-only
          strengths:   explanation.strengths,
          gaps:        explanation.gaps,
          reasoning:   explanation.reasoning,
          computed_at: new Date().toISOString(),
        });
        withExplanations++;
      } catch {
        // Keep rules-only score row — don't lose the match just because Gemini failed
      }
    }
    if (geminiRows.length > 0) {
      await batchUpsert(admin, geminiRows);
    }
  }

  return { total: validMatches.length, skipped, withExplanations };
}

// ─────────────────────────────────────────────────────────────────────────────

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
