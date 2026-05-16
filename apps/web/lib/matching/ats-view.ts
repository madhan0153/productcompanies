// Sprint 5 — Feature 34b. "What the recruiter sees".
//
// Deterministic, no-LLM. Given the candidate's parsed resume and the JD's
// parsed must/nice-to-have skills, produces a synthetic ATS view: each
// required keyword classified as PRESENT / WEAK / MISSING, plus a
// formatting + structure check that mirrors what real ATS systems flag.
//
// Why deterministic:
//   - The user clicks "What the recruiter sees" on dozens of roles; LLM
//     cost per role would be prohibitive.
//   - The output must be reproducible — the same resume × JD pair should
//     always render the same view so the user can track what changes
//     after they edit their resume.
//   - Real ATS systems (Workday, Greenhouse, iCIMS) themselves use
//     keyword + regex matching, not LLMs. Mirroring that behavior is the
//     whole point.

import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";

export type KeywordStatus = "present" | "weak" | "missing";

export interface KeywordRow {
  keyword: string;          // the JD-stated phrase
  status: KeywordStatus;
  /** Where on the resume the match was found, when present.
   *  "Tech stack" — appears in the skills list.
   *  "Bullet: <first 80 chars>" — appears in a product/role bullet.
   *  "Summary" — appears in the professional summary.
   *  null when missing entirely. */
  evidence: string | null;
}

export interface AtsCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface AtsView {
  /** 0-100 — composite of keyword coverage + structural checks. */
  ats_score: number;
  /** must-haves analysis */
  must_haves: KeywordRow[];
  /** nice-to-haves analysis */
  nice_to_haves: KeywordRow[];
  /** Structural / format checks an ATS would actually flag. */
  checks: AtsCheck[];
  /** Summary numbers for the headline strip. */
  summary: {
    must_present: number;
    must_total: number;
    nice_present: number;
    nice_total: number;
    must_coverage_pct: number;     // must_present / must_total * 100
    nice_coverage_pct: number;
    bullets_with_metrics: number;
    bullets_total: number;
  };
}

// ── normalisation ────────────────────────────────────────────────────────────

// "ReactJS" / "react.js" / "React" → "react"
function norm(t: string): string {
  return t
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .replace(/[.\-_/+]/g, "")
    .replace(/js$/, "")
    .trim();
}

// Build a corpus of normalised tokens to search.
function buildHaystack(resume: ParsedResume): {
  stackTokens: Set<string>;
  bulletText: string;       // joined product bullets, lowercase
  summaryText: string;
  rawBullets: string[];
} {
  const stack = new Set<string>();
  for (const t of resume.tech_stack ?? []) stack.add(norm(t));
  const bullets = (resume.products_built ?? []).filter(Boolean);
  return {
    stackTokens: stack,
    bulletText: bullets.join("\n").toLowerCase(),
    summaryText: (resume.summary ?? "").toLowerCase(),
    rawBullets: bullets,
  };
}

// Decide PRESENT vs WEAK vs MISSING for a single keyword.
//   PRESENT   — keyword appears in the candidate's tech_stack (skills list).
//   WEAK      — keyword is mentioned in bullets or summary but isn't in the
//               skills list. Recruiter / ATS may parse it, but a strict
//               keyword scorer won't.
//   MISSING   — keyword appears nowhere on the resume.
function classify(
  keyword: string,
  hay: ReturnType<typeof buildHaystack>,
): KeywordRow {
  const k = norm(keyword);
  if (!k) return { keyword, status: "missing", evidence: null };

  // PRESENT — exact normalised match in skills list.
  if (hay.stackTokens.has(k)) {
    return { keyword, status: "present", evidence: "Tech stack" };
  }
  // Substring match in skills (e.g., "node.js" listed, looking for "node").
  for (const t of hay.stackTokens) {
    if (t === k) continue;
    if (t.includes(k) || k.includes(t)) {
      return { keyword, status: "present", evidence: `Tech stack: "${[...hay.stackTokens].find((x) => x === t)}"` };
    }
  }

  // WEAK — search bullets first (more contextual than summary).
  const kRe = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  for (const b of hay.rawBullets) {
    if (kRe.test(b)) {
      const snippet = b.length > 80 ? b.slice(0, 80) + "…" : b;
      return { keyword, status: "weak", evidence: `Bullet: ${snippet}` };
    }
  }
  if (kRe.test(hay.summaryText)) {
    return { keyword, status: "weak", evidence: "Summary mention" };
  }
  return { keyword, status: "missing", evidence: null };
}

// ── structural checks ───────────────────────────────────────────────────────

const STRONG_VERBS = new Set([
  "led", "owned", "shipped", "built", "designed", "architected",
  "drove", "spearheaded", "scaled", "launched", "delivered",
  "reduced", "increased", "improved", "optimized", "optimised",
  "migrated", "refactored", "automated", "mentored", "managed",
]);

const METRIC_RE = /\b\d[\d,.]*\s*(%|x|m|k|million|billion|thousand|users?|customers?|requests?|qps|rps|engineers?|teams?|ms|days?|months?|years?|gb|tb|crore|cr|lakh|lakhs?)\b/i;

function runStructuralChecks(resume: ParsedResume): { checks: AtsCheck[]; bulletsTotal: number; bulletsWithMetrics: number } {
  const bullets = (resume.products_built ?? []).filter(Boolean);
  const tech = (resume.tech_stack ?? []).filter(Boolean);

  // Strong-verb leadership
  const strongLeads = bullets.filter((b) => {
    const first = b.trim().toLowerCase().match(/^[a-z]+/);
    return first && STRONG_VERBS.has(first[0]);
  }).length;
  const verbsCheck: AtsCheck = {
    id: "verb-leads",
    label: "Action-verb bullet starts",
    passed: bullets.length === 0 ? false : strongLeads / bullets.length >= 0.5,
    detail: bullets.length === 0
      ? "No bullets parsed. ATS systems struggle with summary-only resumes."
      : `${strongLeads}/${bullets.length} bullets open with a strong action verb (target: ≥50%).`,
  };

  // Metric density
  const withMetrics = bullets.filter((b) => METRIC_RE.test(b)).length;
  const metricsCheck: AtsCheck = {
    id: "bullet-metrics",
    label: "Quantified impact",
    passed: bullets.length === 0 ? false : withMetrics / bullets.length >= 0.4,
    detail: bullets.length === 0
      ? "Add product / project bullets with measurable outcomes (% / users / latency / revenue)."
      : `${withMetrics}/${bullets.length} bullets carry a number (target: ≥40%).`,
  };

  // Skills section length
  const techCheck: AtsCheck = {
    id: "skills-section",
    label: "Explicit skills section",
    passed: tech.length >= 8,
    detail: tech.length === 0
      ? "No skills parsed. ATS keyword-match relies on a discrete skills list."
      : `${tech.length} skill${tech.length === 1 ? "" : "s"} listed (target: ≥8).`,
  };

  // Experience signal
  const yearsCheck: AtsCheck = {
    id: "experience-years",
    label: "Years of experience visible",
    passed: (resume.total_years_experience ?? 0) > 0,
    detail: resume.total_years_experience ? `${resume.total_years_experience} years extracted from work history.` : "ATS couldn't infer years of experience.",
  };

  // Role function clarity
  const roleCheck: AtsCheck = {
    id: "role-function",
    label: "Recent role function clear",
    passed: Boolean(resume.role_function) && resume.role_function !== "other",
    detail: resume.role_function && resume.role_function !== "other"
      ? `Identified as: ${resume.role_function}.`
      : "Resume doesn't clearly map to a single engineering function.",
  };

  return {
    checks: [verbsCheck, metricsCheck, techCheck, yearsCheck, roleCheck],
    bulletsTotal: bullets.length,
    bulletsWithMetrics: withMetrics,
  };
}

// ── public entry ─────────────────────────────────────────────────────────────

export interface AtsViewInput {
  resume: ParsedResume;
  must_have_skills: string[];
  nice_to_have_skills: string[];
}

export function computeAtsView(input: AtsViewInput): AtsView {
  const hay = buildHaystack(input.resume);
  const must = (input.must_have_skills ?? []).map((k) => classify(k, hay));
  const nice = (input.nice_to_have_skills ?? []).map((k) => classify(k, hay));

  const struct = runStructuralChecks(input.resume);

  const mustPresent = must.filter((r) => r.status === "present").length;
  const niceWithCredit = nice.filter((r) => r.status === "present").length;
  const mustTotal = must.length;
  const niceTotal = nice.length;

  // Composite ATS score (0-100):
  //   60 pts — must-have coverage
  //   20 pts — nice-to-have coverage
  //   20 pts — structural checks (proportional)
  const mustPoints =
    mustTotal === 0 ? 45 : Math.round((mustPresent / mustTotal) * 60);
  const nicePoints =
    niceTotal === 0 ? 14 : Math.round((niceWithCredit / niceTotal) * 20);
  const structPoints = Math.round(
    (struct.checks.filter((c) => c.passed).length / struct.checks.length) * 20,
  );

  return {
    ats_score: Math.min(100, mustPoints + nicePoints + structPoints),
    must_haves: must,
    nice_to_haves: nice,
    checks: struct.checks,
    summary: {
      must_present:        mustPresent,
      must_total:          mustTotal,
      nice_present:        niceWithCredit,
      nice_total:          niceTotal,
      must_coverage_pct:   mustTotal === 0 ? 0 : Math.round((mustPresent / mustTotal) * 100),
      nice_coverage_pct:   niceTotal === 0 ? 0 : Math.round((niceWithCredit / niceTotal) * 100),
      bullets_with_metrics: struct.bulletsWithMetrics,
      bullets_total:       struct.bulletsTotal,
    },
  };
}
