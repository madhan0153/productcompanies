import type { Page } from "playwright";
import type { RawJob } from "@prodmatch/shared";

export interface CrawlContext {
  page: Page;
  log: (msg: string, level?: "info" | "warn" | "error") => void;
}

export interface CompanyConfig {
  slug: string;
  crawl: (ctx: CrawlContext) => Promise<RawJob[]>;
}

// Delay helper to be polite to servers
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail-page enrichment
// ─────────────────────────────────────────────────────────────────────────────
// Several career sites only expose the full JD on a per-job detail page (the
// listing endpoint just gives title + location). Without this, our JD parser
// has nothing to work with — must_have_skills / nice_to_have_skills end up
// empty and Fit Cards never get generated. This helper lets any crawler do a
// short, polite detail-page sweep with concurrency control.
//
// Strategy: open N concurrent tabs from the SAME browser context (cheaper
// than newContext per request), navigate, run the supplied extractor, write
// back into job.description.

export interface EnrichOptions {
  /** Max concurrent detail pages. Default 4 — most career sites tolerate this. */
  concurrency?: number;
  /** Per-page navigation timeout. Default 25s. */
  timeoutMs?: number;
  /** waitUntil for the page.goto. Default "load" — reliable on JS-rendered portals. */
  waitUntil?: "load" | "domcontentloaded" | "networkidle" | "commit";
  /** Total wall-clock budget. Default 6 minutes. */
  budgetMs?: number;
  /** Pause between batches to be nice. Default 200ms. */
  delayMs?: number;
  /** Grace period after navigation for late-rendering JS content. Default 600ms. */
  extraWaitMs?: number;
}

/**
 * Visit each job's apply_url, run the extractor function inside the page, and
 * fill in `description`. Skips jobs that already have a non-trivial description.
 * Failures are logged and the job is left as-is (cheaper to retry next crawl
 * than to die mid-batch).
 */
export async function enrichDescriptions(
  ctx: CrawlContext,
  jobs: RawJob[],
  extractor: () => Promise<string>,
  opts: EnrichOptions = {},
): Promise<void> {
  const { page, log } = ctx;
  const browser = page.context().browser();
  if (!browser) {
    log("enrichDescriptions: no browser handle on page; skipping", "warn");
    return;
  }
  const ctxBrowser = page.context();

  const concurrency = opts.concurrency ?? 4;
  const timeoutMs   = opts.timeoutMs ?? 25_000;
  // 'load' waits for the document load event — slower than domcontentloaded
  // but reliable on JS-rendered career portals (SAP, Apple, Atlassian) where
  // the JD body is injected after initial parse.
  const waitUntil   = opts.waitUntil ?? "load";
  const budgetMs    = opts.budgetMs ?? 360_000;
  const delayMs     = opts.delayMs ?? 200;
  const extraWaitMs = opts.extraWaitMs ?? 600; // grace period for late-rendering content

  // Only consider jobs that need a body AND have a navigable URL. We've seen
  // career APIs ship empty / relative / "n/a" values that crash page.goto with
  // "Cannot navigate to invalid URL" 184 times in a row.
  const isValidUrl = (u: string | null | undefined): boolean => {
    if (!u || typeof u !== "string") return false;
    if (!/^https?:\/\//i.test(u)) return false;
    try { new URL(u); return true; } catch { return false; }
  };
  const queue = jobs.filter((j) => (j.description ?? "").length < 60 && isValidUrl(j.apply_url));
  const skippedNoUrl = jobs.filter((j) => (j.description ?? "").length < 60 && !isValidUrl(j.apply_url)).length;
  if (skippedNoUrl > 0) {
    log(`enrich: skipping ${skippedNoUrl} jobs with invalid/missing apply_url`, "warn");
  }
  if (queue.length === 0) return;

  const startedAt = Date.now();
  let done = 0, ok = 0, errs = 0, emptyExtractions = 0;
  let budgetTripped = false;

  const worker = async () => {
    const detailPage = await ctxBrowser.newPage();
    try {
      while (queue.length > 0) {
        if (Date.now() - startedAt > budgetMs) {
          // Don't silently abandon — the prior version of this worker simply
          // `return`-ed when the budget tripped, leaving the queue length
          // un-accounted-for in the final summary. The result was lines like
          // "Enriched descriptions: 107/165 | errors=0" where 58 jobs vanished
          // with no error trail. Mark the flag once; the queue gets drained
          // by the final accounting below.
          budgetTripped = true;
          return;
        }
        const job = queue.shift();
        if (!job?.apply_url) continue;
        try {
          await detailPage.goto(job.apply_url!, { waitUntil, timeout: timeoutMs });
          if (extraWaitMs > 0) await sleep(extraWaitMs);
          const text = await detailPage.evaluate(extractor) as unknown as string;
          if (typeof text === "string" && text.length >= 60) {
            job.description = text.slice(0, 12_000); // cap; some pages dump the entire careers page
            ok++;
          } else {
            // Extractor returned <60 chars — selector miss, not a navigation
            // failure. Count it explicitly so the run summary tells the truth.
            emptyExtractions++;
          }
        } catch (err) {
          errs++;
          if (errs <= 3) log(`detail err [${job.title.slice(0, 40)}]: ${(err as Error).message.split("\n")[0]}`, "warn");
        }
        done++;
        if (done % 25 === 0) log(`  enrich progress: ${done}/${jobs.length} | ok=${ok} err=${errs}`);
        if (delayMs > 0) await sleep(delayMs);
      }
    } finally {
      await detailPage.close().catch(() => {});
    }
  };

  await Promise.allSettled(Array.from({ length: concurrency }, worker));

  // Anything still in the queue was abandoned because the budget tripped
  // (workers return early). Account for it in the summary so 107/165 with
  // errors=0 is never the answer again.
  const budgetAbandoned = queue.length;
  if (budgetTripped || budgetAbandoned > 0) {
    log(
      `enrich budget tripped after ${Math.round((Date.now() - startedAt)/1000)}s — ${budgetAbandoned} job(s) deferred to next crawl`,
      "warn",
    );
  }
  if (emptyExtractions > 0) {
    log(
      `enrich: ${emptyExtractions} job(s) loaded but extractor returned <60 chars — selector may need updating`,
      "warn",
    );
  }
  log(
    `Enriched descriptions: ${ok}/${jobs.length} | errors=${errs}` +
    (emptyExtractions > 0 ? ` | empty=${emptyExtractions}` : "") +
    (budgetAbandoned > 0 ? ` | abandoned=${budgetAbandoned}` : "") +
    ` | ${Math.round((Date.now() - startedAt)/1000)}s`,
  );
}
