/**
 * Smoke test for Playwright-based crawlers (needs real browser).
 * Tests one company at a time to keep runtime short.
 * Run: tsx test-playwright.ts [--slug=google]
 */

import { chromium } from "playwright";
import { COMPANY_CONFIGS } from "./companies/index.js";
import { normalizeJob } from "./pipeline/normalize.js";
import { makeLogger } from "./lib/logger.js";

const FAKE_UUID = "00000000-0000-0000-0000-000000000000";

// Companies that use Playwright (for focused testing)
const PLAYWRIGHT_SLUGS = ["google", "microsoft", "apple", "atlassian", "razorpay"];

async function testOne(slug: string) {
  const config = COMPANY_CONFIGS[slug];
  if (!config) { console.log(`Unknown slug: ${slug}`); return; }

  const log = makeLogger(slug);
  console.log(`\nTesting ${slug} (Playwright)...`);

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  const page = await ctx.newPage();
  const start = Date.now();

  try {
    const jobs = await config.crawl({ page, log });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (jobs.length === 0) {
      console.log(`⚠  ${slug}: 0 jobs in ${elapsed}s`);
      return;
    }

    const normalized = jobs
      .slice(0, 5)
      .map((j) => normalizeJob(j, FAKE_UUID))
      .filter((j) => j.hubs.length > 0);

    console.log(`✓  ${slug}: ${jobs.length} jobs, ${normalized.length}/5 with India hubs [${elapsed}s]`);
    const s = normalized[0];
    if (s) {
      console.log(`   title:    ${s.title}`);
      console.log(`   location: ${s.location}`);
      console.log(`   hubs:     ${s.hubs.join(", ")}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✗  ${slug}: ERROR in ${elapsed}s — ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await ctx.close();
    await browser.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith("--slug="))?.replace("--slug=", "");
  const slugs = slugArg ? [slugArg] : PLAYWRIGHT_SLUGS.slice(0, 2); // default: test first 2

  console.log(`Testing Playwright crawlers: ${slugs.join(", ")}\n`);
  for (const slug of slugs) {
    await testOne(slug);
  }
}

main().catch(console.error);
