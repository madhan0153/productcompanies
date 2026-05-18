// Deterministic ATS scorecard (Step 3 of the Resume Intelligence pipeline).
//
// Computes a 0-100 ATS-readability score WITHOUT any LLM call, so it's
// instant and free. The score reflects structural fitness for automated
// resume screening systems used by the 18 approved product companies:
//   - Section presence (Contact / Summary / Skills / Experience / Education)
//   - Heading hygiene (no fancy unicode / column layouts / images)
//   - Keyword density per role function
//   - Date format consistency
//   - Verb diversity
//   - Bullet quantification ratio
//
// The same scorer runs on the source resume (ats_before) and on the
// finalised enhanced/tailored resume (ats_after), so the user sees a real
// before-vs-after delta — not a Gemini guess.

import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export type AtsAxisId =
  | "sections_present"
  | "heading_hygiene"
  | "keyword_density"
  | "date_format_consistency"
  | "verb_diversity"
  | "bullet_quantification";

export interface AtsAxisScore {
  axis: AtsAxisId;
  label: string;
  score: number;     // 0..weight
  weight: number;    // max points for this axis
  /** ≤ 140 chars, plain English — what was measured. */
  hint: string;
  /** Optional list of concrete items, e.g. missing sections. */
  details?: string[];
}

export interface AtsScorecard {
  total: number;     // 0..100
  grade: "A" | "B" | "C" | "D";
  axes: AtsAxisScore[];
  generated_at: string;
}

// Weights sum to 100.
const WEIGHTS: Record<AtsAxisId, number> = {
  sections_present:       22,
  heading_hygiene:        14,
  keyword_density:        24,
  date_format_consistency:10,
  verb_diversity:         12,
  bullet_quantification:  18,
};

// Strong action verbs — diversity matters; the same verb on every bullet
// is an ATS smell.
const STRONG_VERBS = new Set([
  "led", "owned", "architected", "designed", "drove", "spearheaded",
  "launched", "shipped", "delivered", "scaled", "built", "introduced",
  "automated", "optimized", "optimised", "reduced", "improved",
  "implemented", "developed", "engineered", "deployed", "migrated",
  "refactored", "mentored", "managed", "established", "orchestrated",
  "rolled", "transformed", "modernized", "modernised", "instrumented",
  "secured", "hardened", "tuned", "rebuilt", "rewrote", "consolidated",
]);

// Role-function → required keyword pools. Pure heuristic, kept compact.
// Cross-referenced against the same TECH_DOMAINS map used in scoring.
const ROLE_KEYWORDS: Record<string, string[]> = {
  qa_sdet:                ["automation", "selenium", "playwright", "cypress", "appium", "pytest", "junit", "ci/cd", "regression", "framework"],
  backend:                ["api", "rest", "microservices", "database", "sql", "caching", "scalability", "latency", "throughput", "distributed"],
  frontend:               ["react", "typescript", "accessibility", "responsive", "performance", "ui", "ux", "state management", "component", "css"],
  fullstack:              ["api", "react", "node", "database", "deployment", "ci/cd", "frontend", "backend", "responsive"],
  data_engineering:       ["etl", "pipeline", "spark", "kafka", "airflow", "snowflake", "warehouse", "orchestration", "data quality", "dbt"],
  ml_ai:                  ["model", "training", "inference", "feature engineering", "pytorch", "tensorflow", "embedding", "evaluation", "deployment"],
  devops_platform:        ["kubernetes", "docker", "terraform", "ci/cd", "observability", "sli", "slo", "incident", "automation", "infrastructure"],
  mobile:                 ["ios", "android", "swift", "kotlin", "react native", "flutter", "performance", "play store", "app store", "offline"],
  engineering_management: ["team", "hiring", "mentoring", "roadmap", "stakeholder", "delivery", "performance", "metrics", "okr", "1:1"],
  security:               ["threat model", "owasp", "appsec", "iam", "encryption", "audit", "incident response", "vulnerability", "penetration"],
  product_management:     ["roadmap", "prioritisation", "user research", "metrics", "okr", "stakeholder", "experiment", "north star", "kpi"],
  design:                 ["wireframe", "prototype", "user research", "design system", "figma", "accessibility", "interaction", "usability"],
  other:                  [],
};

// A "fancy" / ATS-hostile character pattern: unicode bullets, decorative
// dashes, emoji, multi-column layout markers, table glyphs.
const FANCY_CHAR_RE = /[•●◦‣⁃∙—–…“”‘’]/g;
const EMOJI_RE = /[\p{Extended_Pictographic}]/gu;

// Date patterns we accept. Stricter check than "any number".
const MONTH_YEAR_RE = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{4}\b/i;
const YEAR_RANGE_RE = /\b\d{4}\s*[-–—to ]+\s*(\d{4}|present|current)\b/i;

interface AtsInput {
  resume: ParsedResume;
  /** Raw extracted resume text — used for heading-hygiene and patterns. */
  resume_text: string;
  /** Candidate's canonical role function — drives the keyword pool. */
  role_function: string | null;
  /** Optional override keyword pool (Capability B passes JD must-haves here). */
  required_keywords?: string[];
}

function scoreSectionsPresent(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.sections_present;
  const text = input.resume_text.toLowerCase();
  const sections = {
    contact:    /\b(email|phone|linkedin|github)\b/i.test(input.resume_text),
    summary:    Boolean(input.resume.summary && input.resume.summary.trim().length > 24),
    skills:     (input.resume.tech_stack ?? []).length > 0,
    experience: (input.resume.companies ?? []).length > 0,
    education:  (input.resume.education ?? []).length > 0,
  };
  const found = Object.values(sections).filter(Boolean).length;
  const missing = (Object.entries(sections) as [string, boolean][])
    .filter(([, present]) => !present)
    .map(([name]) => name);

  // Linear scaling: 5 sections present = full marks.
  const score = Math.round((found / 5) * weight);
  void text;
  return {
    axis: "sections_present",
    label: "Standard sections present",
    score,
    weight,
    hint: missing.length === 0
      ? "All 5 standard sections detected (contact, summary, skills, experience, education)."
      : `Missing or weak: ${missing.join(", ")}. ATS parsers expect these sections by name.`,
    details: missing,
  };
}

function scoreHeadingHygiene(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.heading_hygiene;
  const text = input.resume_text;
  const fancyCount = (text.match(FANCY_CHAR_RE) ?? []).length;
  const emojiCount = (text.match(EMOJI_RE) ?? []).length;

  // Heuristics: counts normalised per 1000 chars to avoid penalising long
  // resumes. Ten or fewer fancy chars per 1000 = OK.
  const per1000 = text.length > 0 ? (fancyCount / text.length) * 1000 : 0;
  const emojiPer1000 = text.length > 0 ? (emojiCount / text.length) * 1000 : 0;

  let score = weight;
  const issues: string[] = [];
  if (per1000 > 10) { score -= 6; issues.push(`${fancyCount} decorative glyphs (curly quotes, em-dashes, bullet ornaments)`); }
  if (emojiPer1000 > 0) { score -= 4; issues.push(`${emojiCount} emoji — most ATS parsers strip these`); }
  // Two-column layout signature — many resumes paste these as side-by-side
  // sections that read as gibberish when ATS extracts text linearly.
  if (/\n[^\n]{0,30}\t[^\n]{0,80}\t[^\n]{0,80}\n/.test(text)) {
    score -= 4;
    issues.push("Tab-separated columns detected — flatten to single-column for ATS");
  }
  score = Math.max(0, score);

  return {
    axis: "heading_hygiene",
    label: "Heading & character hygiene",
    score: Math.round(score),
    weight,
    hint: issues.length === 0
      ? "Clean plain-text formatting — ATS parsers should read this correctly."
      : issues.join(". "),
    details: issues,
  };
}

function scoreKeywordDensity(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.keyword_density;
  const fn = input.role_function ?? "other";
  const required = (input.required_keywords && input.required_keywords.length > 0)
    ? input.required_keywords
    : (ROLE_KEYWORDS[fn] ?? []);

  if (required.length === 0) {
    return {
      axis: "keyword_density",
      label: "Role-keyword coverage",
      score: Math.round(weight * 0.6),
      weight,
      hint: "No reference keyword pool — using neutral mid-score.",
    };
  }

  const text = input.resume_text.toLowerCase();
  const stack = (input.resume.tech_stack ?? []).map((s) => s.toLowerCase());
  const hits = required.filter((kw) => {
    const k = kw.toLowerCase();
    return text.includes(k) || stack.includes(k);
  });
  const missing = required.filter((kw) => !hits.includes(kw)).slice(0, 8);

  // 70% coverage saturates the axis — anything more is bullet stuffing.
  const fraction = Math.min(1, hits.length / Math.max(1, required.length * 0.7));
  const score = Math.round(fraction * weight);

  return {
    axis: "keyword_density",
    label: "Role-keyword coverage",
    score,
    weight,
    hint: missing.length === 0
      ? `Strong coverage of ${required.length} expected keywords for this role.`
      : `Covered ${hits.length} of ${required.length}. Surface where genuinely true: ${missing.slice(0, 5).join(", ")}.`,
    details: missing,
  };
}

function scoreDateFormatConsistency(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.date_format_consistency;
  const text = input.resume_text;
  const monthYearHits = (text.match(MONTH_YEAR_RE) ?? []).length;
  const rangeHits = (text.match(YEAR_RANGE_RE) ?? []).length;
  const expectedRoles = (input.resume.companies ?? []).length;

  if (expectedRoles === 0) {
    return {
      axis: "date_format_consistency",
      label: "Date format consistency",
      score: Math.round(weight * 0.5),
      weight,
      hint: "No work history to check.",
    };
  }
  const coverage = (monthYearHits + rangeHits) / Math.max(1, expectedRoles * 2);
  const score = Math.round(Math.min(1, coverage) * weight);

  return {
    axis: "date_format_consistency",
    label: "Date format consistency",
    score,
    weight,
    hint: score >= weight * 0.75
      ? "Date formatting is consistent and ATS-readable."
      : "Standardise dates to 'MMM YYYY' (e.g. 'Jan 2023 – Present') across all roles.",
  };
}

function scoreVerbDiversity(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.verb_diversity;
  // Pull first-token verbs from products_built — the closest we have to
  // structured bullets without re-parsing the PDF.
  const bullets = [
    ...(input.resume.products_built ?? []),
    input.resume.summary ?? "",
  ].filter((s) => s.trim().length > 4);

  if (bullets.length === 0) {
    return {
      axis: "verb_diversity",
      label: "Verb diversity",
      score: Math.round(weight * 0.4),
      weight,
      hint: "No bullet-style content found to evaluate verb diversity.",
    };
  }

  const verbCounts = new Map<string, number>();
  for (const b of bullets) {
    const first = b.toLowerCase().match(/^[a-z]+/);
    if (!first) continue;
    const v = first[0];
    if (!STRONG_VERBS.has(v)) continue;
    verbCounts.set(v, (verbCounts.get(v) ?? 0) + 1);
  }
  const uniqueVerbs = verbCounts.size;
  const total = bullets.length;

  // Want at least one strong verb per ~3 bullets, all distinct ideally.
  const diversityScore = Math.min(1, uniqueVerbs / Math.max(1, Math.min(total, 6)));
  const score = Math.round(diversityScore * weight);

  return {
    axis: "verb_diversity",
    label: "Verb diversity",
    score,
    weight,
    hint: uniqueVerbs >= 5
      ? `${uniqueVerbs} distinct strong action verbs across ${total} bullets.`
      : "Vary lead verbs — repeating 'led' or 'developed' across roles weakens impact.",
  };
}

function scoreBulletQuantification(input: AtsInput): AtsAxisScore {
  const weight = WEIGHTS.bullet_quantification;
  const bullets = [
    ...(input.resume.products_built ?? []),
    input.resume.summary ?? "",
  ].filter((s) => s.trim().length > 4);

  if (bullets.length === 0) {
    return {
      axis: "bullet_quantification",
      label: "Quantified impact",
      score: 0,
      weight,
      hint: "No bullets found to evaluate quantification.",
    };
  }

  const hits = bullets.filter((b) => /\d/.test(b)).length;
  // 40% quantification saturates — over-quantification hurts readability.
  const fraction = Math.min(1, hits / Math.max(1, bullets.length * 0.4));
  const score = Math.round(fraction * weight);

  return {
    axis: "bullet_quantification",
    label: "Quantified impact",
    score,
    weight,
    hint: hits === 0
      ? "Few quantified outcomes. Add scale (users, revenue, latency, throughput) where true."
      : `${hits} of ${bullets.length} bullets carry numeric impact.`,
  };
}

function gradeFor(total: number): AtsScorecard["grade"] {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  return "D";
}

export function computeAtsScorecard(input: AtsInput): AtsScorecard {
  const axes = [
    scoreSectionsPresent(input),
    scoreHeadingHygiene(input),
    scoreKeywordDensity(input),
    scoreDateFormatConsistency(input),
    scoreVerbDiversity(input),
    scoreBulletQuantification(input),
  ];
  const total = axes.reduce((s, a) => s + a.score, 0);
  return {
    total: Math.max(0, Math.min(100, total)),
    grade: gradeFor(total),
    axes,
    generated_at: new Date().toISOString(),
  };
}
