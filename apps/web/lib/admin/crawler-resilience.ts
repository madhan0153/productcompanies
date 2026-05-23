// Resilience scoring for the /admin/crawler-intel dashboard.
//
// Pure functions — fed by crawl_runs + the shared CRAWLER_META manifest, no
// DB access here. Tested in apps/web/__tests__/admin/crawler-resilience.test.ts.

import { CRAWLER_META, type CrawlerMeta } from "@prodmatch/shared";

export type CrawlRunStatus = "running" | "success" | "partial" | "failed";

export interface CrawlRunRow {
  company_id: string;
  status: CrawlRunStatus;
  started_at: string;
  finished_at: string | null;
  jobs_new: number | null;
  jobs_updated: number | null;
  jobs_marked_stale: number | null;
  error: string | null;
}

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
}

export interface CompanyResilience {
  company: CompanyRow;
  meta: CrawlerMeta | null;
  runs: CrawlRunRow[];
  score: number;            // 0..100
  grade: "A+" | "A" | "B" | "C" | "D";
  successRate: number;      // 0..1 over last `runs`
  driftFlag: boolean;       // two-in-a-row non-success
  staleFlag: boolean;       // no run in last 72h
  latestStatus: CrawlRunStatus | "no_data";
  latestAt: string | null;
}

export interface OverallResilience {
  fleetScore: number;
  fleetGrade: CompanyResilience["grade"];
  /** Adaptive coverage across html-dom crawlers only (others are not applicable). */
  adaptiveCoverage: number;     // 0..1
  /** Fixture coverage across html-dom crawlers only. */
  fixtureCoverage: number;      // 0..1
  companiesAtRisk: number;      // grade < B
  /** Counts by ingestion strategy — useful for the UI summary header. */
  byKind: {
    htmlDom: number;
    htmlRegex: number;
    api: number;
  };
}

const STALE_AFTER_MS = 72 * 60 * 60 * 1000;

/**
 * Score a single company. Higher is better.
 *
 *   Base run success rate (last 14 days)                      0..50
 *   Adaptive selectors wired                                     +20
 *   Golden fixture committed                                     +20
 *   No drift (two consecutive non-success runs)                 +10  *
 *   Recent crawl (within 72h)                                   +10  *
 *
 * Stars (*) are awarded by default and *removed* when the condition fails,
 * so a perfectly-wired but currently-drifting company can't earn 100.
 *
 * No partial credit philosophy: a company without crawl_runs at all gets
 * the floor (`adaptive` + `fixture` bonuses + 0 base). This is fine — the
 * UI will surface "no data" visually.
 */
export function scoreCompany(
  company: CompanyRow,
  meta: CrawlerMeta | null,
  runs: CrawlRunRow[],
  now: Date = new Date(),
): CompanyResilience {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
  const recent = sorted.slice(0, 14);
  const finished = recent.filter((r) => r.status !== "running");
  const successCount = finished.filter((r) => r.status === "success").length;
  const successRate = finished.length === 0 ? 0 : successCount / finished.length;

  const latest = sorted[0];
  const prior = sorted[1];
  const driftFlag =
    !!latest && !!prior &&
    latest.status !== "success" && latest.status !== "running" &&
    prior.status !== "success" && prior.status !== "running";

  const latestAtIso = latest?.finished_at ?? latest?.started_at ?? null;
  const staleFlag = (() => {
    if (!latestAtIso) return true;
    const age = now.getTime() - new Date(latestAtIso).getTime();
    return age > STALE_AFTER_MS;
  })();

  let score = 0;
  score += Math.round(successRate * 50);
  if (meta?.adaptive) score += 20;
  if (meta?.hasFixture) score += 20;
  if (!driftFlag) score += 10;
  if (!staleFlag) score += 10;
  // Clamp — a company with no runs still gets the adaptive+fixture bonus (40)
  // and the "no-drift" credit (10) but loses the recency credit. Floor at 0
  // so we never display negatives.
  score = Math.max(0, Math.min(100, score));

  return {
    company,
    meta,
    runs: sorted,
    score,
    grade: toGrade(score),
    successRate,
    driftFlag,
    staleFlag,
    latestStatus: latest?.status ?? "no_data",
    latestAt: latestAtIso,
  };
}

/**
 * Fleet-level aggregate. Companies missing from CRAWLER_META are ignored —
 * we only count the known approved crawlers in coverage ratios.
 */
export function scoreFleet(
  companies: CompanyRow[],
  runsByCompany: Map<string, CrawlRunRow[]>,
  now: Date = new Date(),
): { overall: OverallResilience; perCompany: CompanyResilience[] } {
  const perCompany: CompanyResilience[] = companies.map((co) => {
    const meta = CRAWLER_META.find((m) => m.slug === co.slug) ?? null;
    const runs = runsByCompany.get(co.id) ?? [];
    return scoreCompany(co, meta, runs, now);
  });

  // Sort: lowest-grade first so operators see breakage at the top.
  perCompany.sort((a, b) => a.score - b.score);

  const fleetScore = perCompany.length === 0
    ? 0
    : Math.round(perCompany.reduce((s, c) => s + c.score, 0) / perCompany.length);

  // Coverage ratios are over html-dom crawlers only — adaptive selectors
  // don't apply to API crawlers, and including them would dilute the
  // signal (it would always say "adaptive: 78%" because API crawlers are
  // pre-set to true). Operators want to see "how many of the DOM-scraping
  // crawlers are hardened".
  const htmlDom = CRAWLER_META.filter((m) => m.kind === "html-dom");
  const adaptiveCoverage = htmlDom.length === 0
    ? 0
    : htmlDom.filter((m) => m.adaptive).length / htmlDom.length;
  const fixtureCoverage = htmlDom.length === 0
    ? 0
    : htmlDom.filter((m) => m.hasFixture).length / htmlDom.length;
  const companiesAtRisk = perCompany.filter((c) => c.score < 70).length;

  return {
    overall: {
      fleetScore,
      fleetGrade: toGrade(fleetScore),
      adaptiveCoverage,
      fixtureCoverage,
      companiesAtRisk,
      byKind: {
        htmlDom: CRAWLER_META.filter((m) => m.kind === "html-dom").length,
        htmlRegex: CRAWLER_META.filter((m) => m.kind === "html-regex").length,
        api: CRAWLER_META.filter((m) => m.kind === "api").length,
      },
    },
    perCompany,
  };
}

function toGrade(score: number): CompanyResilience["grade"] {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  return "D";
}
