import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

import { calibrateMatch } from "../lib/matching/calibrate";
import { computeRulesScore } from "../lib/matching/score";
import { cosineSimilarity } from "../lib/llm/embed";

const explicitUserId = process.argv[2] ?? null;

const envPath = path.resolve(".env.local");
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) {
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

type JobRow = Record<string, any>;
type MatchRow = Record<string, any>;

async function pickUser(): Promise<string> {
  if (explicitUserId) return explicitUserId;

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, resume_parsed")
    .not("resume_parsed", "is", null)
    .limit(100);
  if (error) throw error;

  let best: { id: string; count: number } | null = null;
  for (const p of profiles ?? []) {
    const { count } = await supabase
      .from("matches")
      .select("job_id", { count: "exact", head: true })
      .eq("user_id", p.id);
    if (!best || (count ?? 0) > best.count) best = { id: p.id, count: count ?? 0 };
  }
  if (!best) throw new Error("No parsed users with matches found.");
  return best.id;
}

async function fetchAllActiveJobs(): Promise<JobRow[]> {
  const all: JobRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("jobs")
      .select(
        "id,title,description,hubs,min_experience_years,max_experience_years,comp_lpa_min,comp_lpa_max,tech_stack,seniority,location,company_id,role_function,role_function_jd,must_have_skills,nice_to_have_skills,jd_min_years,jd_max_years,jd_seniority_signal,jd_summary,is_likely_ghost,jd_parsed_at,embedding,embedding_at,signature,quality_score,is_active,companies(name,slug)",
      )
      .eq("is_active", true)
      .range(from, from + 999);
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

async function fetchAllStoredMatches(userId: string): Promise<MatchRow[]> {
  const all: MatchRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("matches")
      .select(
        "job_id,score,verdict,hidden_reason,user_hidden,confidence,hard_cap_reason,tech_coverage,score_breakdown,feedback_adjustment,fit_card,fit_card_at,computed_at,jobs(id,title,role_function,role_function_jd,jd_seniority_signal,seniority,jd_min_years,jd_max_years,min_experience_years,max_experience_years,must_have_skills,nice_to_have_skills,is_likely_ghost,quality_score,jd_parsed_at,companies(name,slug))",
      )
      .eq("user_id", userId)
      .order("score", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    const batch = data ?? [];
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

function by<T>(arr: T[], fn: (x: T) => string): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, x) => {
    const k = fn(x);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function calibrateJobInput(job: JobRow) {
  return {
    title: job.title,
    description: job.description ?? "",
    quality_score: typeof job.quality_score === "number" ? job.quality_score : 100,
    jd_parsed_at: job.jd_parsed_at,
    jd_summary: job.jd_summary,
    role_function_jd: job.role_function_jd,
    must_have_skills: job.must_have_skills ?? [],
    nice_to_have_skills: job.nice_to_have_skills ?? [],
    tech_stack: job.tech_stack ?? [],
    is_likely_ghost: Boolean(job.is_likely_ghost),
  };
}

function publicJob(job: JobRow, extra: Record<string, unknown> = {}) {
  return {
    company: job.companies?.slug ?? "?",
    title: String(job.title ?? "").slice(0, 90),
    role: job.role_function ?? job.role_function_jd ?? null,
    seniority: job.jd_seniority_signal ?? job.seniority ?? null,
    years: `${job.jd_min_years ?? job.min_experience_years ?? "?"}-${job.jd_max_years ?? job.max_experience_years ?? "?"}`,
    must: (job.must_have_skills ?? []).slice(0, 8),
    ...extra,
  };
}

async function main() {
  const userId = await pickUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,years_experience,current_lpa,target_lpa,preferred_hubs,tech_stack,seniority,target_role_functions,role_function,resume_parsed,resume_embedding,resume_embedding_at,last_match_compute_at,resume_storage_path,resume_signature",
    )
    .eq("id", userId)
    .single();
  if (profileError) throw profileError;

  const storedMatches = await fetchAllStoredMatches(userId);

  const jobs = await fetchAllActiveJobs();
  const profileInput = {
    target_role_functions: profile.target_role_functions ?? [],
    years_experience: profile.years_experience,
    tech_stack: profile.tech_stack ?? [],
    seniority: profile.seniority,
    preferred_hubs: profile.preferred_hubs ?? [],
    target_lpa: profile.target_lpa,
  };

  const scored = jobs
    .map((job) => {
      const cosine = profile.resume_embedding && job.embedding
        ? cosineSimilarity(profile.resume_embedding, job.embedding)
        : null;
      const rules = computeRulesScore(profileInput, {
        title: job.title,
        description: job.description ?? "",
        role_function: job.role_function ?? (job.role_function_jd === "other" ? null : job.role_function_jd),
        semantic_cosine: cosine,
        min_experience_years: job.min_experience_years,
        max_experience_years: job.max_experience_years,
        jd_min_years: job.jd_min_years,
        jd_max_years: job.jd_max_years,
        tech_stack: job.tech_stack ?? [],
        must_have_skills: job.must_have_skills ?? [],
        nice_to_have_skills: job.nice_to_have_skills ?? [],
        seniority: job.seniority,
        jd_seniority_signal: job.jd_seniority_signal,
        hubs: job.hubs ?? [],
        comp_lpa_max: job.comp_lpa_max,
      });
      const calibrated = calibrateMatch({
        job: calibrateJobInput(job),
        rules,
        baseScore: rules.total,
      });
      return {
        job,
        rules,
        score: calibrated.score,
        verdict: calibrated.verdict,
        hidden: calibrated.hidden_reason,
        cosine,
      };
    })
    .sort((a, b) => b.score - a.score);

  const storedByJob = new Map((storedMatches ?? []).map((m: MatchRow) => [m.job_id, m]));
  const visibleStored = (storedMatches ?? []).filter((m: MatchRow) => !m.hidden_reason && !m.user_hidden);
  const storedTop = visibleStored.slice(0, 40);
  const activeHighQuality = jobs.filter((job) => (job.quality_score ?? 100) >= 40);
  const freshVisible = scored.filter(
    (s) => !s.rules.hardMismatch && !s.job.is_likely_ghost && !s.hidden && (s.job.quality_score ?? 100) >= 40,
  );
  const freshTop = freshVisible.slice(0, 40);
  const storedTopIds = new Set(storedTop.map((m: MatchRow) => m.job_id));
  const freshTopMissing = freshTop.filter((s) => !storedByJob.has(s.job.id));

  const largeScoreDeltas = scored
    .filter((s) => storedByJob.has(s.job.id))
    .map((s) => ({
      s,
      stored: storedByJob.get(s.job.id) as MatchRow,
      delta: s.score - (storedByJob.get(s.job.id) as MatchRow).score,
    }))
    .filter((x) => Math.abs(x.delta) >= 8)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 12);

  const storedVisibleNowHidden = visibleStored
    .map((m: MatchRow) => ({ m, sc: scored.find((s) => s.job.id === m.job_id) }))
    .filter(({ sc }) => sc && (sc.rules.hardMismatch || sc.job.is_likely_ghost || sc.hidden))
    .slice(0, 12);

  const parsed = profile.resume_parsed ?? {};
  const result = {
    auditedUser: {
      anonymizedId: userId.slice(0, 8),
      years_experience: profile.years_experience,
      role_function: profile.role_function,
      target_role_functions: profile.target_role_functions,
      seniority: profile.seniority,
      preferred_hubs: profile.preferred_hubs,
      tech_stack_count: (profile.tech_stack ?? []).length,
      tech_stack_sample: (profile.tech_stack ?? []).slice(0, 18),
      resumeParsedSignals: {
        current_role_present: Boolean(parsed.current_role),
        total_years_experience: parsed.total_years_experience,
        product_dna_score: parsed.product_dna_score,
        parsed_role_function: parsed.role_function,
        parsed_targets: parsed.target_role_functions,
        parsed_tech_count: (parsed.tech_stack ?? []).length,
        parsed_company_count: (parsed.companies ?? []).length,
      },
      has_resume_storage_path: Boolean(profile.resume_storage_path),
      has_resume_embedding: Array.isArray(profile.resume_embedding),
      last_match_compute_at: profile.last_match_compute_at,
    },
    databaseCoverage: {
      active: jobs.length,
      activeHighQuality: activeHighQuality.length,
      lowQualityHiddenByEngine: jobs.length - activeHighQuality.length,
      jdParsed: jobs.filter((job) => job.jd_parsed_at).length,
      withEmbedding: jobs.filter((job) => Array.isArray(job.embedding)).length,
      ghostFlagged: jobs.filter((job) => job.is_likely_ghost).length,
    },
    storedMatches: {
      totalRows: (storedMatches ?? []).length,
      visibleRows: visibleStored.length,
      hiddenReasons: by(storedMatches ?? [], (m: MatchRow) => m.hidden_reason ?? "visible"),
      strongByStoredScore: visibleStored.filter((m: MatchRow) => (m.score ?? 0) >= 75).length,
      top40RoleCounts: by(storedTop, (m: MatchRow) => m.jobs?.role_function ?? m.jobs?.role_function_jd ?? "unknown"),
      top10: storedTop.slice(0, 10).map((m: MatchRow) => publicJob(m.jobs, {
        storedScore: Math.round(m.score),
        verdict: m.verdict,
        confidence: m.confidence,
        hardCap: m.hard_cap_reason,
        directTech: m.tech_coverage?.direct?.slice?.(0, 5) ?? [],
      })),
    },
    freshCurrentLogic: {
      visibleRows: freshVisible.length,
      strongByFreshScore: freshVisible.filter((s) => s.score >= 75).length,
      hardMismatchReasons: by(scored.filter((s) => s.rules.hardMismatch), (s) => s.rules.hardMismatchReason ?? "unknown"),
      top40RoleCounts: by(freshTop, (s) => s.job.role_function ?? s.job.role_function_jd ?? "unknown"),
      top10: freshTop.slice(0, 10).map((s) => publicJob(s.job, {
        freshScore: Math.round(s.score),
        raw: s.rules.totalRaw,
        verdict: s.verdict,
        confidence: s.rules.confidence,
        hardCap: s.rules.hardCapReason,
        breakdown: s.rules.breakdown,
        cosine: s.cosine == null ? null : Number(s.cosine.toFixed(3)),
        directTech: s.rules.techCoverage?.direct?.slice?.(0, 5) ?? [],
        adjacentTech: s.rules.techCoverage?.adjacent?.slice?.(0, 5) ?? [],
        missingTech: s.rules.techCoverage?.missing?.slice?.(0, 5) ?? [],
      })),
    },
    driftAndFlaws: {
      freshTop40MissingFromStored: freshTopMissing.slice(0, 10).map((s) => publicJob(s.job, {
        freshScore: Math.round(s.score),
        hardCap: s.rules.hardCapReason,
        breakdown: s.rules.breakdown,
      })),
      storedVisibleNowWouldBeHidden: storedVisibleNowHidden.map(({ m, sc }) => publicJob(sc!.job, {
        storedScore: Math.round(m.score),
        freshScore: Math.round(sc!.score),
        nowHardMismatch: sc!.rules.hardMismatchReason,
        nowHidden: sc!.hidden,
        ghost: sc!.job.is_likely_ghost,
      })),
      largeScoreDeltas: largeScoreDeltas.map(({ s, stored, delta }) => publicJob(s.job, {
        storedScore: Math.round(stored.score),
        freshScore: Math.round(s.score),
        delta: Math.round(delta),
        storedVerdict: stored.verdict,
        freshVerdict: s.verdict,
        hardCap: s.rules.hardCapReason,
        breakdown: s.rules.breakdown,
      })),
      freshTop40OverlapStoredTop40: freshTop.filter((s) => storedTopIds.has(s.job.id)).length,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
