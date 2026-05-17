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
 *
 * Optional env:
 *   CRAWL_RUN_ID             — surfaces in every log line for correlation.
 *   CRAWL_ALERT_WEBHOOK_URL  — Slack/Discord webhook for drift alerts.
 *   PER_COMPANY_TIMEOUT_MS   — wall-clock budget per company. Default 45min.
 */

import { chromium, type Browser } from "playwright";
import { logKeyRoster } from "@prodmatch/shared";
import { COMPANY_CONFIGS, ALL_SLUGS } from "./companies/index.js";
import { normalizeJob } from "./pipeline/normalize.js";
import { upsertJobs, markStaleJobsGuarded, recordCrawlRun } from "./pipeline/upsert.js";
import { enrichWithParse, dryRunParse } from "./pipeline/parse.js";
import { adminClient } from "./lib/supabase.js";
import { log, makeLogger } from "./lib/logger.js";
import { pickUserAgent } from "./lib/http.js";
import { maybeFireDriftAlert } from "./lib/drift-alert.js";

// ── Args ──────────────────────────────────────────────────────────────────

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

// Per-company wall-clock budget. Default 45 min; one stuck career site
// cannot consume the whole workflow.
const PER_COMPANY_TIMEOUT_MS = (() => {
  const v = parseInt(process.env.PER_COMPANY_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(v) && v > 0 ? v : 45 * 60 * 1000;
})();

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Race the company's crawl against a deadline. On timeout, close the
 * Playwright browser — any in-flight `page.goto` rejects immediately and
 * the crawl promise unblocks. Without this a stuck career site can pin
 * the runner until the workflow's 350-min cap.
 */
async function withCompanyTimeout<T>(
  fn: () => Promise<T>,
  closeBrowser: () => Promise<void>,
  timeoutMs: number,
  onTimeout: () => void,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onTimeout();
      closeBrowser().catch(() => { /* best-effort */ });
      reject(new Error(`crawl timed out after ${Math.round(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  const { slugs, dryRun, dryRunParse: dryParse } = parseArgs();
  const mode = dryParse ? " [DRY-RUN-PARSE]" : dryRun ? " [DRY RUN]" : "";
  log(`Starting crawl for: ${slugs.join(", ")}${mode}`, "info", {
    event: "crawl_start",
    data: { slugs, dryRun, dryParse, perCompanyTimeoutMs: PER_COMPANY_TIMEOUT_MS },
  });

  // Fail fast on missing keys when we're about to write to DB.
  if (!dryRun) {
    const keys = (process.env.GEMINI_API_KEY ?? "").split(",").map((k) => k.trim()).filter(Boolean);
    if (keys.length === 0) {
      log(
        "GEMINI_API_KEY is not set. The inline JD parse needs at least one key. " +
        "Set GEMINI_API_KEY (comma-separated for rotation) in the runner env / GitHub secrets.",
        "error",
        { event: "missing_key" },
      );
      process.exit(2);
    }
    log(`Detected ${keys.length} Gemini API key(s) — worker pool will rotate.`, "info", {
      event: "keys_loaded",
      data: { keyCount: keys.length },
    });
    // Print the masked roster so the run log proves which keys are actually
    // configured (suffixes differ across keys → independent quota counters).
    // logKeyRoster() emits one line to stdout that interleaves with the
    // structured logger; per-key "first call ok" lines follow as the workers
    // touch each key for the first time.
    logKeyRoster();
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
      log(`Company slug not found in DB: ${slug} — skipping`, "warn", { event: "unknown_slug", data: { slug } });
    }
  }

  interface CompanyResult {
    slug: string;
    inserted: number;
    updated: number;
    stale: number;
    partial: boolean;
    timedOut: boolean;
    error: string | null;
  }
  const results: CompanyResult[] = [];

  for (const slug of slugs) {
    const meta = companyMetaBySlug.get(slug);
    if (!meta) continue;
    const { id: companyId, name: companyName } = meta;

    const config = COMPANY_CONFIGS[slug];
    if (!config) {
      log(`No crawler config for: ${slug}`, "warn", { event: "unknown_config", data: { slug } });
      continue;
    }

    const cLog = makeLogger(slug);
    const runStarted = new Date();
    let crawlError: string | null = null;
    let inserted = 0;
    let updated = 0;
    let stale = 0;
    let coverageSkipped = false;
    let timedOut = false;

    // Per-company browser instance. Launching fresh per company isolates
    // crashes (one company's hang/OOM doesn't pin the next 17). Cost is
    // ~1-2s per launch, ~36s total across 18 companies — worth it.
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const browserRef = browser;
      const ctx = await browserRef.newContext({
        userAgent: pickUserAgent(),
        extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
      });
      const page = await ctx.newPage();

      const t0 = Date.now();
      cLog(`Crawling…`, "info", { event: "company_start" });

      // Wrap the entire company scrape + parse + upsert in a wall-clock
      // budget. On timeout, browser is closed and the inner promise
      // rejects with a clear error.
      const rawJobs = await withCompanyTimeout(
        () => config.crawl({ page, log: cLog }),
        () => browserRef.close(),
        PER_COMPANY_TIMEOUT_MS,
        () => { timedOut = true; },
      );
      cLog(`Scraped ${rawJobs.length} raw jobs in ${Math.round((Date.now() - t0) / 1000)}s`, "info", {
        event: "scrape_done",
        data: { rawCount: rawJobs.length },
      });

      const normalized = rawJobs
        .map((j) => normalizeJob(j, companyId))
        .filter((j) => j.hubs.length > 0 && j.title.length > 0 && j.external_id.length > 0);

      cLog(`${normalized.length} India jobs after normalization`, "info", {
        event: "normalize_done",
        data: { kept: normalized.length, dropped: rawJobs.length - normalized.length },
      });

      if (dryParse) {
        await dryRunParse(normalized, companyName, cLog, 5);
      } else if (!dryRun && normalized.length > 0) {
        // Inline parse + embed BEFORE upsert.
        const { jobs: enriched, parseOk, parseErr, skippedBudget, skippedQuota, rejectedNonEng } =
          await enrichWithParse(supabase, companyId, companyName, normalized, cLog);
        const result = await upsertJobs(supabase, companyId, enriched);
        inserted = result.inserted;
        updated = result.updated;
        const staleRes = await markStaleJobsGuarded(
          supabase, companyId, runStarted, normalized.length,
        );
        stale = staleRes.marked;
        coverageSkipped = staleRes.skipped;
        cLog(
          `Inserted: ${inserted}, Updated: ${updated}, Stale: ${stale}` +
          (rejectedNonEng > 0 ? `, Rejected: ${rejectedNonEng}` : "") +
          (skippedBudget + skippedQuota > 0 ? `, deferred: ${skippedBudget + skippedQuota}` : "") +
          (coverageSkipped ? `  ⚠ partial — stale-mark skipped` : ""),
          "info",
          {
            event: "company_done",
            data: {
              inserted, updated, stale,
              parseOk, parseErr, skippedBudget, skippedQuota, rejectedNonEng,
              coverageSkipped,
              elapsedMs: Date.now() - t0,
            },
          },
        );
      } else if (dryRun) {
        cLog(`[DRY RUN] Would upsert ${normalized.length} jobs`, "info", {
          event: "dryrun_done",
          data: { wouldUpsert: normalized.length },
        });
      }
    } catch (err) {
      crawlError = err instanceof Error ? err.message : String(err);
      cLog(`Crawl failed: ${crawlError}`, "error", { event: "company_error", data: { error: crawlError, timedOut } });
    } finally {
      // browser may already be closed (timeout path) but close() is idempotent.
      if (browser) await browser.close().catch(() => { /* best-effort */ });
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

      // Drift alert.
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
            cLog(`drift alert fired: ${alert.reason}`, "warn", { event: "drift_alert_fired", data: { reason: alert.reason } });
          } else if (alert.reason && alert.reason !== "healthy" && alert.reason !== "no_webhook_configured") {
            cLog(`drift alert skipped: ${alert.reason}`, "warn", { event: "drift_alert_skipped", data: { reason: alert.reason } });
          }
        } catch (err) {
          cLog(`drift alert threw (ignored): ${(err as Error).message}`, "warn", { event: "drift_alert_error" });
        }
      }
    }

    results.push({ slug, inserted, updated, stale, partial: coverageSkipped, timedOut, error: crawlError });
  }

  // ── Final summary ───────────────────────────────────────────────────────
  log("─".repeat(60));
  log("Crawl complete:", "info", { event: "crawl_complete" });

  let okCount = 0;
  let partialCount = 0;
  let failedCount = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalStale = 0;

  for (const r of results) {
    const status = r.error
      ? (r.timedOut ? `TIMEOUT: ${r.error}` : `ERROR: ${r.error}`)
      : `+${r.inserted} new  ~${r.updated} updated  -${r.stale} stale${r.partial ? "  ⚠PARTIAL" : ""}`;
    log(`  ${r.slug.padEnd(15)} ${status}`);

    if (r.error) failedCount++;
    else if (r.partial) partialCount++;
    else okCount++;
    totalInserted += r.inserted;
    totalUpdated += r.updated;
    totalStale += r.stale;
  }

  log(
    `Summary: ${okCount} ok, ${partialCount} partial, ${failedCount} failed | ` +
    `+${totalInserted} new, ~${totalUpdated} updated, -${totalStale} stale`,
    "info",
    {
      event: "crawl_summary",
      data: { okCount, partialCount, failedCount, totalInserted, totalUpdated, totalStale, attempted: results.length },
    },
  );

  // Smarter exit code: only fail the workflow when ZERO companies
  // succeeded. Partial / mixed runs are not red — they're "degraded" and
  // the drift webhook + admin/health page already flag them.
  const anyOk = okCount + partialCount > 0;
  process.exit(anyOk ? 0 : 1);
}

main().catch((err) => {
  log(String(err), "error", { event: "fatal" });
  process.exit(1);
});
