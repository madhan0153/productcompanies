/**
 * CLI entrypoint for the ProdMatch crawler.
 *
 * Flags:
 *   --slugs=google,microsoft,...   Restrict to these companies (default: all).
 *   --dry-run                      Crawl + normalize, log counts, don't write.
 *   --dry-run-parse                Crawl + parse first 5 of each company,
 *                                  print structured JD output, don't write.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GEMINI_API_KEY (comma-separated for key rotation)
 */

import { chromium, type Browser } from "playwright";
import { COMPANY_CONFIGS, ALL_SLUGS } from "./companies/index.js";
import { normalizeJob } from "./pipeline/normalize.js";
import { upsertJobs, markStaleJobs, recordCrawlRun } from "./pipeline/upsert.js";
import { enrichWithParse, dryRunParse } from "./pipeline/parse.js";
import { adminClient } from "./lib/supabase.js";
import { log, makeLogger } from "./lib/logger.js";

// ── Parse args ──────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const slugsArg = args.find((a) => a.startsWith("--slugs="));
  const dryRun = args.includes("--dry-run");
  const dryRunParse = args.includes("--dry-run-parse");
  const slugs = slugsArg
    ? slugsArg.replace("--slugs=", "").split(",").map((s) => s.trim()).filter(Boolean)
    : ALL_SLUGS;
  return { slugs, dryRun, dryRunParse };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { slugs, dryRun, dryRunParse: dryParse } = parseArgs();
  const mode = dryParse ? " [DRY-RUN-PARSE]" : dryRun ? " [DRY RUN]" : "";
  log(`Starting crawl for: ${slugs.join(", ")}${mode}`);

  const supabase = adminClient();

  const { data: companies, error: dbErr } = await supabase
    .from("companies")
    .select("id, slug, name")
    .in("slug", slugs);

  if (dbErr) throw new Error(`Failed to fetch companies: ${dbErr.message}`);

  const companyMetaBySlug = new Map(
    (companies ?? []).map((c) => [c.slug, { id: c.id as string, name: c.name as string }]),
  );

  for (const slug of slugs) {
    if (!companyMetaBySlug.has(slug)) {
      log(`Company slug not found in DB: ${slug} — skipping`, "warn");
    }
  }

  const browser: Browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results: Array<{ slug: string; inserted: number; updated: number; stale: number; error: string | null }> = [];

  try {
    for (const slug of slugs) {
      const meta = companyMetaBySlug.get(slug);
      if (!meta) continue;
      const { id: companyId, name: companyName } = meta;

      const config = COMPANY_CONFIGS[slug];
      if (!config) {
        log(`No crawler config for: ${slug}`, "warn");
        continue;
      }

      const cLog = makeLogger(slug);
      const runStarted = new Date();
      let crawlError: string | null = null;
      let inserted = 0;
      let updated = 0;
      let stale = 0;

      const ctx = await browser.newContext({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
      });
      const page = await ctx.newPage();

      try {
        cLog(`Crawling...`);
        const rawJobs = await config.crawl({ page, log: cLog });
        cLog(`Scraped ${rawJobs.length} raw jobs`);

        const normalized = rawJobs
          .map((j) => normalizeJob(j, companyId))
          .filter((j) => j.hubs.length > 0 && j.title.length > 0 && j.external_id.length > 0);

        cLog(`${normalized.length} India jobs after normalization`);

        if (dryParse) {
          await dryRunParse(normalized, companyName, cLog, 5);
        } else if (!dryRun && normalized.length > 0) {
          // Inline parse + embed BEFORE upsert. Decision is per-job:
          // skip if already parsed and signature unchanged; (re-)parse
          // otherwise. New jobs go in fully-parsed; updated jobs whose
          // description changed get re-parsed.
          const enriched = await enrichWithParse(supabase, companyId, companyName, normalized, cLog);
          const result = await upsertJobs(supabase, companyId, enriched);
          inserted = result.inserted;
          updated = result.updated;
          stale = await markStaleJobs(supabase, companyId, runStarted);
          cLog(`Inserted: ${inserted}, Updated: ${updated}, Stale: ${stale}`);
        } else if (dryRun) {
          cLog(`[DRY RUN] Would upsert ${normalized.length} jobs`);
        }
      } catch (err) {
        crawlError = err instanceof Error ? err.message : String(err);
        cLog(`Crawl failed: ${crawlError}`, "error");
      } finally {
        await ctx.close();
      }

      if (!dryRun && !dryParse) {
        await recordCrawlRun(supabase, {
          company_id: companyId,
          started_at: runStarted.toISOString(),
          finished_at: new Date().toISOString(),
          jobs_seen: 0,
          jobs_new: inserted,
          jobs_updated: updated,
          jobs_marked_stale: stale,
          status: crawlError ? "failed" : "success",
          error: crawlError,
        });
      }

      results.push({ slug, inserted, updated, stale, error: crawlError });
    }
  } finally {
    await browser.close();
  }

  log("─".repeat(60));
  log("Crawl complete:");
  for (const r of results) {
    const status = r.error ? `ERROR: ${r.error}` : `+${r.inserted} new  ~${r.updated} updated  -${r.stale} stale`;
    log(`  ${r.slug.padEnd(15)} ${status}`);
  }

  const hasError = results.some((r) => r.error);
  process.exit(hasError ? 1 : 0);
}

main().catch((err) => {
  log(String(err), "error");
  process.exit(1);
});
