// Sprint 6 — Score band helper.
//
// Maps a raw 0–100 score to a labelled band so the UI can show
// "Excellent fit (87)" instead of just "87". Bands are derived at read time
// — we do NOT store them on the match row to avoid bigint-flip headaches
// when thresholds get tuned.
//
// Bands intentionally match the rubric's design intent:
//   90–100  excellent    — direct evidence, multiple dimensions strong
//   75–89   strong       — clear "apply" signal
//   60–74   plausible    — meaningful gaps, application defensible
//   40–59   weak         — adjacent fit, mostly missing core stack
//   0–39    reject       — rare since hardMismatch hides these rows

export type ScoreBand = "excellent" | "strong" | "plausible" | "weak" | "reject";

export interface BandMeta {
  band: ScoreBand;
  label: string;
  /** Lowest score within the band. */
  min: number;
}

const BANDS: BandMeta[] = [
  { band: "excellent", label: "Excellent fit", min: 90 },
  { band: "strong",    label: "Strong fit",    min: 75 },
  { band: "plausible", label: "Plausible fit", min: 60 },
  { band: "weak",      label: "Weak fit",      min: 40 },
  { band: "reject",    label: "Not a fit",     min: 0  },
];

/** Returns the band metadata for a score (0–100). Out-of-range falls into weak/reject. */
export function getScoreBand(score: number): BandMeta {
  if (!Number.isFinite(score)) return BANDS[BANDS.length - 1];
  const s = Math.max(0, Math.min(100, score));
  for (const b of BANDS) {
    if (s >= b.min) return b;
  }
  return BANDS[BANDS.length - 1];
}

/**
 * Confidence label for the UI. The numeric confidence is more useful in
 * tooltips; the label sits next to the score in compact views.
 */
export function getConfidenceLabel(confidence: number | null | undefined): "high" | "medium" | "low" {
  if (confidence === null || confidence === undefined || !Number.isFinite(confidence)) return "medium";
  if (confidence >= 80) return "high";
  if (confidence >= 55) return "medium";
  return "low";
}
