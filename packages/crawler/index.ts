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
import { upsertJobs, markStaleJobsGuarded, recordCrawlRun } from "./pipeline/upsert.js";
import { enrichWithParse, dryRunParse } from "./pipeline/parse.js";
import { adminClient } from "./lib/supabase.js";
import { log, makeLogger } from "./lib/logger.js";
import { maybeFireDriftAlert } from "./lib/drift-alert.js";

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

  // Fail fast on missing keys when we're about to write to DB. The inline
  // parse step needs Gemini; without it we'd silently insert thousands of
  // unparsed rows. Skipped in --dry-run (no parse) but enforced for
  // --dry-run-parse (which DOES call Gemini).
  if (!dryRun) {
    const keys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      log(
        "GEMINI_API_KEY is not set. The inline JD parse needs at least one key. " +
        "Set GEMINI_API_KEY (comma-separated for rotation) in the runner env / GitHub secrets.",
        "error",
      );
      process.exit(2);
    }
    log(`Detected ${keys.length} Gemini API key${keys.length === 1 ? "" : "s"} — worker pool will rotate.`);
  }

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

  const results: Array<{ slug: string; inserted: number; updated: number; stale: number; partial: boolean; error: string | null }> = [];

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
      let coverageSkipped = false;

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
          const { jobs: enriched, skippedBudget, skippedQuota, rejectedNonEng } =
            await enrichWithParse(supabase, companyId, companyName, normalized, cLog);
          const result = await upsertJobs(supabase, companyId, enriched);
          inserted = result.inserted;
          updated = result.updated;
          // Coverage = (normalized jobs we actually saw) / (previously active).
          // We pass the pre-rejection `normalized.length` so a one-time
          // tightening of the non-engineering filter doesn't false-trip the
          // 60% guard.
          const staleRes = await markStaleJobsGuarded(
            supabase, companyId, runStarted, normalized.length,
          );
          stale = staleRes.marked;
          coverageSkipped = staleRes.skipped;
          const skipNote = skippedBudget + skippedQuota > 0
            ? `  (${skippedBudget} budget-skip, ${skippedQuota} quota-skip — will retry next crawl)`
            : "";
          const rejNote = rejectedNonEng > 0 ? `, Rejected: ${rejectedNonEng} (non-eng)` : "";
          const partialNote = coverageSkipped
            ? `  ⚠ partial run — stale-mark skipped (coverage ${(staleRes.coverage * 100).toFixed(0)}% of ${staleRes.previouslyActive})`
            : "";
          cLog(`Inserted: ${inserted}, Updated: ${updated}, Stale: ${stale}${rejNote}${skipNote}${partialNote}`);
        } else if (dryRun) {
          cLog(`[DRY RUN] Would upsert ${normalized.length} jobs`);
        }
      } catch (err) {
        crawlError = err instanceof Error ? err.message : String(err);
        cLog(`Crawl failed: ${crawlError}`, "error");
      } finally {
        await ctx.close();
      }

      const finalStatus: "success" | "partial" | "failed" =
        crawlError ? "failed" : (coverageSkipped ? "partial" : "success");

      if (!dryRun && !dryParse) {
        await recordCrawlRun(supabase, {
          company_id: companyId,
          started_at: runStarted.toISOString(),
          finished_at: new Date().toISOString(),
          jobs_seen: 0,
          jobs_new: inserted,
          jobs_updated: updated,
          jobs_marked_stale: stale,
          status: finalStatus,
          error: crawlError,
        });

        // Sprint 3 Item 11 — fire drift webhook when this run failed, or
        // when 'partial' twice in a row. No-op if CRAWL_ALERT_WEBHOOK_URL
        // isn't set. Never throws — webhook failure is logged, not raised.
        if (finalStatus !== "success") {
          const detailLine = crawlError
            ? `Crawl error: ${crawlError}`
            : `+${inserted} new · ~${updated} updated · -${stale} stale${coverageSkipped ? " · stale-mark SKIPPED (low coverage)" : ""}`;
          try {
            const alert = await maybeFireDriftAlert(supabase, {
              thisStatus:  finalStatus,
              companyId,
              companyName,
              companySlug: slug,
              detailLine,
            });
            if (alert.fired) {
              cLog(`drift alert fired: ${alert.reason}`, "warn");
            } else if (alert.reason && alert.reason !== "healthy" && alert.reason !== "no_webhook_configured") {
              cLog(`drift alert skipped: ${alert.reason}`, "warn");
            }
          } catch (err) {
            cLog(`drift alert threw (ignored): ${(err as Error).message}`, "warn");
          }
        }
      }

      results.push({ slug, inserted, updated, stale, partial: coverageSkipped, error: crawlError });
    }
  } finally {
    await browser.close();
  }

  log("─".repeat(60));
  log("Crawl complete:");
  for (const r of results) {
    const status = r.error
      ? `ERROR: ${r.error}`
      : `+${r.inserted} new  ~${r.updated} updated  -${r.stale} stale${r.partial ? "  ⚠PARTIAL" : ""}`;
    log(`  ${r.slug.padEnd(15)} ${status}`);
  }

  const hasError = results.some((r) => r.error);
  process.exit(hasError ? 1 : 0);
}

main().catch((err) => {
  log(String(err), "error");
  process.exit(1);
});
