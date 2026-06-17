// Admin overview "Pulse" sparkline series.
//
// Deliberately returns ONLY real, quality-scored values — never a fabricated
// trend. When no jobs have been graded yet, this returns an empty array and the
// UI shows an honest "awaiting data" state instead of a decorative fake line.

export interface QualityScoreRow {
  quality_score: number | null;
}

/**
 * Maps real job quality-score rows to a rounded integer series for the
 * sparkline. Null/non-numeric scores are dropped. An empty input yields an
 * empty series (the caller must render an empty state, not a placeholder line).
 */
export function qualityPulse(rows: QualityScoreRow[] | null | undefined): number[] {
  return (rows ?? [])
    .map((r) => r.quality_score)
    .filter((s): s is number => typeof s === "number" && Number.isFinite(s))
    .map((s) => Math.round(s));
}
