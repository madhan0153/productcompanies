/**
 * CLI entrypoint for the ProdMatch crawler.
 * Usage: tsx index.ts [--slugs=google,microsoft,...] [--dry-run]
 *
 * Required env vars:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { chromium, type Browser } from "playwright";
import { COMPANY_CONFIGS, ALL_SLUGS } from "./companies/index.js";
import { normalizeJob } from "./pipeline/normalize.js";
import { upsertJobs, markStaleJobs, recordCrawlRun } from "./pipeline/upsert.js";
import { adminClient } from "./lib/supabase.js";
import { log, makeLogger } from "./lib/logger.js";

// ── Parse args ──────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const slugsArg = args.find((a) => a.startsWith("--slugs="));
  const dryRun = args.includes("--dry-run");
  const slugs = slugsArg
    ? slugsArg.replace("--slugs=", "").split(",").map((s) => s.trim()).filter(Boolean)
    : ALL_SLUGS;
  return { slugs, dryRun };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { slugs, dryRun } = parseArgs();
  log(`Starting crawl for: ${slugs.join(", ")}${dryRun ? " [DRY RUN]" : ""}`);

  const supabase = adminClient();

  // Pre-fetch all company IDs from DB
  const { data: companies, error: dbErr } = await supabase
    .from("companies")
    .select("id, slug")
    .in("slug", slugs);

  if (dbErr) throw new Error(`Failed to fetch companies: ${dbErr.message}`);

  const companyIdBySlug = new Map((companies ?? []).map((c) => [c.slug, c.id]));

  // Warn about slugs not in DB
  for (const slug of slugs) {
    if (!companyIdBySlug.has(slug)) {
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
      const companyId = companyIdBySlug.get(slug);
      if (!companyId) continue;

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

        if (!dryRun && normalized.length > 0) {
          const result = await upsertJobs(supabase, companyId, normalized);
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

      if (!dryRun) {
        await recordCrawlRun(supabase, {
          company_id: companyId,
          started_at: runStarted.toISOString(),
          finished_at: new Date().toISOString(),
          jobs_seen: 0, // raw count not tracked here; normalized count used
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

  // Summary
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
