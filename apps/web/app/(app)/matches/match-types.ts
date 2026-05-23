// Shared types and pure utility for match classification.
// NO "use client" — imported by both the server page.tsx and the client
// band-strip.tsx. Must stay free of all React hooks and browser APIs.

export type MatchTab = "shortlist" | "worth_a_look";

export interface BandCounts {
  /** score >= 60, hidden_reason IS NULL. */
  shortlist: number;
  /** 40 <= score < 60, hidden_reason IS NULL */
  worthALook: number;
}

/**
 * `hidden_reason` values that are *informational only* — the row is shown
 * in the regular bands instead of being suppressed. These mean "we kept
 * this visible but flagged why the score could be higher".
 */
const INFORMATIONAL_HIDDEN_REASONS = new Set([
  "evidence_pending",
]);

/**
 * Server-side tab classification.
 * Returns null for any match that should be hidden from the user
 * (low score, hard cap, mismatch, etc.).
 */
export function classifyMatch(m: {
  score: number;
  hidden_reason: string | null;
}): MatchTab | null {
  if (m.hidden_reason !== null && !INFORMATIONAL_HIDDEN_REASONS.has(m.hidden_reason)) {
    return null;
  }
  if (m.score >= 60) return "shortlist";
  if (m.score >= 40) return "worth_a_look";
  return null;
}
