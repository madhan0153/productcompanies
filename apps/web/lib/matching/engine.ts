// Phase K — Enterprise matching engine.
//
// Pipeline (full vs incremental modes):
//   FULL  (resume just changed, or first compute):
//     - Score every active job
//     - Generate Fit Cards for top-K within wall-clock budget
//     - Mark all matches seen_at=NULL (the user has new things to look at)
//
//   INCREMENTAL (subsequent runs, no resume change):
//     - Score only jobs whose embedding_at > profile.last_match_compute_at
//       (new + signature-changed since last compute)
//     - Re-rank in-memory using existing match scores for unchanged jobs
//     - Generate Fit Cards lazily — only for jobs that newly entered top-K
//       AND whose card is missing or stale (jd_parsed_at > fit_card_at)
//     - Mark only newly-affected match rows seen_at=NULL
//
// Both modes:
//   - Paginated job fetch (no row cap)
//   - Hard-mismatch filter wipes existing match rows
//   - Inactive-job cleanup (jobs flipped is_active=false → matches dropped)
//   - profiles.last_match_compute_at stamped on success

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeRulesScore } from "./score";
import { calibrateMatch, capScoreForVerdict } from "./calibrate";
import { generateFitCard, type FitCard, type Verdict } from "@/lib/llm/prompts/fit-card";
import { cosineSimilarity } from "@/lib/llm/embed";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { ParsedJD } from "@/lib/llm/prompts/jd-parse";
import type { Json } from "@/lib/supabase/types";
import {
  buildCompPercentileTable, lookupCompBracket,
  type CompPercentileTable,
} from "@/lib/insights/comp-percentiles";
import { buildFeedbackModel, feedbackDelta, type FeedbackModel } from "./feedback";
import { assertNoSupabaseError } from "@/lib/jobs/state";

// Sprint 6 — Jobs with quality_score below this threshold are excluded from
// the user's match feed entirely. The crawler already declined to LLM-parse
// them; this is the read-side enforcement.
const MIN_QUALITY_FOR_FEED = 40;

// Dynamic Fit Card sizing: cover all strong fits + a buffer of stretches,
// capped so a power user with 100 strong fits doesn't blow our LLM budget.
const FIT_CARD_MIN = 8;
const FIT_CARD_MAX = 25;
const FIT_CARD_STRETCH_BUFFER = 5;

const FIT_CARD_CONCURRENCY = 4;
const FIT_CARD_BUDGET_MS = 45_000;

const JOBS_PAGE_SIZE = 1000;

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
  company_id: string | null;
  company_name: string;
  role_function: string | null;
  role_function_jd: string | null;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  jd_min_years: number | null;
  jd_max_years: number | null;
  jd_seniority_signal: string | null;
  jd_summary: string | null;
  is_likely_ghost: boolean;
  jd_parsed_at: string | null;
  embedding: number[] | null;
  embedding_at: string | null;
  /** Sprint 1 Item 6 — SHA256 of the JD description. Used to cache Fit Cards. */
  signature: string | null;
  /** Sprint 6 — defaults to 100 for legacy rows. */
  quality_score: number;
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
  resume_embedding: number[] | null;
  resume_embedding_at: string | null;
  last_match_compute_at: string | null;
  active_resume_version_id: string | null;
  resume_parsed_version_id: string | null;
  resume_embedding_version_id: string | null;
  /** Sprint 1 Item 6 — content-hash of parsed resume. Drives Fit-Card cache. */
  resume_signature: string | null;
}

export interface ComputeResult {
  total: number;
  new_matches: number;       // rows where seen_at became NULL this run
  skipped: number;           // hard-mismatches filtered
  ghost_filtered: number;
  with_fit_card: number;
  unparsed_jobs: number;
  mode: "full" | "incremental";
  duration_ms: number;
}

// Calibration step (verdict + caps + visibility) lives in ./calibrate so it
// can be unit-tested in isolation. The engine wires the calibrated result
// into match rows + Fit Cards below.

function jobToCalibrateInput(job: JobRow): import("./calibrate").CalibrateJobInput {
  return {
    title:             job.title,
    description:       job.description,
    quality_score:     job.quality_score,
    jd_parsed_at:      job.jd_parsed_at,
    jd_summary:        job.jd_summary,
    role_function_jd:  job.role_function_jd,
    must_have_skills:  job.must_have_skills,
    nice_to_have_skills: job.nice_to_have_skills,
    tech_stack:        job.tech_stack,
    is_likely_ghost:   job.is_likely_ghost,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Paginated jobs fetch — no row cap.
// ─────────────────────────────────────────────────────────────────────────────

async function fetchAllActiveJobs(
  admin: ReturnType<typeof createSupabaseAdminClient>,
): Promise<JobRow[]> {
  const all: JobRow[] = [];
  for (let from = 0; ; from += JOBS_PAGE_SIZE) {

    const { data: rows } = await (admin
      .from("jobs")
      .select(
        "id, title, description, hubs, min_experience_years, max_experience_years, comp_lpa_min, comp_lpa_max, tech_stack, seniority, location, company_id, role_function, role_function_jd, must_have_skills, nice_to_have_skills, jd_min_years, jd_max_years, jd_seniority_signal, jd_summary, is_likely_ghost, jd_parsed_at, embedding, embedding_at, signature, quality_score, companies(name)",
      )
      .eq("is_active", true)
      // Sprint 6 — read-side quality enforcement. Legacy rows default to 100
      // so we never accidentally hide pre-Sprint-6 jobs.
      .gte("quality_score", MIN_QUALITY_FOR_FEED)
      .range(from, from + JOBS_PAGE_SIZE - 1) as any) as { data: Array<Record<string, unknown>> | null };

    const batch = rows ?? [];
    if (batch.length === 0) break;
    for (const r of batch) {
      all.push({
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
        company_id:           (r.company_id as string | null) ?? null,
        company_name:         ((r.companies as Record<string, unknown>)?.name as string) ?? "",
        role_function:        (r.role_function as string | null) ?? null,
        role_function_jd:     (r.role_function_jd as string | null) ?? null,
        must_have_skills:     (r.must_have_skills as string[] | null) ?? [],
        nice_to_have_skills:  (r.nice_to_have_skills as string[] | null) ?? [],
        jd_min_years:         r.jd_min_years as number | null,
        jd_max_years:         r.jd_max_years as number | null,
        jd_seniority_signal:  r.jd_seniority_signal as string | null,
        jd_summary:           r.jd_summary as string | null,
        is_likely_ghost:      Boolean(r.is_likely_ghost),
        jd_parsed_at:         r.jd_parsed_at as string | null,
        embedding:            (r.embedding as number[] | null) ?? null,
        embedding_at:         (r.embedding_at as string | null) ?? null,
        signature:            (r.signature as string | null) ?? null,
        quality_score:        typeof r.quality_score === "number" ? (r.quality_score as number) : 100,
      });
    }
    if (batch.length < JOBS_PAGE_SIZE) break;
  }
  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export interface ComputeOptions {
  /** Force full recompute regardless of last_match_compute_at. */
  forceFull?: boolean;
  /** Resume version this compute was queued for. Superseded jobs must not stamp results. */
  resumeVersionId?: string | null;
  /** Durable job id, used to detect cancellation/supersession before final writes. */
  jobId?: string | null;
}

export async function computeMatchesForUser(
  userId: string,
  opts: ComputeOptions = {},
): Promise<ComputeResult> {
  const t0 = Date.now();
  const admin = createSupabaseAdminClient();

  // 1. Profile

  const { data: profileRow } = await (admin
    .from("profiles")
    .select(
      "years_experience, preferred_hubs, target_lpa, current_lpa, tech_stack, seniority, target_role_functions, resume_parsed, resume_embedding, resume_embedding_at, last_match_compute_at, active_resume_version_id, resume_parsed_version_id, resume_embedding_version_id, resume_signature",
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
    resume_embedding:      (profileRow.resume_embedding as number[] | null) ?? null,
    resume_embedding_at:   (profileRow.resume_embedding_at as string | null) ?? null,
    last_match_compute_at: (profileRow.last_match_compute_at as string | null) ?? null,
    active_resume_version_id:    (profileRow.active_resume_version_id as string | null) ?? null,
    resume_parsed_version_id:    (profileRow.resume_parsed_version_id as string | null) ?? null,
    resume_embedding_version_id: (profileRow.resume_embedding_version_id as string | null) ?? null,
    resume_signature:      (profileRow.resume_signature as string | null) ?? null,
  };

  if (opts.resumeVersionId) {
    if (
      profile.active_resume_version_id !== opts.resumeVersionId ||
      profile.resume_parsed_version_id !== opts.resumeVersionId ||
      profile.resume_embedding_version_id !== opts.resumeVersionId
    ) {
      throw new Error("Resume is not ready for this match computation.");
    }
  }
  await assertComputeJobIsCurrent(admin, {
    userId,
    resumeVersionId: opts.resumeVersionId,
    jobId: opts.jobId,
  });

  if (profile.target_role_functions.length === 0 && profile.resume_parsed?.target_role_functions?.length) {
    profile.target_role_functions = profile.resume_parsed.target_role_functions;
  }

  // 2. Jobs (paginated — no cap)
  const jobs = await fetchAllActiveJobs(admin);
  if (jobs.length === 0) {
    return { total: 0, new_matches: 0, skipped: 0, ghost_filtered: 0, with_fit_card: 0, unparsed_jobs: 0, mode: "full", duration_ms: Date.now() - t0 };
  }
  const unparsed = jobs.filter((j) => j.jd_parsed_at === null).length;

  // 3. Decide compute mode.
  // FULL when: forced, first compute, or resume changed since last compute.
  // INCREMENTAL when: previous compute exists AND resume unchanged.
  const lastCompute = profile.last_match_compute_at ? new Date(profile.last_match_compute_at).getTime() : 0;
  const resumeAt    = profile.resume_embedding_at ? new Date(profile.resume_embedding_at).getTime() : 0;
  const resumeChanged = resumeAt > lastCompute;
  const mode: "full" | "incremental" = (opts.forceFull || lastCompute === 0 || resumeChanged) ? "full" : "incremental";

  // For incremental: pull existing matches so we can re-use scores for
  // jobs whose embedding hasn't changed.

  const { data: existingMatchRows } = await (admin
    .from("matches")
    .select("job_id, score, verdict, fit_card, fit_card_at, hidden_reason, score_breakdown, fit_card_resume_signature, fit_card_jd_signature, user_hidden, computed_at, seen_at")
    .eq("user_id", userId) as any) as { data: ExistingMatch[] | null };
  const existingByJob = new Map<string, ExistingMatch>();
  for (const m of existingMatchRows ?? []) existingByJob.set(m.job_id, m);

  // Sprint 6 — Build the feedback model once per compute. Reads user_hidden
  // matches + applications, accumulates per-feature signal. Cold-start users
  // get an empty model (delta=0 across the board); the rubric drives ranking
  // unchanged until they have history.
  const feedbackModel: FeedbackModel = await buildFeedbackModel(admin, userId);

  // 4. Score: for each job, decide reuse-existing vs recompute.
  const resumeEmbedding = profile.resume_embedding;
  const scored: ScoredJob[] = jobs.map((job) => {
    const existing = existingByJob.get(job.id);
    const jobChangedSinceLastCompute =
      job.embedding_at && lastCompute > 0
        ? new Date(job.embedding_at).getTime() > lastCompute
        : true;
    const needsRescore = mode === "full" || !existing || jobChangedSinceLastCompute;

    if (!needsRescore && existing) {
      // Reuse — no Gemini, no cosine. Existing rules score still valid because
      // (a) job hasn't changed and (b) profile hasn't changed.
      return {
        job,
        rules: undefined,
        score: existing.score,
        verdict: existing.verdict,
        hidden_reason: existing.hidden_reason,
        existing,
        rescored: false,
        cosine: null,
        feedback_adjustment: 0,
      };
    }

    const cosine =
      resumeEmbedding && job.embedding
        ? cosineSimilarity(resumeEmbedding, job.embedding)
        : null;
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
        role_function:         job.role_function ?? (job.role_function_jd === "other" ? null : job.role_function_jd),
        semantic_cosine:       cosine,
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

    // Sprint 6 — Feedback re-rank. Hard-mismatch rows skip the bonus (they're
    // going to be hidden anyway, no point distorting the model). Cold-start
    // users get delta=0.
    const feedback_adjustment = rules.hardMismatch ? 0 : feedbackDelta(feedbackModel, {
      company_id:       job.company_id,
      role_function:    job.role_function,
      seniority:        job.seniority,
      hubs:             job.hubs,
      must_have_skills: job.must_have_skills,
    });
    const finalScore = Math.max(0, Math.min(100, rules.total + feedback_adjustment));
    const calibrated = calibrateMatch({
      job: jobToCalibrateInput(job),
      rules,
      baseScore: finalScore,
    });

    return {
      job,
      rules,
      score: calibrated.score,
      verdict: calibrated.verdict as Verdict,
      hidden_reason: calibrated.hidden_reason,
      existing,
      rescored: true,
      cosine,
      feedback_adjustment,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  // 5. Partition.
  const hardMismatchScored = scored.filter(
    (s) => s.rules?.hardMismatch === true,
  );
  const validMatches = scored.filter((s) => !(s.rules?.hardMismatch === true));
  const ghostFiltered = validMatches.filter((s) => s.job.is_likely_ghost);

  // 6. Inactive-job + hard-mismatch cleanup.
  // (a) Drop matches for jobs that are no longer in our active set.
  const activeIds = new Set(jobs.map((j) => j.id));
  const orphanIds = (existingMatchRows ?? [])
    .map((m) => m.job_id)
    .filter((id) => !activeIds.has(id));
  if (orphanIds.length > 0) {
    // Chunk to keep IN clauses short.
    for (let i = 0; i < orphanIds.length; i += 200) {
      const { error } = await admin
        .from("matches")
        .delete()
        .eq("user_id", userId)
        .in("job_id", orphanIds.slice(i, i + 200));
      assertNoSupabaseError(error as { message: string } | null, "Could not delete inactive matches");
    }
  }
  // (b) Drop matches whose latest scoring flagged hard-mismatch.
  if (hardMismatchScored.length > 0) {
    const ids = hardMismatchScored.map((s) => s.job.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await admin
        .from("matches")
        .delete()
        .eq("user_id", userId)
        .in("job_id", ids.slice(i, i + 200));
      assertNoSupabaseError(error as { message: string } | null, "Could not delete hard-mismatch matches");
    }
  }

  // 7. Persist baselines for jobs that were re-scored. Mark seen_at=NULL on
  //    rescored rows so the UI can flag them as "new".
  const now = new Date().toISOString();
  const rescored = validMatches.filter((s) => s.rescored);
  let newMatchCount = 0;

  const baselineRows: BaselineUpsertRow[] = rescored.map(({ job, rules, score, verdict, hidden_reason, existing, feedback_adjustment }) => {
    // First-seen rows OR significant score change → seen_at=NULL ("new").
    // Fit-card-only updates without score movement → keep existing seen_at.
    const isNew = !existing || Math.abs((existing.score ?? 0) - score) >= 3;
    if (isNew) newMatchCount++;
    const rowHiddenReason =
      rules?.hardMismatch ? "mismatch"
      : job.is_likely_ghost ? "ghost"
      : hidden_reason;
    // Sprint 1 Item 3 — persist the per-dimension breakdown so the UI can
    // surface "Why this score?" without recomputing. Null only when we
    // reused an existing score (no rules object was computed this run).
    const score_breakdown = rules
      ? (rules.breakdown as unknown as Json)
      : (existing?.score_breakdown ?? null);
    // Sprint 6 — persist confidence + hard-cap reason + tech coverage so the
    // UI can render "Excellent fit (87, confidence 90)" and explain caps in
    // tooltips without recomputing.
    const confidence    = rules ? rules.confidence : null;
    const hardCapReason = rules ? rules.hardCapReason : null;
    const techCoverage  = rules?.techCoverage
      ? (rules.techCoverage as unknown as Json)
      : null;
    return {
      user_id:       userId,
      job_id:        job.id,
      score,
      verdict,
      fit_card:      existing?.fit_card ?? null,
      fit_card_at:   existing?.fit_card_at ?? null,
      hidden_reason: rowHiddenReason,
      score_breakdown,
      confidence,
      hard_cap_reason: hardCapReason,
      tech_coverage:   techCoverage,
      feedback_adjustment,
      strengths:     [],
      gaps:          [],
      reasoning:     job.jd_summary ?? "Score computed. Open the role for the full Fit Card.",
      computed_at:   now,
      seen_at:       isNew ? null : (existing?.seen_at ?? null),
    };
  });

  await batchUpsert(admin, baselineRows);

  // 8. Fit Cards — dynamic top-K, lazy regeneration.
  const parsedResume = profile.resume_parsed;
  let withFitCard = 0;

  // Sprint 3 Item 28 — pre-compute comp percentiles across the active
  // catalog. One pass, ~few ms; passed per-job into the Fit Card prompt
  // so the model can ground `negotiate_to_lpa` on real numbers instead of
  // hallucinating.
  const compTable: CompPercentileTable = buildCompPercentileTable(
    jobs.map((j) => ({
      seniority:     j.seniority,
      role_function: j.role_function,
      comp_lpa_min:  j.comp_lpa_min,
      comp_lpa_max:  j.comp_lpa_max,
    })),
  );

  if (parsedResume) {
    // Dynamic top-K: cover every strong fit + a stretch buffer, bounded.
    const strongCount = validMatches.filter((s) => s.score >= 75).length;
    const topK = Math.max(FIT_CARD_MIN, Math.min(FIT_CARD_MAX, strongCount + FIT_CARD_STRETCH_BUFFER));

    // Candidates: top-K of valid, non-ghost, JD-parsed jobs whose Fit Card
    // is missing OR stale (jd_parsed_at > fit_card_at) OR resume changed.
    // Sprint 1 Item 4 — never burn Gemini quota on user-dismissed roles.
    const topRanked = validMatches
      .filter((s) => !s.job.is_likely_ghost)
      .filter((s) => !s.hidden_reason)
      .filter((s) => s.score >= 50)
      .filter((s) => s.job.jd_parsed_at !== null)
      .filter((s) => s.existing?.user_hidden !== true)
      .slice(0, topK);

    // Sprint 1 Item 6 — content-signature cache. Skip Gemini entirely when
    // both the resume and the JD haven't changed since the cached card was
    // generated. Fallback to the legacy time-based heuristic when either
    // signature is missing (legacy rows pre-Sprint-1).
    const currentResumeSig = profile.resume_signature;
    const candidates = topRanked.filter((s) => {
      const ex = s.existing;
      // No card yet → generate.
      if (!ex || !ex.fit_card_at) return true;
      // Score moved materially → regenerate (verdict may have shifted).
      if (Math.abs((ex.score ?? 0) - s.score) >= 5) return true;

      const cachedResumeSig = ex.fit_card_resume_signature;
      const cachedJdSig     = ex.fit_card_jd_signature;
      const haveBothSigs    = cachedResumeSig !== null && cachedJdSig !== null;
      if (haveBothSigs && currentResumeSig && s.job.signature) {
        // Both signatures match the current state → cache hit, skip Gemini.
        if (cachedResumeSig === currentResumeSig && cachedJdSig === s.job.signature) {
          return false;
        }
        // Otherwise the content changed → regenerate.
        return true;
      }

      // Legacy fallback (one or both signatures missing on the cached row).
      if (resumeChanged) return true;
      if (s.job.jd_parsed_at && new Date(s.job.jd_parsed_at).getTime() > new Date(ex.fit_card_at).getTime()) return true;
      return false;
    });

    if (candidates.length > 0) {
      const startedAt = Date.now();
      const queue = [...candidates];
      const fitCardRows: FitCardUpsertRow[] = [];

      const worker = async () => {
        while (queue.length > 0) {
          if (Date.now() - startedAt > FIT_CARD_BUDGET_MS) return;
          const next = queue.shift();
          if (!next) return;
          const { job, score } = next;

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
            role_function_jd:    null,
            responsibilities:    [],
            qualifications_required:  [],
            qualifications_preferred: [],
            tech_stack_explicit: [],
            team_context:        null,
          };

          try {
            const marketComp = lookupCompBracket(compTable, job.seniority, job.role_function);
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
              marketComp,
            });

            const cardScore = capScoreForVerdict(score, card.verdict);
            fitCardRows.push({
              user_id:       userId,
              job_id:        job.id,
              score:         cardScore,
              verdict:       card.verdict,
              fit_card:      card as unknown as Json,
              fit_card_at:   new Date().toISOString(),
              hidden_reason: card.verdict === "mismatch" ? "mismatch" : null,
              // Sprint 1 Item 6 — stamp the content signatures the card was
              // generated against. The next compute reads these to decide
              // cache hit vs regen, no LLM call needed when both match.
              fit_card_resume_signature: currentResumeSig ?? null,
              fit_card_jd_signature:     job.signature ?? null,
              strengths:     [],
              gaps:          [],
              reasoning:     card.one_liner,
              computed_at:   now,
              seen_at:       null, // a freshly-generated card counts as new
            });
            withFitCard++;
          } catch {
            // Keep deterministic baseline; remaining work continues.
          }
        }
      };

      await Promise.allSettled(
        Array.from({ length: Math.min(FIT_CARD_CONCURRENCY, candidates.length) }, worker),
      );

      if (fitCardRows.length > 0) await batchUpsert(admin, fitCardRows);
    }
  }

  // 9. Stamp last_match_compute_at on the profile.
  await assertComputeJobIsCurrent(admin, {
    userId,
    resumeVersionId: opts.resumeVersionId,
    jobId: opts.jobId,
  });

  let stampQuery = (admin.from("profiles") as any)
    .update({
      last_match_compute_at: now,
      matches_resume_version_id: opts.resumeVersionId ?? profile.active_resume_version_id,
    })
    .eq("id", userId);
  if (opts.resumeVersionId) {
    stampQuery = stampQuery.eq("active_resume_version_id", opts.resumeVersionId);
  }
  const { data: stamped, error: stampError } = await stampQuery.select("id").maybeSingle() as {
    data: { id: string } | null;
    error: { message: string } | null;
  };
  assertNoSupabaseError(stampError, "Could not stamp match compute completion");
  if (!stamped) throw new Error("Resume changed before match computation could be stamped.");

  return {
    total:          validMatches.length,
    new_matches:    newMatchCount,
    skipped:        hardMismatchScored.length,
    ghost_filtered: ghostFiltered.length,
    with_fit_card:  withFitCard,
    unparsed_jobs:  unparsed,
    mode,
    duration_ms:    Date.now() - t0,
  };
}

async function assertComputeJobIsCurrent(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  input: {
    userId: string;
    resumeVersionId?: string | null;
    jobId?: string | null;
  },
): Promise<void> {
  if (input.resumeVersionId) {
    const { data, error } = await (admin
      .from("profiles")
      .select("active_resume_version_id")
      .eq("id", input.userId)
      .maybeSingle() as any) as { data: { active_resume_version_id: string | null } | null; error: { message: string } | null };
    assertNoSupabaseError(error, "Could not verify active resume version");
    if (data?.active_resume_version_id !== input.resumeVersionId) {
      throw new Error("Resume changed before match computation finished.");
    }
  }

  if (input.jobId) {
    const { data, error } = await (admin
      .from("background_jobs")
      .select("status")
      .eq("id", input.jobId)
      .maybeSingle() as any) as { data: { status: string } | null; error: { message: string } | null };
    assertNoSupabaseError(error, "Could not verify match compute job status");
    if (!data || data.status === "cancelled" || data.status === "superseded" || data.status === "failed") {
      throw new Error("Match computation was superseded before it finished.");
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal types + helpers
// ─────────────────────────────────────────────────────────────────────────────

type ExistingMatch = {
  job_id: string;
  score: number;
  verdict: Verdict | null;
  fit_card: Json | null;
  fit_card_at: string | null;
  hidden_reason: string | null;
  score_breakdown: Json | null;
  fit_card_resume_signature: string | null;
  fit_card_jd_signature: string | null;
  user_hidden: boolean;
  computed_at: string;
  seen_at: string | null;
};

type ScoredJob = {
  job: JobRow;
  rules: ReturnType<typeof computeRulesScore> | undefined;
  score: number;
  verdict: Verdict | null;
  hidden_reason: string | null;
  existing: ExistingMatch | undefined;
  rescored: boolean;
  cosine: number | null;
  /** Sprint 6 — re-rank delta applied to baseline rubric total. */
  feedback_adjustment: number;
};

// Two distinct upsert shapes — supabase-js v2 writes every column the row
// object contains, so the Fit-Card second pass must NOT include
// `score_breakdown` (we don't want to clobber what the baseline just wrote).
//
// Sprint 1 Items 3 + 6:
//   - BaselineUpsertRow sets score, verdict, score_breakdown.
//   - FitCardUpsertRow sets fit_card, fit_card_at, signatures, verdict-from-card.
//   - Both never touch user_hidden / hidden_at so user dismisses survive.
type BaselineUpsertRow = {
  user_id: string;
  job_id: string;
  score: number;
  verdict: Verdict | null;
  fit_card: Json | null;
  fit_card_at: string | null;
  hidden_reason: string | null;
  score_breakdown: Json | null;
  /** Sprint 6 fields — null/0 when reusing an existing score row. */
  confidence: number | null;
  hard_cap_reason: string | null;
  tech_coverage: Json | null;
  feedback_adjustment: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  computed_at: string;
  seen_at: string | null;
};

type FitCardUpsertRow = {
  user_id: string;
  job_id: string;
  score: number;
  verdict: Verdict | null;
  fit_card: Json | null;
  fit_card_at: string | null;
  hidden_reason: string | null;
  fit_card_resume_signature: string | null;
  fit_card_jd_signature: string | null;
  strengths: string[];
  gaps: string[];
  reasoning: string;
  computed_at: string;
  seen_at: string | null;
};

async function batchUpsert<T extends Record<string, unknown>>(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  rows: T[],
) {
  const BATCH = 200;
  for (let i = 0; i < rows.length; i += BATCH) {

    const { error } = await admin.from("matches").upsert(rows.slice(i, i + BATCH) as any, {
      onConflict: "user_id,job_id",
    });
    assertNoSupabaseError(error as { message: string } | null, "Could not upsert matches");
  }
}

export type { FitCard };
