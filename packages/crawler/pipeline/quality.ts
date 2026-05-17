// Sprint 6 — Quality gate.
//
// Sits between normalize and parse. Computes a 0-100 quality_score for every
// job and tags it with the reason codes that pushed the score down.
//
// What this protects:
//   1. Gemini token spend — jobs scoring <40 skip the LLM parse entirely.
//      They still get upserted (so the catalog stays warm) but with the
//      quality fields populated; the matching engine filters them out.
//   2. User feed signal — the engine's read query excludes quality_score<40,
//      so users never see "Sr Engineer" with a one-line description.
//
// Calibrated for our 18 product-co stack — these companies don't post
// "unpaid internship" or "equity-only" so the rule set is tighter than
// general job-board heuristics.

import type { NormalizedJob } from "@prodmatch/shared";

export interface QualityResult {
  /** 0–100, higher is better. Default 100 when no penalties applied. */
  score: number;
  /** Reason codes contributing to the score reduction. */
  reasons: string[];
  /** True when score >= MIN_QUALITY_TO_PARSE — caller should parse this row. */
  parseable: boolean;
}

/** Below this, skip the LLM parse and exclude from the match feed. */
export const MIN_QUALITY_TO_PARSE = 40;

/** Below this, soft-deprioritise but still parse. Reserved for future use. */
export const HOT_QUALITY_THRESHOLD = 80;

// Red-flag terms that almost never appear in legit product-co JDs. Conservative
// list — false positives here hurt more than false negatives. Each match
// applies the same penalty.
const RED_FLAGS: RegExp[] = [
  /\bunpaid\s+(?:intern(?:ship)?|position|role)\b/i,
  /\b(?:stipend|stipendiary)\s+only\b/i,
  /\bfor\s+exposure\b/i,
  /\bequity\s+only\b/i,
  /\bperformance[-\s]based\s+(?:compensation|pay|salary)\s+only\b/i,
  /\bcommission[-\s]only\b/i,
  /\bno\s+(?:salary|compensation|payment)\b/i,
];

const STALE_DAYS_HARD = 60;   // -35 pts
const STALE_DAYS_SOFT = 30;   // -15 pts

/**
 * Evaluate a normalized job for quality signal.
 * Pure function — no IO, no side effects. Safe to run on every crawl row.
 */
export function evaluateJobQuality(job: NormalizedJob): QualityResult {
  let score = 100;
  const reasons: string[] = [];

  // ── Hard requirements ──────────────────────────────────────────────────
  // Missing apply_url is an automatic reject — without it the row is useless
  // (the user can't even click through). Treat as score=0.
  if (!job.apply_url || job.apply_url.trim().length === 0) {
    return { score: 0, reasons: ["missing_apply_url"], parseable: false };
  }

  // Title sanity. Empty / 1-char titles are scrape artifacts.
  const title = (job.title ?? "").trim();
  if (title.length < 3) {
    return { score: 0, reasons: ["missing_title"], parseable: false };
  }

  // ── Description signal ────────────────────────────────────────────────
  const desc = (job.description ?? "").trim();
  const descLen = desc.length;

  if (descLen === 0) {
    score -= 60;
    reasons.push("no_description");
  } else if (descLen < 140) {
    score -= 30;
    reasons.push("thin_description");
  } else if (descLen < 280) {
    score -= 12;
    reasons.push("short_description");
  }

  // Description that's mostly URLs / asterisks / unicode bullets is also thin.
  // Count actual letters; if <100 of them, it's not a real JD body.
  const letters = desc.replace(/[^a-zA-Z]/g, "").length;
  if (descLen > 0 && letters < 100) {
    score -= 20;
    if (!reasons.includes("thin_description")) reasons.push("thin_description");
  }

  // ── Freshness ─────────────────────────────────────────────────────────
  if (job.posted_at) {
    const posted = new Date(job.posted_at).getTime();
    if (Number.isFinite(posted)) {
      const days = Math.floor((Date.now() - posted) / (24 * 60 * 60 * 1000));
      if (days >= STALE_DAYS_HARD) {
        score -= 35;
        reasons.push("very_stale_posting");
      } else if (days >= STALE_DAYS_SOFT) {
        score -= 15;
        reasons.push("stale_posting");
      }
    }
  }

  // ── Red flags ─────────────────────────────────────────────────────────
  // Scan the title + description together. Each match contributes -20; cap
  // the cumulative red-flag penalty at -45 so a single noisy paragraph
  // doesn't sink an otherwise solid posting.
  const haystack = `${title}\n${desc}`;
  let redFlagPenalty = 0;
  for (const re of RED_FLAGS) {
    if (re.test(haystack)) redFlagPenalty += 20;
  }
  if (redFlagPenalty > 0) {
    const capped = Math.min(redFlagPenalty, 45);
    score -= capped;
    reasons.push("red_flag_terms");
  }

  // ── All-caps title heuristic ──────────────────────────────────────────
  // Legit titles use Title Case. "SENIOR SOFTWARE ENGINEER!!!" is usually
  // a scraper artifact or a low-effort listing. Only fire when there are
  // >=4 letters AND no lowercase at all.
  const letterChars = title.replace(/[^A-Za-z]/g, "");
  if (letterChars.length >= 4 && letterChars === letterChars.toUpperCase()) {
    score -= 8;
    reasons.push("all_caps_title");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    reasons,
    parseable: score >= MIN_QUALITY_TO_PARSE,
  };
}

export interface QualityGateStats {
  /** Number of jobs evaluated. */
  total: number;
  /** Jobs that passed (parseable=true). */
  passed: number;
  /** Jobs that failed the gate; will skip LLM parse. */
  gated: number;
  /** Reason-code frequency across all gated jobs. */
  reasonCounts: Record<string, number>;
}

/**
 * Evaluate a batch of jobs and produce parallel arrays:
 *   - `qualities[i]` is the QualityResult for `jobs[i]`
 *   - `stats` aggregates pass/gate counts and reason frequencies for logging
 */
export function evaluateBatch(jobs: NormalizedJob[]): {
  qualities: QualityResult[];
  stats: QualityGateStats;
} {
  const qualities: QualityResult[] = [];
  const stats: QualityGateStats = {
    total: jobs.length,
    passed: 0,
    gated: 0,
    reasonCounts: {},
  };
  for (const j of jobs) {
    const q = evaluateJobQuality(j);
    qualities.push(q);
    if (q.parseable) stats.passed++;
    else stats.gated++;
    for (const r of q.reasons) {
      stats.reasonCounts[r] = (stats.reasonCounts[r] ?? 0) + 1;
    }
  }
  return { qualities, stats };
}
