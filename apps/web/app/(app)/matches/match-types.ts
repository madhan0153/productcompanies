// Shared types and pure utility for match classification.
// NO "use client" — imported by both the server page.tsx and the client
// band-strip.tsx. Must stay free of all React hooks and browser APIs.

export type MatchTab = "shortlist" | "worth_a_look" | "filtered";

export interface BandCounts {
  /** score >= 60, hidden_reason IS NULL. Plausible-or-better, not necessarily strong. */
  shortlist: number;
  /** 40 <= score < 60, hidden_reason IS NULL */
  worthALook: number;
  /** score < 40 OR hidden_reason is set */
  filtered: number;
}

/**
 * `hidden_reason` values that are *informational only* — the row is shown
 * in the regular bands (Priority / Explore) instead of being pushed to
 * Filtered. These mean "we kept this visible but flagged why the score
 * could be higher".
 *
 * Everything else (mismatch, low_quality_jd, role_signal_conflict, ghost,
 * no_stack, etc.) sends the row to Filtered.
 */
const INFORMATIONAL_HIDDEN_REASONS = new Set([
  // Match is reasonable but the JD parser hasn't enriched it yet — when
  // the parser runs the row will get a sharper score on the next compute.
  "evidence_pending",
]);

/** Server-side tab classification — used by page.tsx to slice loaded rows. */
export function classifyMatch(m: {
  score: number;
  hidden_reason: string | null;
  seen_at: string | null;
}): MatchTab | null {
  if (m.hidden_reason !== null && !INFORMATIONAL_HIDDEN_REASONS.has(m.hidden_reason)) {
    return "filtered";
  }
  if (m.score >= 60) return "shortlist";
  if (m.score >= 40) return "worth_a_look";
  return "filtered";
}
