// Resume Score — "Will this resume get me a callback?"
//
// Measures five dimensions that directly drive recruiter callback rates,
// grounded in LIVE demand from the 18 approved product companies.
//
// Design principles:
//   1. Stack coverage is the #1 ATS signal — weighted highest.
//   2. Experience signal replaces "product_dna" which was a coaching metric,
//      not a callback predictor. A well-structured experience section at the
//      right seniority gets through ATS screening regardless of company type.
//   3. Impact writing (quantified bullets, action verbs) is the #1 human-
//      readable scan signal for recruiters and hiring managers.
//   4. Role alignment ensures the resume's function maps to stated targets.
//   5. Completeness catches the silent drops — missing sections cause ATS
//      to silently reject resumes even when the candidate is qualified.
//
// Inputs:
//   - parsed resume (ParsedResume)
//   - top-30 most-demanded skill canonicals across active jobs
//   - user's target_role_functions
//
// Outputs:
//   - score 0-100
//   - per-dimension breakdown (user sees why)
//   - 3 actionable tips ranked by impact

import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export type ResumeDimension =
  | "stack_coverage"
  | "impact_writing"
  | "experience_signal"
  | "role_alignment"
  | "completeness";

export interface ResumeBreakdown {
  dimension: ResumeDimension;
  label: string;
  score: number;   // 0..weight
  weight: number;  // max possible
  hint: string;    // ≤160 chars
}

export interface ResumeTip {
  priority: 1 | 2 | 3;
  tip: string;
  why: string;
}

export interface ResumeScoreResult {
  score: number;       // 0..100
  breakdown: ResumeBreakdown[];
  tips: ResumeTip[];
}

// Weights sum to 100.
// Stack coverage highest — it's the ATS pass/fail gate.
// Experience signal replaces product_dna: clear years + progression matters
// at every level and for every company type.
const WEIGHTS: Record<ResumeDimension, number> = {
  stack_coverage:    40,  // ATS keyword match — primary filter
  impact_writing:    20,  // recruiter scan quality
  experience_signal: 20,  // years visible, seniority clear, progression present
  role_alignment:    10,  // resume function → target function match
  completeness:      10,  // structural ATS completeness
};

function normTech(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "").replace(/[.\-_]/g, "").replace(/js$/, "");
}

// Action verbs that signal impact-oriented writing.
const STRONG_VERBS = new Set([
  "led", "built", "shipped", "launched", "designed", "architected", "owned",
  "scaled", "drove", "reduced", "increased", "improved", "optimized", "optimised",
  "migrated", "refactored", "automated", "delivered", "implemented", "developed",
  "created", "spearheaded", "managed", "mentored", "rolled", "partnered",
  "orchestrated", "established", "introduced", "transformed", "deployed",
  "integrated", "accelerated", "enabled", "streamlined",
]);

const METRIC_RE = /\b\d[\d,.]*\s*(%|x|m|k|million|billion|thousand|users?|customers?|requests?|qps|rps|engineers?|teams?|ms|days?|months?|years?|gb|tb|crore|cr|lakh|lakhs?)\b/i;

// ── Dimension scorers ──────────────────────────────────────────────────────

function scoreStackCoverage(
  resume: ParsedResume,
  top30Demand: string[],
): { score: number; covered: number; missing: string[] } {
  const userCanon = new Set((resume.tech_stack ?? []).map(normTech));
  const top30Canon = top30Demand.map(normTech);
  const covered = top30Canon.filter((t) => userCanon.has(t)).length;
  const missing = top30Canon.filter((t) => !userCanon.has(t)).slice(0, 5);

  const dim = WEIGHTS.stack_coverage;
  const ratio = top30Canon.length === 0 ? 0.5 : covered / top30Canon.length;
  // Asymptotic curve: 50% coverage is already strong (scored 0.75×dim),
  // 80%+ is exceptional. Avoids punishing specialists.
  const curved =
    ratio < 0.4
      ? ratio * 1.6              // lower end — steeper lift per skill added
      : 0.64 + (ratio - 0.4) * 0.6;
  return {
    score: Math.min(dim, Math.round(curved * dim)),
    covered,
    missing,
  };
}

function scoreImpactWriting(
  resume: ParsedResume,
): { score: number; metricsFraction: number; verbFraction: number } {
  // Pull all bullet-like text. Parser exposes products_built, summary, role.
  const candidates: string[] = [
    ...(resume.products_built ?? []),
    resume.summary ?? "",
    ...(resume.companies ?? []).map((c) => c.role ?? ""),
  ].filter((s) => s.length > 6);

  if (candidates.length === 0) return { score: 0, metricsFraction: 0, verbFraction: 0 };

  let metricsHits = 0;
  let verbHits = 0;
  for (const line of candidates) {
    if (METRIC_RE.test(line)) metricsHits++;
    const firstWord = (line.toLowerCase().match(/^[a-z]+/) ?? [""])[0];
    if (STRONG_VERBS.has(firstWord)) verbHits++;
  }

  const metricsFraction = metricsHits / candidates.length;
  const verbFraction = verbHits / candidates.length;
  const dim = WEIGHTS.impact_writing;
  // 60% weight on numeric impact, 40% on action-verb leads.
  return {
    score: Math.min(dim, Math.round((metricsFraction * 0.6 + verbFraction * 0.4) * dim)),
    metricsFraction,
    verbFraction,
  };
}

function scoreExperienceSignal(resume: ParsedResume): {
  score: number;
  yearsPresent: boolean;
  hasProgression: boolean;
  companiesCount: number;
} {
  const dim = WEIGHTS.experience_signal;
  const years = resume.total_years_experience ?? 0;
  const companies = resume.companies ?? [];
  const yearsPresent = years > 0;
  const hasProgression = companies.length >= 2;
  const hasSenioritySignal = Boolean(resume.current_role) || Boolean(resume.role_function);

  // Three sub-signals, each contributes proportionally:
  //   - years visible (40%): recruiter/ATS filters on experience bands
  //   - progression (40%): 2+ companies shows career growth
  //   - seniority clarity (20%): current role/title is explicit
  const yearsScore = yearsPresent ? (years >= 1 ? 1.0 : 0.6) : 0.0;
  const progressionScore = companies.length >= 3 ? 1.0 : companies.length === 2 ? 0.7 : 0.3;
  const seniorityScore = hasSenioritySignal ? 1.0 : 0.4;

  const raw = yearsScore * 0.4 + progressionScore * 0.4 + seniorityScore * 0.2;
  return {
    score: Math.min(dim, Math.round(raw * dim)),
    yearsPresent,
    hasProgression,
    companiesCount: companies.length,
  };
}

function scoreRoleAlignment(resume: ParsedResume, userTargets: string[]): { score: number } {
  const dim = WEIGHTS.role_alignment;
  if (!resume.role_function) return { score: Math.round(dim * 0.4) };
  if (userTargets.length === 0) return { score: Math.round(dim * 0.7) };
  if (userTargets.includes(resume.role_function)) return { score: dim };

  // Adjacent roles get partial credit.
  const adjacent: Record<string, string[]> = {
    backend:          ["fullstack"],
    frontend:         ["fullstack"],
    fullstack:        ["backend", "frontend"],
    data_engineering: ["ml_ai"],
    ml_ai:            ["data_engineering"],
    devops_platform:  ["backend"],
  };
  const adj = adjacent[resume.role_function] ?? [];
  if (userTargets.some((t) => adj.includes(t))) return { score: Math.round(dim * 0.6) };
  return { score: Math.round(dim * 0.3) };
}

function scoreCompleteness(resume: ParsedResume): { score: number; missing: string[] } {
  const checks: Array<[boolean, string]> = [
    [Boolean(resume.summary && resume.summary.length > 60),         "professional summary missing or too short"],
    [Boolean(resume.tech_stack && resume.tech_stack.length >= 5),   "skills section sparse (target: ≥5 skills)"],
    [Boolean(resume.companies && resume.companies.length >= 1),     "no work experience listed"],
    [Boolean(resume.education && resume.education.length >= 1),     "education section missing"],
    [Boolean(resume.products_built && resume.products_built.length >= 1), "no product or project bullets"],
  ];
  const passes = checks.filter(([ok]) => ok).length;
  const missing = checks.filter(([ok]) => !ok).map(([, why]) => why);
  return {
    score: Math.round((passes / checks.length) * WEIGHTS.completeness),
    missing,
  };
}

// ── Public entry ────────────────────────────────────────────────────────────

export interface ScoreResumeInput {
  resume: ParsedResume;
  /** Canonical-token list of the most in-demand skills across the 18 companies. */
  top30Demand: string[];
  /** Profile's target_role_functions (drives role_alignment). */
  userTargets: string[];
}

export function computeResumeScore(input: ScoreResumeInput): ResumeScoreResult {
  const stack    = scoreStackCoverage(input.resume, input.top30Demand);
  const impact   = scoreImpactWriting(input.resume);
  const expSig   = scoreExperienceSignal(input.resume);
  const roleAln  = scoreRoleAlignment(input.resume, input.userTargets);
  const complete = scoreCompleteness(input.resume);

  const total =
    stack.score + impact.score + expSig.score + roleAln.score + complete.score;

  const breakdown: ResumeBreakdown[] = [
    {
      dimension: "stack_coverage",
      label: "Skills vs. market demand",
      score: stack.score,
      weight: WEIGHTS.stack_coverage,
      hint: stack.missing.length > 0
        ? `Matches ${stack.covered}/${input.top30Demand.length} top-demand skills. Skills to add: ${stack.missing.slice(0, 3).join(", ")}.`
        : `Matches ${stack.covered}/${input.top30Demand.length} top-demand skills across your 18 target companies.`,
    },
    {
      dimension: "impact_writing",
      label: "Impact writing",
      score: impact.score,
      weight: WEIGHTS.impact_writing,
      hint: `${Math.round(impact.metricsFraction * 100)}% of bullets carry a metric, ${Math.round(impact.verbFraction * 100)}% start with a strong action verb. Recruiters scan for both.`,
    },
    {
      dimension: "experience_signal",
      label: "Experience clarity",
      score: expSig.score,
      weight: WEIGHTS.experience_signal,
      hint: expSig.yearsPresent
        ? `${input.resume.total_years_experience} years extracted. ${expSig.companiesCount} companies listed${expSig.hasProgression ? " — clear progression." : " — add more roles to show growth."}`
        : "Years of experience couldn't be inferred. ATS filters on experience bands — make it explicit.",
    },
    {
      dimension: "role_alignment",
      label: "Role alignment",
      score: roleAln.score,
      weight: WEIGHTS.role_alignment,
      hint: input.resume.role_function
        ? `Identified as: ${input.resume.role_function.replace(/_/g, " ")}. Targets: ${input.userTargets.map(t => t.replace(/_/g, " ")).join(", ") || "(set targets in profile)"}.`
        : "Resume doesn't clearly map to one engineering function — add a clear title / summary.",
    },
    {
      dimension: "completeness",
      label: "Profile completeness",
      score: complete.score,
      weight: WEIGHTS.completeness,
      hint: complete.missing.length > 0
        ? `Sections to add: ${complete.missing.slice(0, 2).join("; ")}.`
        : "All standard sections present — ATS can parse your resume fully.",
    },
  ];

  // Tips — ranked by which dimension lost the most points vs its max.
  const losses = breakdown.map((b) => ({ b, loss: b.weight - b.score }));
  losses.sort((a, b) => b.loss - a.loss);

  const tips: ResumeTip[] = losses.slice(0, 3).map((entry, i) => {
    const priority = (i + 1) as 1 | 2 | 3;
    const { b } = entry;

    let tip: string, why: string;
    switch (b.dimension) {
      case "stack_coverage":
        tip = stack.missing.length > 0
          ? `Add concrete experience with: ${stack.missing.slice(0, 3).join(", ")} — even if brief exposure.`
          : "Your stack already covers top-demand skills — no urgent action.";
        why = "These appear in the most active JDs across your 18 target companies right now. ATS filters on exact keyword match.";
        break;
      case "impact_writing":
        tip = "Rewrite your top 3 bullets: lead with a strong verb (Led / Built / Reduced) and add one number (%, users, ms, ₹).";
        why = "Recruiters spend <10s scanning a resume. Quantified, action-led bullets pass both ATS scoring and the human eye-scan.";
        break;
      case "experience_signal":
        tip = !expSig.yearsPresent
          ? "Ensure your work history has clear date ranges (MM/YYYY) so ATS can compute your total experience."
          : "Add your most recent 1–2 roles if missing — ATS filters on minimum years and career progression.";
        why = "Experience-band filters (e.g., '3+ years') are the most common automatic rejection reason in ATS systems.";
        break;
      case "role_alignment":
        tip = input.userTargets.length === 0
          ? "Set your target roles in Profile → Details so we can score alignment accurately."
          : "Rewrite your most recent job title / summary to clearly reflect your target function.";
        why = "Misalignment between your stated function and target roles confuses both ATS role-classification and recruiter first impressions.";
        break;
      case "completeness":
        tip = complete.missing.length > 0
          ? `Fill in: ${complete.missing.slice(0, 2).join(" and ")}.`
          : "All sections present — focus on content quality instead.";
        why = "Missing sections cause silent ATS parsing failures. A complete structure costs nothing and prevents avoidable drops.";
        break;
    }

    return { priority, tip, why };
  });

  return {
    score: Math.min(100, total),
    breakdown,
    tips,
  };
}
