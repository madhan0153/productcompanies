// Unit tests for the crawler resilience scoring used on /admin/crawler-intel.
// Runs under: tsx --test apps/web/__tests__/admin/crawler-resilience.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  scoreCompany,
  scoreFleet,
  type CompanyRow,
  type CrawlRunRow,
  type CrawlRunStatus,
} from "../../lib/admin/crawler-resilience";
import { CRAWLER_META_BY_SLUG } from "@prodmatch/shared";

function run(status: CrawlRunStatus, hoursAgo: number): CrawlRunRow {
  const t = new Date(Date.now() - hoursAgo * 3_600_000).toISOString();
  return {
    company_id: "c-1",
    status,
    started_at: t,
    finished_at: t,
    jobs_new: status === "success" ? 5 : 0,
    jobs_updated: 0,
    jobs_marked_stale: 0,
    error: status === "failed" ? "boom" : null,
  };
}

const google: CompanyRow = { id: "c-1", name: "Google", slug: "google" };
const microsoft: CompanyRow = { id: "c-2", name: "Microsoft", slug: "microsoft" };

test("scoreCompany: fully healthy adaptive + fixture earns A+", () => {
  const runs = [run("success", 1), run("success", 25), run("success", 49)];
  const r = scoreCompany(google, CRAWLER_META_BY_SLUG["google"], runs);
  assert.equal(r.successRate, 1);
  assert.equal(r.driftFlag, false);
  assert.equal(r.staleFlag, false);
  assert.equal(r.score, 100);
  assert.equal(r.grade, "A+");
});

test("scoreCompany: drift flag fires on two consecutive non-success runs", () => {
  const runs = [run("partial", 1), run("failed", 25), run("success", 49)];
  const r = scoreCompany(google, CRAWLER_META_BY_SLUG["google"], runs);
  assert.equal(r.driftFlag, true);
  assert.ok(r.score < 100, "drift should reduce score");
});

test("scoreCompany: stale flag fires when latest run is older than 72h", () => {
  const runs = [run("success", 100)];
  const r = scoreCompany(google, CRAWLER_META_BY_SLUG["google"], runs);
  assert.equal(r.staleFlag, true);
});

test("scoreCompany: no runs returns floor with adaptive+fixture bonus", () => {
  const r = scoreCompany(google, CRAWLER_META_BY_SLUG["google"], []);
  // 0 base + 20 adaptive + 20 fixture + 10 no-drift = 50, no recency credit.
  assert.equal(r.score, 50);
  assert.equal(r.grade, "D");
  assert.equal(r.latestStatus, "no_data");
});

test("scoreCompany: html-dom company without adaptive or fixture caps lower", () => {
  // Synthetic meta — a hypothetical html-dom crawler that hasn't been
  // wired with adaptive selectors yet. Verifies the scoring formula
  // independent of any specific CRAWLER_META entry that might flip later.
  const runs = [run("success", 1), run("success", 25)];
  const r = scoreCompany(
    { id: "c-x", name: "Unwired", slug: "unwired" },
    { slug: "unwired", name: "Unwired", kind: "html-dom", adaptive: false, hasFixture: false },
    runs,
  );
  // 50 base + 0 adaptive + 0 fixture + 10 no-drift + 10 recent = 70.
  assert.equal(r.score, 70);
  assert.equal(r.grade, "B");
});

test("scoreCompany: api crawler gets full credit when healthy (selector resilience N/A)", () => {
  // API crawlers don't have DOM selectors that can drift, so adaptive +
  // fixture credit is awarded automatically in CRAWLER_META. Verifies
  // the formula treats them fairly.
  const runs = [run("success", 1), run("success", 25)];
  const r = scoreCompany(microsoft, CRAWLER_META_BY_SLUG["microsoft"], runs);
  assert.equal(r.meta?.kind, "api");
  // 50 base + 20 adaptive + 20 fixture + 10 no-drift + 10 recent = 110, clamped to 100.
  assert.equal(r.score, 100);
  assert.equal(r.grade, "A+");
});

test("scoreFleet aggregates and sorts lowest-grade first", () => {
  const companies: CompanyRow[] = [google, microsoft];
  const runsByCompany = new Map<string, CrawlRunRow[]>([
    [google.id, [run("success", 1), run("success", 25)]],
    [microsoft.id, [run("failed", 1), run("failed", 25)]],
  ]);
  const { overall, perCompany } = scoreFleet(companies, runsByCompany);
  // microsoft (drift) sorts first.
  assert.equal(perCompany[0].company.slug, "microsoft");
  assert.equal(perCompany[1].company.slug, "google");
  // adaptiveCoverage + fixtureCoverage are computed over html-dom crawlers only.
  assert.ok(overall.adaptiveCoverage > 0);
  assert.ok(overall.adaptiveCoverage <= 1);
  assert.ok(overall.fixtureCoverage > 0);
  assert.ok(overall.fixtureCoverage <= 1);
  assert.ok(overall.companiesAtRisk >= 1);
  assert.equal(overall.byKind.htmlDom, 4);
  assert.ok(overall.byKind.api >= 12);
});

test("scoreFleet handles unknown slugs gracefully", () => {
  const ghost: CompanyRow = { id: "ghost", name: "Ghost", slug: "ghost-corp" };
  const { perCompany } = scoreFleet([ghost], new Map());
  assert.equal(perCompany[0].meta, null);
});
