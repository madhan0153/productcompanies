// Product fix: percentile benchmark for the Product-Co DNA score.
//
// Engagement loop: showing a user "you're in the top 25% for backend
// engineers with 4 yrs experience" is materially stickier than the raw
// score alone. Until we have enough live users to mint real percentiles
// per (role_function, years_band), we approximate via a static curve
// calibrated against the matching-benchmark fixtures. When the user base
// crosses ~1k active profiles, swap the static curve for a live one
// without changing the public surface here.
//
// Pure function — no Supabase, no env, no IO. Safe to import in shared.

import type { CanonicalRoleFunction } from "./roles/taxonomy";

export type DnaPercentileBucket =
  | "top_5"
  | "top_10"
  | "top_25"
  | "top_50"
  | "bottom_50"
  | "bottom_25";

export interface DnaBenchmark {
  /** Percentile 0-100 (higher is better). */
  percentile: number;
  /** Mapped bucket for the UI to pick a tone. */
  bucket: DnaPercentileBucket;
  /** Short human label e.g. "Top 25% for backend engineers (4 yrs)". */
  label: string;
  /** Detail copy explaining the comparison cohort. */
  detail: string;
  /** Target score to reach the next bucket up, or null if already top-5. */
  nextTarget: number | null;
}

interface BenchmarkCurvePoint {
  /** A DNA score at or below this maps to `percentile`. */
  scoreAtMost: number;
  percentile: number;
}

// Reasonable curve calibrated against the matching-benchmark fixtures in
// apps/web/__tests__/matching/banding-benchmark.test.ts and observed
// distributions during private beta. Conservative — never tells anyone
// they're in the bottom decile, never claims top-1% without strong score.
const CURVE: readonly BenchmarkCurvePoint[] = [
  { scoreAtMost: 34, percentile: 18 },
  { scoreAtMost: 44, percentile: 30 },
  { scoreAtMost: 54, percentile: 48 },
  { scoreAtMost: 64, percentile: 62 },
  { scoreAtMost: 72, percentile: 75 },
  { scoreAtMost: 80, percentile: 85 },
  { scoreAtMost: 88, percentile: 92 },
  { scoreAtMost: 95, percentile: 96 },
  { scoreAtMost: 100, percentile: 99 },
];

// Role-function copy. Falls back to "engineers" when a role isn't covered.
const ROLE_LABEL: Record<string, string> = {
  backend: "backend engineers",
  frontend: "frontend engineers",
  fullstack: "full-stack engineers",
  data_engineering: "data engineers",
  data_analytics: "data analysts",
  machine_learning: "ML engineers",
  ml_ai: "ML engineers",
  qa_sdet: "QA / SDET engineers",
  qa_test: "QA engineers",
  devops_sre: "DevOps / SRE engineers",
  devops_platform: "platform engineers",
  security: "security engineers",
  cybersecurity: "cybersecurity engineers",
  android: "Android engineers",
  ios: "iOS engineers",
  mobile: "mobile engineers",
  product: "product managers",
  product_management: "product managers",
  tpm: "technical program managers",
  program_management: "program managers",
  ui_ux: "designers",
  design: "designers",
};

function yearsBand(years: number | null | undefined): string {
  if (years == null || Number.isNaN(years)) return "all experience levels";
  if (years < 2) return "0–2 yrs exp";
  if (years < 4) return "2–4 yrs exp";
  if (years < 7) return "4–7 yrs exp";
  if (years < 10) return "7–10 yrs exp";
  return "10+ yrs exp";
}

function pickBucket(percentile: number): DnaPercentileBucket {
  if (percentile >= 95) return "top_5";
  if (percentile >= 90) return "top_10";
  if (percentile >= 75) return "top_25";
  if (percentile >= 50) return "top_50";
  if (percentile >= 25) return "bottom_50";
  return "bottom_25";
}

/**
 * Map a DNA score (0-100) + light context to a percentile + UI copy.
 *
 * Pass `roleFunction` from `profiles.role_function` (CanonicalRoleFunction
 * string) and `years` from `profiles.years_experience`. Both are optional
 * — the copy degrades gracefully when missing.
 */
export function computeDnaBenchmark(input: {
  dnaScore: number | null;
  roleFunction?: CanonicalRoleFunction | string | null;
  years?: number | null;
}): DnaBenchmark | null {
  if (input.dnaScore == null || Number.isNaN(input.dnaScore)) return null;
  const score = Math.max(0, Math.min(100, Math.round(input.dnaScore)));

  const point = CURVE.find((c) => score <= c.scoreAtMost) ?? CURVE[CURVE.length - 1]!;
  const percentile = point.percentile;
  const bucket = pickBucket(percentile);

  const roleKey = (input.roleFunction ?? "").toString().toLowerCase();
  const roleLabel = ROLE_LABEL[roleKey] ?? "product-co candidates";
  const cohort = `${roleLabel} (${yearsBand(input.years)})`;

  const label = ((): string => {
    switch (bucket) {
      case "top_5":     return `Top 5% of ${cohort}`;
      case "top_10":    return `Top 10% of ${cohort}`;
      case "top_25":    return `Top 25% of ${cohort}`;
      case "top_50":    return `Above median for ${cohort}`;
      case "bottom_50": return `Below median for ${cohort}`;
      case "bottom_25": return `Bottom 25% for ${cohort}`;
    }
  })();

  const detail = ((): string => {
    if (bucket === "top_5" || bucket === "top_10") {
      return "Your resume signal is strong against this cohort. Lean into role-aligned matches first.";
    }
    if (bucket === "top_25") {
      return "Healthy position. Tightening tech stack + a recent product-impact bullet can move you to top 10.";
    }
    if (bucket === "top_50") {
      return "Solid baseline. The next 10 points come from sharper bullets and missing high-demand skills.";
    }
    return "There's headroom. Re-write project bullets in product-co language and add missing skills the market wants.";
  })();

  const nextTarget = ((): number | null => {
    if (bucket === "top_5") return null;
    if (bucket === "top_10") return 95;
    if (bucket === "top_25") return 88;
    if (bucket === "top_50") return 80;
    if (bucket === "bottom_50") return 64;
    return 54;
  })();

  return { percentile, bucket, label, detail, nextTarget };
}
