// Sprint 3 — Item 28.
//
// Grounds the Fit Card's comp_reality block in real data. The earlier
// implementation asked Gemini to *invent* `negotiate_to_lpa`; on India
// product companies that rarely post LPA, this was a hallucination magnet.
// Now: we pre-compute median + p75 + p90 LPA per (seniority × role_function)
// from the live active-jobs catalog, pass that into the prompt as ground
// truth, and instruct Gemini to *cite* the bracket rather than fabricate.
//
// The bucket key falls back to seniority-only when role_function × seniority
// has fewer than MIN_N postings; if even seniority-only is sparse, the
// helper returns null and the prompt uses a clear "insufficient market
// data" line.

const MIN_N = 6;          // minimum n for a credible percentile reading
const FALLBACK_MIN_N = 4; // accept seniority-only at lower bar

export interface CompBracket {
  /** "seniority" if the bucket fell back; "exact" if (role × seniority) had n >= MIN_N. */
  basis: "exact" | "seniority_only";
  seniority: string;
  role_function: string | null;
  n: number;
  median: number;
  p75: number;
  p90: number;
}

export interface CompJobLite {
  seniority: string | null;
  role_function: string | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
}

function ceilLPA(jobs: CompJobLite[]): number[] {
  // Use comp_lpa_max as the "what this band pays" anchor; fall back to min.
  // Filter null and silly outliers (>= 200 LPA usually = annual base in
  // foreign currency or a posting error).
  return jobs
    .map((j) => j.comp_lpa_max ?? j.comp_lpa_min)
    .filter((x): x is number => typeof x === "number" && x > 0 && x < 200);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)));
  return sorted[idx];
}

function bucketPercentiles(jobs: CompJobLite[]): { median: number; p75: number; p90: number; n: number } {
  const xs = ceilLPA(jobs).sort((a, b) => a - b);
  return {
    n:      xs.length,
    median: Math.round(percentile(xs, 0.5)),
    p75:    Math.round(percentile(xs, 0.75)),
    p90:    Math.round(percentile(xs, 0.9)),
  };
}

/**
 * Build a lookup table keyed by `seniority:role_function`, plus a
 * `seniority:*` fallback row. Caller queries via `lookupCompBracket()`.
 */
export type CompPercentileTable = Map<string, CompBracket>;

export function buildCompPercentileTable(jobs: CompJobLite[]): CompPercentileTable {
  const table: CompPercentileTable = new Map();
  const byPair = new Map<string, CompJobLite[]>();
  const bySeniority = new Map<string, CompJobLite[]>();

  for (const j of jobs) {
    if (!j.seniority) continue;
    const pair = `${j.seniority}:${j.role_function ?? "*"}`;
    if (!byPair.has(pair))    byPair.set(pair, []);
    byPair.get(pair)!.push(j);
    if (!bySeniority.has(j.seniority)) bySeniority.set(j.seniority, []);
    bySeniority.get(j.seniority)!.push(j);
  }

  for (const [key, rows] of byPair) {
    const [seniority, role] = key.split(":");
    const p = bucketPercentiles(rows);
    if (p.n >= MIN_N) {
      table.set(key, {
        basis: "exact",
        seniority,
        role_function: role === "*" ? null : role,
        ...p,
      });
    }
  }

  for (const [seniority, rows] of bySeniority) {
    const p = bucketPercentiles(rows);
    if (p.n >= FALLBACK_MIN_N) {
      table.set(`${seniority}:*`, {
        basis: "seniority_only",
        seniority,
        role_function: null,
        ...p,
      });
    }
  }

  return table;
}

export function lookupCompBracket(
  table: CompPercentileTable,
  seniority: string | null,
  roleFunction: string | null,
): CompBracket | null {
  if (!seniority) return null;
  if (roleFunction) {
    const exact = table.get(`${seniority}:${roleFunction}`);
    if (exact) return exact;
  }
  return table.get(`${seniority}:*`) ?? null;
}
