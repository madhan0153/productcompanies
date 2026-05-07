// Phase G — Matching engine v3.
//
// Pipeline:
//   1. Fetch profile + active jobs (now with JD-parsed structured columns)
//   2. Rules pre-filter (existing 6-dim score, now reading must/nice + JD years)
//   3. Hard-mismatch + ghost-job filtering BEFORE any Gemini cost
//   4. Top-K (default 25) get a structured Fit Card via Gemini
//   5. Persist verdict + score + fit_card JSON; mismatched/ghost rows get
//      hidden_reason set so the UI can gate them
//   6. Stale rows (jobs no longer active or now hard-mismatched) deleted

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeRulesScore } from "./score";
import { generateFitCard, type FitCard, type Verdict } from "@/lib/llm/prompts/fit-card";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { ParsedJD } from "@/lib/llm/prompts/jd-parse";
import type { Json } from "@/lib/supabase/types";

// Top-K of valid matches that get the (Gemini) Fit Card. Below this rank,
// rows are saved with score + a deterministic verdict only.
const FIT_CARD_TOP_K = 20;

// Concurrency + wall-clock budget for the Fit Card phase. Vercel functions
// die at ~300s; we want to return long before that with whatever's done so
// the user sees a populated list. Remaining Fit Cards land on the next
// compute (the deterministic verdict is already saved for every match).
const FIT_CARD_CONCURRENCY = 4;
const FIT_CARD_BUDGET_MS = 45_000;

interface JobRow {
  id: string;
  title: string;
  description: string;
  hubs: string[];
  min_experience_years: number | null;
  max_experience_years: number | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
  tech_stack: string[];
  seniority: string | null;
  location: string;
  company_name: string;
  role_function: string | null;
  // Phase G — JD-parsed
  must_have_skills: string[];
  nice_to_have_skills: string[];
  jd_min_years: number | null;
  jd_max_years: number | null;
  jd_seniority_signal: string | null;
  jd_summary: string | null;
  is_likely_ghost: boolean;
  jd_parsed_at: string | null;
}

interface ProfileRow {
  years_experience: number | null;
  preferred_hubs: string[];
  target_lpa: number | null;
  current_lpa: number | null;
  tech_stack: string[];
  seniority: string | null;
  target_role_functions: string[];
  resume_parsed: ParsedResume | null;
}

export interface ComputeResult {
  total: number;          // valid matches saved
  skipped: number;        // hard-mismatches filtered
  ghost_filtered: number; // jobs flagged as likely-ghost (still saved but hidden)
  with_fit_card: number;  // top-K that got Gemini analysis
  unparsed_jobs: number;  // jobs missing JD parse — caller can trigger backfill
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic verdict — used when we don't run Gemini, or as a fallback if
// Gemini fails. Maps a (score, hard_mismatch, role_match) tuple to a verdict
// band so the UI gets a usable headline regardless of LLM availability.
// ─────────────────────────────────────────────────────────────────────────────

function deterministicVerdict(
  score: number,
  hardMismatch: boolean,
  roleScore: number,
  experienceScore: number,
): Verdict {
  if (hardMismatch) return "mismatch";
  if (roleScore === 22 && score >= 60) return "off_target"; // adjacent role, decent fit
  if (experienceScore <= 3) return "underqualified";
  if (score >= 75) return "strong_fit";
  if (score >= 55) return "stretch";
  return "underqualified";
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function computeMatchesForUser(userId: string): Promise<ComputeResult> {
  const admin = createSupabaseAdminClient();

  // 1. Profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profileRow } = await (admin
    .from("profiles")
    .select(
      "years_experience, preferred_hubs, target_lpa, current_lpa, tech_stack, seniority, target_role_functions, resume_parsed",
    )
    .eq("id", userId)
    .maybeSingle() as any) as { data: Record<string, unknown> | null };

  if (!profileRow) throw new Error("Profile not found");

  const profile: ProfileRow = {
    years_experience:      profileRow.years_experience as number | null,
    preferred_hubs:        (profileRow.preferred_hubs as string[] | null) ?? [],
    target_lpa:            profileRow.target_lpa as number | null,
    current_lpa:           profileRow.current_lpa as number | null,
    tech_stack:            (profileRow.tech_stack as string[] | null) ?? [],
    seniority:             (profileRow.seniority as string | null) ?? null,
    target_role_functions: (profileRow.target_role_functions as string[] | null) ?? [],
    resume_parsed:         profileRow.resume_parsed as ParsedResume | null,
  };

  if (profile.target_role_functions.length === 0 && profile.resume_parsed?.target_role_functions?.length) {
    profile.target_role_functions = profile.resume_parsed.target_role_functions;
  }

  // 2. Jobs (active only, with JD-parsed columns)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobRows } = await (admin
    .from("jobs")
    .select(
      "id, title, description, hubs, min_experience_years, max_experience_years, comp_lpa_min, comp_lpa_max, tech_stack, seniority, location, role_function, must_have_skills, nice_to_have_skills, jd_min_years, jd_max_years, jd_seniority_signal, jd_summary, is_likely_ghost, jd_parsed_at, companies(name)",
    )
    .eq("is_active", true)
    .limit(600) as any) as { data: Array<Record<string, unknown>> | null };

  if (!jobRows?.length) {
    return { total: 0, skipped: 0, ghost_filtered: 0, with_fit_card: 0, unparsed_jobs: 0 };
  }

  const jobs: JobRow[] = (jobRows as Array<Record<string, unknown>>).map((r) => ({
    id:                   r.id as string,
    title:                r.title as string,
    description:          (r.description as string | null) ?? "",
    hubs:                 (r.hubs as string[] | null) ?? [],
    min_experience_years: r.min_experience_years as number | null,
    max_experience_years: r.max_experience_years as number | null,
    comp_lpa_min:         r.comp_lpa_min as number | null,
    comp_lpa_max:         r.comp_lpa_max as number | null,
    tech_stack:           (r.tech_stack as string[] | null) ?? [],
    seniority:            r.seniority as string | null,
    location:             (r.location as string | null) ?? "",
    company_name:         ((r.companies as Record<string, unknown>)?.name as string) ?? "",
    role_function:        (r.role_function as string | null) ?? null,
    must_have_skills:     (r.must_have_skills as string[] | null) ?? [],
    nice_to_have_skills:  (r.nice_to_have_skills as string[] | null) ?? [],
    jd_min_years:         r.jd_min_years as number | null,
    jd_max_years:         r.jd_max_years as number | null,
    jd_seniority_signal:  r.jd_seniority_signal as string | null,
    jd_summary:           r.jd_summary as string | null,
    is_likely_ghost:      Boolean(r.is_likely_ghost),
    jd_parsed_at:         r.jd_parsed_at as string | null,
  }));

  const unparsed = jobs.filter((j) => j.jd_parsed_at === null).length;

  // 3. Rules score every job
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
          title:                 job.title,
          description:           job.description,
          role_function:         job.role_function,
          min_experience_years:  job.min_experience_years,
          max_experience_years:  job.max_experience_years,
          jd_min_years:          job.jd_min_years,
          jd_max_years:          job.jd_max_years,
          tech_stack:            job.tech_stack,
          must_have_skills:      job.must_have_skills,
          nice_to_have_skills:   job.nice_to_have_skills,
          seniority:             job.seniority,
          jd_seniority_signal:   job.jd_seniority_signal,
          hubs:                  job.hubs,
          comp_lpa_max:          job.comp_lpa_max,
        },
      );
      return { job, rules };
    })
    .sort((a, b) => b.rules.total - a.rules.total);

  // 4. Partition
  const hardMismatches = scored.filter((s) => s.rules.hardMismatch);
  const validMatches   = scored.filter((s) => !s.rules.hardMismatch);
  const ghostFiltered  = validMatches.filter((s) => s.job.is_likely_ghost);

  // 5. Drop stale rows: jobs no longer active OR newly hard-mismatched
  const validIds = new Set(validMatches.map((s) => s.job.id));
  if (hardMismatches.length > 0) {
    await admin
      .from("matches")
      .delete()
      .eq("user_id", userId)
      .in("job_id", hardMismatches.map((s) => s.job.id));
  }
  // Also wipe any matches whose job is no longer in our active set at all
  if (validIds.size > 0) {
    await admin
      .from("matches")
      .delete()
      .eq("user_id", userId)
      .not("job_id", "in", `(${[...validIds].map((id) => `'${id}'`).join(",")})`);
  }

  // 6. Save deterministic baseline rows for ALL valid matches first.
  //    Below the top-K threshold this is the final state.
  //    Above it, the Gemini Fit Card overwrites verdict + fit_card.
  const now = new Date().toISOString();

  const baseline: MatchUpsertRow[] = validMatches.map(({ job, rules }) => {
    const vd = deterministicVerdict(
      rules.total,
      rules.hardMismatch,
      rules.breakdown.role,
      rules.breakdown.experience,
    );
    return {
      user_id:       userId,
      job_id:        job.id,
      score:         rules.total,
      verdict:       vd,
      fit_card:      null,
      fit_card_at:   null,
      hidden_reason: job.is_likely_ghost ? "ghost" : (vd === "mismatch" ? "mismatch" : null),
      // Old columns kept null — UI reads fit_card first.
      strengths:     [],
      gaps:          [],
      reasoning:     job.jd_summary ?? "Score computed. Open the role for the full Fit Card.",
      computed_at:   now,
    };
  });

  await batchUpsert(admin, baseline);

  // 7. Gemini Fit Card for top-K, parallelised under a wall-clock budget.
  //    Skip ghost-flagged jobs and jobs without a parsed JD (no signal to feed
  //    the prompt). Save rows incrementally so a timeout still ships partial
  //    progress.
  const parsedResume = profile.resume_parsed;
  let withFitCard = 0;

  if (parsedResume) {
    const candidates = validMatches
      .filter((s) => !s.job.is_likely_ghost)
      .filter((s) => s.job.jd_parsed_at !== null)
      .slice(0, FIT_CARD_TOP_K);

    if (candidates.length > 0) {
      const startedAt = Date.now();
      const queue = [...candidates];
      const fitCardRows: MatchUpsertRow[] = [];

      // Worker — pulls jobs off the shared queue, stops when budget is spent.
      const worker = async () => {
        while (queue.length > 0) {
          if (Date.now() - startedAt > FIT_CARD_BUDGET_MS) return;
          const next = queue.shift();
          if (!next) return;
          const { job, rules } = next;

          const jd: ParsedJD = {
            must_have_skills:    job.must_have_skills,
            nice_to_have_skills: job.nice_to_have_skills,
            jd_min_years:        job.jd_min_years,
            jd_max_years:        job.jd_max_years,
            work_mode:           null,
            jd_seniority_signal: (job.jd_seniority_signal as ParsedJD["jd_seniority_signal"]) ?? null,
            jd_summary:          job.jd_summary ?? "",
            is_boilerplate:      false,
            ghost_reasons:       [],
          };

          try {
            const card = await generateFitCard({
              resume: parsedResume,
              jd,
              job: {
                title:         job.title,
                company:       job.company_name,
                seniority:     job.seniority,
                comp_lpa_min:  job.comp_lpa_min,
                comp_lpa_max:  job.comp_lpa_max,
                role_function: job.role_function,
                location:      job.location,
              },
              candidate: {
                target_lpa:            profile.target_lpa,
                current_lpa:           profile.current_lpa,
                seniority:             profile.seniority,
                target_role_functions: profile.target_role_functions,
                years:                 profile.years_experience,
              },
            });

            fitCardRows.push({
              user_id:       userId,
              job_id:        job.id,
              score:         rules.total,
              verdict:       card.verdict,
              fit_card:      card as unknown as Json,
              fit_card_at:   new Date().toISOString(),
              hidden_reason: card.verdict === "mismatch" ? "mismatch" : null,
              strengths:     [],
              gaps:          [],
              reasoning:     card.one_liner,
              computed_at:   now,
            });
            withFitCard++;
          } catch {
            // Keep the deterministic baseline; remaining work continues.
          }
        }
      };

      // Run N workers in parallel. Promise.allSettled so a single rejection
      // can't take the whole batch down (worker has its own try/catch anyway).
      const workerCount = Math.min(FIT_CARD_CONCURRENCY, candidates.length);
      await Promise.allSettled(Array.from({ length: workerCount }, worker));

      if (fitCardRows.length > 0) {
        await batchUpsert(admin, fitCardRows);
      }
    }
  }

  return {
    total:          validMatches.length,
    skipped:        hardMismatches.length,
    ghost_filtered: ghostFiltered.length,
    with_fit_card:  withFitCard,
    unparsed_jobs:  unparsed,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

type MatchUpsertRow = {
  user_id: string;
  job_id: string;
  score: number;
  verdict: Verdict;
  fit_card: Json | null;
  fit_card_at: string | null;
  hidden_reason: string | null;
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

// Re-export FitCard type so callers can import from one place.
export type { FitCard };
