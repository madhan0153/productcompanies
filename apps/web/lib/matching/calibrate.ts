// Enterprise-match calibration step — separated from engine.ts so it's
// independently testable.
//
// Pipeline:
//   computeRulesScore  →  computeVerdict  →  calibrateMatch  →  classifyMatch
//
//   computeRulesScore   produces the raw 0–100 score + hardMismatch flags
//   computeVerdict      derives a categorical verdict from the score + breakdown
//   calibrateMatch      applies evidence / verdict / role-conflict caps
//                        AND ensures unparsed-but-clearly-matching JDs are
//                        visible (Explore at worst — never Filtered) so the
//                        nightly crawler doesn't bury fresh roles.
//   classifyMatch       maps the calibrated score to a UI band
//
// Privacy: pure functions; no user data captured. Logging is the caller's job.

import { inferRoleFunctionFromTitle, type RulesScore } from "./score";

export type Verdict =
  | "strong_fit"
  | "stretch"
  | "off_target"
  | "underqualified"
  | "evidence_pending"   // unparsed JD but role/tech evidence is decent
  | "mismatch";

export interface CalibrateJobInput {
  title: string;
  description: string;
  quality_score: number;
  jd_parsed_at: string | null;
  jd_summary: string | null;
  role_function_jd: string | null;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  tech_stack: string[];
  is_likely_ghost: boolean;
}

export interface CalibrateResult {
  score: number;
  verdict: Verdict;
  hidden_reason: string | null;
}

// ── Verdict ladder ─────────────────────────────────────────────────────────

/**
 * Derive verdict from the (post-cap) score + breakdown. Order matters:
 * mismatch and off_target are decided FIRST (they're terminal); the rest
 * fall back to a score ladder.
 *
 *   strong_fit       score >= 75
 *   stretch          55 <= score < 75
 *   evidence_pending JD unparsed but role + tech show real signal
 *   underqualified   experience score very low
 *   off_target       role score barely > 0 and overall low
 *   mismatch         set externally (hard mismatch)
 */
export function computeVerdict(
  rules: RulesScore,
  score: number,
  jdParsed: boolean,
): Verdict {
  if (rules.hardMismatch) return "mismatch";
  if (!jdParsed && rules.breakdown.role >= 16 && rules.breakdown.tech >= 12) return "evidence_pending";
  if (rules.breakdown.role > 0 && rules.breakdown.role <= 3 && score >= 55) return "off_target";
  if (rules.breakdown.experience <= 2 && rules.breakdown.role < 16) return "underqualified";
  if (score >= 75) return "strong_fit";
  if (score >= 55) return "stretch";
  if (rules.breakdown.experience <= 2) return "underqualified";
  return "stretch";
}

// ── Score caps per verdict ─────────────────────────────────────────────────
//
// Caps keep the band semantics tight: a "stretch" with raw score 80 should
// not be ranked above a "strong_fit" with raw 76, so we lower the stretch
// row to the top of its band (74). evidence_pending lives in Explore by
// design (40–59) — Priority requires actual JD parse + cosine confirming
// the match.

const VERDICT_SCORE_CAP: Record<Verdict, number> = {
  strong_fit:       100,
  stretch:           74,
  evidence_pending:  59,    // Explore ceiling
  underqualified:    49,
  off_target:        44,
  mismatch:           0,
};

export function capScoreForVerdict(score: number, verdict: Verdict): number {
  return Math.max(0, Math.min(100, VERDICT_SCORE_CAP[verdict], Math.round(score)));
}

export function reconcileVerdictWithScore(verdict: Verdict, score: number): Verdict {
  if (verdict === "strong_fit" && score < 75) return score >= 55 ? "stretch" : "evidence_pending";
  if (verdict === "stretch" && score < 40) return "evidence_pending";
  return verdict;
}

// ── Evidence / signal helpers ─────────────────────────────────────────────

const LOW_QUALITY_SUMMARY_RE = /job description provided is empty|provided is empty|lacks specific details/i;
const NON_ENGINEERING_TITLE_RE =
  /\b(account partner|account executive|account manager|brand protection|communication specialist|communications specialist|compliance associate|data cent(?:er|re) engineering operations|investigation specialist|planner\b|salescloud|success guide)\b/i;

function isJdGenuinelyLowQuality(job: CalibrateJobInput): boolean {
  // Crawler-flagged garbage data: empty / placeholder / extraction failure.
  if (job.quality_score < 40) return true;
  if (LOW_QUALITY_SUMMARY_RE.test(job.jd_summary ?? "")) return true;
  return false;
}

function hasRoleSignalConflict(job: CalibrateJobInput): boolean {
  if (NON_ENGINEERING_TITLE_RE.test(job.title)) return true;

  const titleFunction = inferRoleFunctionFromTitle(job.title);
  const jdFunction = job.role_function_jd;

  // Both signals say "this isn't engineering" — Gemini parsed the body
  // and got "other", and the title doesn't infer to any known eng function.
  // Examples that landed here in production: "Copy Writer - Intern",
  // "Communication Specialist", "Investigation Specialist". Mark conflict
  // so engineering candidates don't see these. (Phase L tightening.)
  if (jdFunction === "other" && titleFunction === null) return true;

  if (!titleFunction || !jdFunction) return false;
  // "other" with a title that DID infer to an eng function (e.g. SWE) —
  // trust the title; this is the generic-SWE pattern.
  if (jdFunction === "other") return false;
  return titleFunction !== jdFunction;
}

/**
 * Is this row's evidence too thin to justify a Priority placement?
 *   - The crawler refused to parse the JD (quality < 60 or jd_parsed_at null)
 *   - The description is short AND has no structured signals
 * Distinct from `isJdGenuinelyLowQuality`: low-evidence rows are kept
 * visible in Explore; low-quality rows are filtered.
 */
function isLowEvidenceJob(job: CalibrateJobInput): boolean {
  const descLen = job.description.trim().length;
  const structuredSignals =
    job.must_have_skills.length +
    job.nice_to_have_skills.length +
    job.tech_stack.length +
    (job.jd_summary ? 1 : 0) +
    (job.role_function_jd && job.role_function_jd !== "other" ? 1 : 0);
  return job.quality_score < 60
    || job.jd_parsed_at === null
    || (descLen < 200 && structuredSignals < 2);
}

// ── Main calibration ──────────────────────────────────────────────────────

export function calibrateMatch(input: {
  job: CalibrateJobInput;
  rules: RulesScore;
  /** Score after feedback_adjustment. */
  baseScore: number;
}): CalibrateResult {
  const { job, rules, baseScore } = input;

  // (1) Hard mismatch from the rules layer — terminal.
  if (rules.hardMismatch) {
    return { score: 0, verdict: "mismatch", hidden_reason: rules.hardMismatchReason ?? "mismatch" };
  }

  // (2) Crawler-flagged garbage data — keep hidden.
  if (isJdGenuinelyLowQuality(job)) {
    return { score: Math.min(baseScore, 39), verdict: "mismatch", hidden_reason: "low_quality_jd" };
  }

  // (3) Title says one thing, parsed function says another — keep hidden.
  if (hasRoleSignalConflict(job)) {
    return { score: Math.min(baseScore, 39), verdict: "mismatch", hidden_reason: "role_signal_conflict" };
  }

  let score = Math.round(Math.max(0, Math.min(100, baseScore)));
  let hidden_reason: string | null = null;

  // (4) Low evidence — keep visible in Explore (not Filtered) so unparsed
  //     roles with clearly matching role + tech aren't buried.
  if (isLowEvidenceJob(job)) {
    const roleStrong = rules.breakdown.role >= 16;  // direct or near-direct
    const techDecent = rules.breakdown.tech >= 12;  // ≥ ~half of must-haves
    if (roleStrong && techDecent) {
      // Cap to top-of-Explore. Visible, but not Priority — Priority requires
      // a parsed JD + a cosine that confirms the semantic fit.
      score = Math.min(score, 58);
    } else {
      // Genuinely thin: show in Filtered but not 0'd.
      score = Math.min(score, 39);
      hidden_reason = "low_evidence";
    }
  }

  let preCapVerdict: Verdict;

  // (5) Ghost listings — keep visible at most as Explore.
  if (job.is_likely_ghost) {
    score = Math.min(score, 58);
    hidden_reason = hidden_reason ?? "ghost";
  }

  // (6) Verdict-driven cap.
  // Verdict is derived after all visibility caps so labels and score bands
  // cannot drift apart.

  // (7) Hard-cap reason from the rules layer (e.g. no_stack → 50, thin_jd → 70).
  //     rules.total already reflects these but baseScore may have been bumped
  //     by feedback — re-apply the floor.
  if (rules.hardCapReason === "no_stack") {
    score = Math.min(score, 49);   // never Priority without ANY tech overlap
    hidden_reason = hidden_reason ?? "no_stack";
  }

  preCapVerdict = computeVerdict(rules, score, job.jd_parsed_at !== null);
  score = capScoreForVerdict(score, preCapVerdict);
  const verdict = reconcileVerdictWithScore(preCapVerdict, score);

  if (verdict === "mismatch" && !hidden_reason) hidden_reason = "mismatch";
  return { score, verdict, hidden_reason };
}

// Note: the band classifier lives in app/(app)/matches/match-types.ts and is
// imported directly by callers. We deliberately don't re-export it from here
// because that would create a server-only-imports-from-app dependency cycle.
