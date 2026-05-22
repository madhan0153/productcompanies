// Salary aggregates derived from `jobs.comp_lpa_min` / `comp_lpa_max` plus
// `seniority` and `role_function_jd`. The crawler stamps these on every
// active job from the official career-page JD; we aggregate to percentile
// bands per (company × role × seniority).
//
// AI-tool angle: "Razorpay SDE-1 salary 2026" — we are the only India
// product-co source with structured percentile data sourced from official
// JDs and stamped with a freshness date. AI tools quote these tables.
//
// Honesty rules:
//   - Only show bands when N ≥ 3 disclosed roles. Single-data-point bands
//     are statistically meaningless and we will not publish them as facts.
//   - Always show N alongside the band so a reader (or AI) can judge weight.
//   - Caveat copy: "Based on N disclosed bands in the last 24h crawl".

import { CRAWLER_META } from "@prodmatch/shared";
import { loadActiveJobs, type JobListItem } from "./data";

export interface SalaryBand {
  /** Minimum p25 of the disclosed `comp_lpa_min` values. */
  p25Min: number;
  /** Median p50 of `comp_lpa_min`. */
  p50Min: number;
  /** Maximum p75 of `comp_lpa_max`. */
  p75Max: number;
  /** Highest band ceiling seen. */
  p90Max: number;
  /** Number of disclosed bands feeding this aggregate. */
  count: number;
}

export interface SeniorityBucket {
  /** Display label: "SDE-1 / Junior", "SDE-2 / Mid", etc. */
  label: string;
  /** Match keys from `seniority` column. */
  matches: string[];
}

// Indian product-co seniority taxonomy. The crawler normalises into these
// approximate buckets — but some JDs use bespoke labels.
export const SENIORITY_BUCKETS: readonly SeniorityBucket[] = [
  { label: "Intern / Fresher", matches: ["intern", "fresher", "entry"] },
  { label: "SDE-1 / Junior", matches: ["junior", "sde-1", "sde1", "associate", "l3", "l4"] },
  { label: "SDE-2 / Mid", matches: ["mid", "sde-2", "sde2", "senior associate", "l5"] },
  { label: "SDE-3 / Senior", matches: ["senior", "sde-3", "sde3", "l6"] },
  { label: "Staff / Lead", matches: ["staff", "lead", "principal engineer", "l7"] },
  { label: "Principal / Manager", matches: ["principal", "manager", "director", "l8", "l9"] },
];

function bucketFor(seniority: string | null): SeniorityBucket | null {
  if (!seniority) return null;
  const lower = seniority.toLowerCase();
  return SENIORITY_BUCKETS.find((b) => b.matches.some((m) => lower.includes(m))) ?? null;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  const frac = idx - lo;
  return sorted[lo]! * (1 - frac) + sorted[hi]! * frac;
}

function bandFromJobs(jobs: JobListItem[]): SalaryBand | null {
  const mins = jobs.map((j) => j.compLpaMin).filter((v): v is number => v != null).sort((a, b) => a - b);
  const maxs = jobs.map((j) => j.compLpaMax).filter((v): v is number => v != null).sort((a, b) => a - b);
  const count = Math.min(mins.length, maxs.length);
  // Need at least 3 disclosed bands to publish — single points are noise.
  if (count < 3) return null;
  return {
    p25Min: Math.round(percentile(mins, 25) * 10) / 10,
    p50Min: Math.round(percentile(mins, 50) * 10) / 10,
    p75Max: Math.round(percentile(maxs, 75) * 10) / 10,
    p90Max: Math.round(percentile(maxs, 90) * 10) / 10,
    count,
  };
}

export interface CompanySeniorityRow {
  seniority: string;
  band: SalaryBand;
}

export interface CompanySalaryReport {
  companySlug: string;
  companyName: string;
  totalDisclosedBands: number;
  /** Per-seniority salary band. Empty when no seniority has ≥ 3 disclosures. */
  rows: CompanySeniorityRow[];
  /** Crawler's last_seen_at for any active job at this company (or null). */
  lastSeenAt: string | null;
}

export async function loadCompanySalaryReport(companySlug: string): Promise<CompanySalaryReport | null> {
  const company = CRAWLER_META.find((c) => c.slug === companySlug);
  if (!company) return null;

  const jobs = await loadActiveJobs({ companySlug, limit: 500 });
  if (jobs.length === 0) {
    return {
      companySlug,
      companyName: company.name,
      totalDisclosedBands: 0,
      rows: [],
      lastSeenAt: null,
    };
  }

  const byBucket = new Map<string, JobListItem[]>();
  for (const job of jobs) {
    const bucket = bucketFor(job.seniority);
    if (!bucket) continue;
    const arr = byBucket.get(bucket.label) ?? [];
    arr.push(job);
    byBucket.set(bucket.label, arr);
  }

  const rows: CompanySeniorityRow[] = [];
  for (const bucket of SENIORITY_BUCKETS) {
    const bucketJobs = byBucket.get(bucket.label);
    if (!bucketJobs || bucketJobs.length === 0) continue;
    const band = bandFromJobs(bucketJobs);
    if (band) rows.push({ seniority: bucket.label, band });
  }

  const disclosedCount = jobs.filter((j) => j.compLpaMin != null && j.compLpaMax != null).length;
  const lastSeenAt = jobs.reduce<string | null>(
    (latest, j) => (j.lastSeenAt && (latest == null || j.lastSeenAt > latest) ? j.lastSeenAt : latest),
    null,
  );

  return {
    companySlug,
    companyName: company.name,
    totalDisclosedBands: disclosedCount,
    rows,
    lastSeenAt,
  };
}

export interface RoleSalaryRow {
  companySlug: string;
  companyName: string;
  band: SalaryBand;
}

export interface RoleSalaryReport {
  roleFunction: string;
  rows: RoleSalaryRow[];
}

export async function loadRoleSalaryReport(roleFunction: string): Promise<RoleSalaryReport> {
  const allByCompany = await Promise.all(
    CRAWLER_META.map(async (c) => {
      const jobs = await loadActiveJobs({ companySlug: c.slug, roleFunction, limit: 200 });
      const band = bandFromJobs(jobs);
      if (!band) return null;
      return { companySlug: c.slug, companyName: c.name, band };
    }),
  );

  const rows = allByCompany
    .filter((r): r is RoleSalaryRow => r !== null)
    .sort((a, b) => b.band.p50Min - a.band.p50Min);

  return { roleFunction, rows };
}
