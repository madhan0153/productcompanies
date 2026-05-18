// Phase G — Resume Score (the "Strength" gauge).
//
// Standalone from match scoring. Answers a different question: "is my resume
// itself any good for what I'm targeting?" Five dimensions, weighted, grounded
// in LIVE demand from the 18 approved product companies (not generic ATS
// rules — that's what makes ours different from Rezi's).
//
// Inputs:
//   - parsed resume (already have)
//   - top-N most-demanded skill canonicals from active jobs (computed in caller)
//
// Outputs:
//   - score 0-100
//   - per-dimension breakdown (transparent — user sees why)
//   - 3 actionable tips, ranked by impact

import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export type ResumeDimension =
  | "stack_coverage"
  | "impact_writing"
  | "product_dna"
  | "recency_fit"
  | "completeness";

export interface ResumeBreakdown {
  dimension: ResumeDimension;
  label: string;
  score: number;       // 0..weight
  weight: number;      // max possible
  hint: string;        // ≤140 chars — why this score, in plain English
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

// Weights sum to 100. Two highest are stack_coverage (the live-demand grounding)
// and impact_writing (Rezi's bullet-quality angle). Both are objectively
// measurable from parsed resume + market signal.
const WEIGHTS: Record<ResumeDimension, number> = {
  stack_coverage: 35,
  impact_writing: 25,
  product_dna:    20,
  recency_fit:    10,
  completeness:   10,
};

function normTech(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "").replace(/[.\-_]/g, "").replace(/js$/, "");
}

// Action verbs that signal an impact-style bullet (vs "responsible for X").
const STRONG_VERBS = new Set([
  "led", "built", "shipped", "launched", "designed", "architected", "owned",
  "scaled", "drove", "reduced", "increased", "improved", "optimized", "optimised",
  "migrated", "refactored", "automated", "delivered", "implemented", "developed",
  "created", "spearheaded", "managed", "mentored", "rolled", "partnered",
  "orchestrated", "established", "introduced", "transformed",
]);

function scoreImpactWriting(resume: ParsedResume): { score: number; metricsFraction: number; verbFraction: number } {
  // Pull all bullet-like text from resume_parsed. The parser doesn't currently
  // expose raw bullets, so we proxy from products_built + summary + companies.
  const candidates: string[] = [
    ...(resume.products_built ?? []),
    resume.summary ?? "",
    ...(resume.companies ?? []).map((c) => c.role ?? ""),
  ].filter((s) => s.length > 6);

  if (candidates.length === 0) return { score: 0, metricsFraction: 0, verbFraction: 0 };

  let metricsHits = 0;
  let verbHits = 0;
  for (const line of candidates) {
    const lower = line.toLowerCase();
    // Numeric impact: "reduced X by 40%", "1M users", "$5M ARR", "10x", "p99 200ms"
    if (/\b\d[\d,.]*\s*(%|x|m|k|million|thousand|users?|requests?|qps|rps|engineers?|teams?|days?|months?|ms|ns|µs|seconds?|gb|tb)\b/i.test(line)) {
      metricsHits++;
    }
    // Strong opener
    const firstWord = (lower.match(/^[a-z]+/) ?? [""])[0];
    if (STRONG_VERBS.has(firstWord)) verbHits++;
  }

  const metricsFraction = metricsHits / candidates.length;
  const verbFraction = verbHits / candidates.length;

  // 60% weight on numeric impact, 40% on action-verb leads.
  const dim = WEIGHTS.impact_writing;
  const score = Math.round((metricsFraction * 0.6 + verbFraction * 0.4) * dim);
  return { score: Math.min(dim, score), metricsFraction, verbFraction };
}

function scoreStackCoverage(resume: ParsedResume, top30Demand: string[]): { score: number; covered: number; missing: string[] } {
  const userCanon = new Set((resume.tech_stack ?? []).map(normTech));
  const top30Canon = top30Demand.map(normTech);
  const covered = top30Canon.filter((t) => userCanon.has(t)).length;
  const missing = top30Canon.filter((t) => !userCanon.has(t)).slice(0, 5);

  const dim = WEIGHTS.stack_coverage;
  // Asymptotic — 50% coverage is already strong, 80%+ is exceptional.
  const ratio = top30Canon.length === 0 ? 0.5 : covered / top30Canon.length;
  const curved = ratio < 0.4
    ? ratio * 1.5
    : 0.6 + (ratio - 0.4) * 0.66; // smoother slope above 40%
  return {
    score: Math.min(dim, Math.round(curved * dim)),
    covered,
    missing,
  };
}

function scoreProductDna(resume: ParsedResume): { score: number } {
  // resume_parsed already has product_dna_score 0-100; rescale to weight.
  const raw = resume.product_dna_score ?? 50;
  return { score: Math.round((raw / 100) * WEIGHTS.product_dna) };
}

function scoreRecencyFit(resume: ParsedResume, userTargets: string[]): { score: number } {
  const dim = WEIGHTS.recency_fit;
  // Heuristic: if resume's role_function is in user's target set → full marks.
  // If adjacent → half. If neither → 30%.
  if (!resume.role_function) return { score: Math.round(dim * 0.5) };
  if (userTargets.length === 0) return { score: Math.round(dim * 0.7) };
  if (userTargets.includes(resume.role_function)) return { score: dim };

  const adjacent: Record<string, string[]> = {
    backend: ["fullstack"], frontend: ["fullstack"],
    fullstack: ["backend", "frontend"],
    data_engineering: ["ml_ai"], ml_ai: ["data_engineering"],
    devops_platform: ["backend"],
  };
  const adj = adjacent[resume.role_function] ?? [];
  if (userTargets.some((t) => adj.includes(t))) return { score: Math.round(dim * 0.5) };
  return { score: Math.round(dim * 0.3) };
}

function scoreCompleteness(resume: ParsedResume): { score: number; missing: string[] } {
  const checks: Array<[boolean, string]> = [
    [Boolean(resume.summary && resume.summary.length > 60), "no professional summary"],
    [Boolean(resume.tech_stack && resume.tech_stack.length >= 5), "skills section sparse"],
    [Boolean(resume.companies && resume.companies.length >= 2), "fewer than 2 companies"],
    [Boolean(resume.education && resume.education.length >= 1), "education missing"],
    [Boolean(resume.products_built && resume.products_built.length >= 2), "fewer than 2 product impact bullets"],
  ];
  const passes = checks.filter(([ok]) => ok).length;
  const missing = checks.filter(([ok]) => !ok).map(([, why]) => why);
  return {
    score: Math.round((passes / checks.length) * WEIGHTS.completeness),
    missing,
  };
}

export interface ScoreResumeInput {
  resume: ParsedResume;
  /** Canonical-token list of the most in-demand skills across the 18 companies. */
  top30Demand: string[];
  /** Profile's target_role_functions (drives recency_fit). */
  userTargets: string[];
}

export function computeResumeScore(input: ScoreResumeInput): ResumeScoreResult {
  const stack = scoreStackCoverage(input.resume, input.top30Demand);
  const impact = scoreImpactWriting(input.resume);
  const dna = scoreProductDna(input.resume);
  const recency = scoreRecencyFit(input.resume, input.userTargets);
  const complete = scoreCompleteness(input.resume);

  const total = stack.score + impact.score + dna.score + recency.score + complete.score;

  const breakdown: ResumeBreakdown[] = [
    {
      dimension: "stack_coverage",
      label: "Stack coverage",
      score: stack.score,
      weight: WEIGHTS.stack_coverage,
      hint: stack.missing.length > 0
        ? `Covers ${stack.covered}/${input.top30Demand.length} top-demand skills. Missing: ${stack.missing.slice(0, 3).join(", ")}.`
        : `Covers ${stack.covered}/${input.top30Demand.length} top-demand skills.`,
    },
    {
      dimension: "impact_writing",
      label: "Impact writing",
      score: impact.score,
      weight: WEIGHTS.impact_writing,
      hint: `${Math.round(impact.metricsFraction * 100)}% of bullets carry a metric, ${Math.round(impact.verbFraction * 100)}% start with a strong verb.`,
    },
    {
      dimension: "product_dna",
      label: "Product-Co Readiness",
      score: dna.score,
      weight: WEIGHTS.product_dna,
      hint: `${input.resume.product_dna_score ?? 50}/100 — built from product-co exposure, scale signals, modern stack, and ownership language. A coaching signal; not a gate.`,
    },
    {
      dimension: "recency_fit",
      label: "Recency × targets",
      score: recency.score,
      weight: WEIGHTS.recency_fit,
      hint: input.resume.role_function
        ? `Recent role: ${input.resume.role_function}. Targets: ${input.userTargets.join(", ") || "(set targets in profile)"}.`
        : "Resume's recent role function couldn't be inferred.",
    },
    {
      dimension: "completeness",
      label: "Completeness",
      score: complete.score,
      weight: WEIGHTS.completeness,
      hint: complete.missing.length > 0
        ? `Sections to fix: ${complete.missing.join("; ")}.`
        : "All standard sections present.",
    },
  ];

  // Tips — ranked by which dimension lost the most points.
  const losses = breakdown.map((b) => ({ b, loss: b.weight - b.score }));
  losses.sort((a, b) => b.loss - a.loss);

  const tips: ResumeTip[] = losses.slice(0, 3).map((entry, i) => {
    const priority = (i + 1) as 1 | 2 | 3;
    const { b } = entry;

    let tip: string, why: string;
    switch (b.dimension) {
      case "stack_coverage":
        tip = stack.missing.length > 0
          ? `Add concrete experience with: ${stack.missing.slice(0, 3).join(", ")}.`
          : "Already covers top-demand stack — no action needed.";
        why = "These appear in the most active JDs across your 18 target companies right now.";
        break;
      case "impact_writing":
        tip = "Rewrite three bullets to lead with a strong verb and quantify (% / users / latency / revenue).";
        why = "ATS scoring + recruiter scan time both reward measurable verbs over passive duties.";
        break;
      case "product_dna":
        tip = "Lead with product-impact framing: \"Shipped X to Y users\" before \"Worked on Z.\"";
        why = "Product companies hire for scope of impact, not job title.";
        break;
      case "recency_fit":
        tip = "Update target_role_functions in profile, OR rewrite recent bullets to map to your target function.";
        why = "Mismatch between recent role and stated targets confuses both rules and Gemini.";
        break;
      case "completeness":
        tip = `Fill in: ${complete.missing.slice(0, 2).join(" + ")}.`;
        why = "Completion lift is cheap; missing sections cause silent drops in ATS parsing.";
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
