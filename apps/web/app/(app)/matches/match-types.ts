// Shared types and pure utility for match classification.
// NO "use client" — imported by both the server page.tsx and the client
// band-strip.tsx. Must stay free of all React hooks and browser APIs.

export type MatchTab = "shortlist" | "worth_a_look" | "filtered" | "new";

export interface BandCounts {
  /** score >= 60, hidden_reason IS NULL */
  shortlist: number;
  /** 40 <= score < 60, hidden_reason IS NULL */
  worthALook: number;
  /** score < 40 OR hidden_reason = mismatch */
  filtered: number;
  /** seen_at IS NULL across visible scope */
  newCount: number;
}

/** Server-side tab classification — used by page.tsx to slice loaded rows. */
export function classifyMatch(m: {
  score: number;
  hidden_reason: string | null;
  seen_at: string | null;
}): MatchTab | null {
  if (m.hidden_reason === "mismatch") return "filtered";
  if (m.score >= 60) return "shortlist";
  if (m.score >= 40) return "worth_a_look";
  return "filtered";
}
