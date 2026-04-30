/**
 * Quick smoke test: hit real APIs for the fetch-based companies.
 * No Playwright, no DB. Just verifies the APIs return parseable data.
 * Run: tsx test-apis.ts
 */

import { googleConfig } from "./companies/google.js";
import { microsoftConfig } from "./companies/microsoft.js";
import { amazonConfig } from "./companies/amazon.js";
import { appleConfig } from "./companies/apple.js";
import { atlassianConfig } from "./companies/atlassian.js";
import { razorpayConfig } from "./companies/razorpay.js";
import { nvidiaConfig } from "./companies/nvidia.js";
import { salesforceConfig } from "./companies/salesforce.js";
import { normalizeJob } from "./pipeline/normalize.js";
import type { CrawlContext } from "./companies/_types.js";

// Stub page — API-based companies never call page methods
const stubPage = {} as import("playwright").Page;

const configs = [
  googleConfig,
  microsoftConfig,
  amazonConfig,
  appleConfig,
  atlassianConfig,
  razorpayConfig,
  nvidiaConfig,
  salesforceConfig,
];

async function testOne(config: (typeof configs)[number]) {
  const slug = config.slug;
  const ctx: CrawlContext = {
    page: stubPage,
    log: (msg, level = "info") => {
      if (level !== "info") console.log(`  [${level}] ${msg}`);
    },
  };

  const start = Date.now();
  try {
    const jobs = await config.crawl(ctx);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (jobs.length === 0) {
      console.log(`⚠  ${slug.padEnd(15)} 0 jobs in ${elapsed}s — API may have changed`);
      return;
    }

    // Normalize a sample
    const FAKE_UUID = "00000000-0000-0000-0000-000000000000";
    const normalized = jobs
      .slice(0, 5)
      .map((j) => normalizeJob(j, FAKE_UUID))
      .filter((j) => j.hubs.length > 0);

    const sample = normalized[0];
    console.log(`✓  ${slug.padEnd(15)} ${jobs.length} jobs  →  ${normalized.length} India (sample: ${sample?.hubs.join(", ") ?? "none"}) [${elapsed}s]`);
    if (sample) {
      console.log(`   title:    ${sample.title}`);
      console.log(`   location: ${sample.location}`);
      console.log(`   seniority:${sample.seniority ?? "-"}  exp:${sample.min_experience_years ?? "?"}–${sample.max_experience_years ?? "?"} yrs`);
      console.log(`   tech:     ${sample.tech_stack.slice(0, 6).join(", ") || "(none detected)"}`);
    }
  } catch (err) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`✗  ${slug.padEnd(15)} ERROR in ${elapsed}s: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function main() {
  console.log("Testing API-based company crawlers (no Playwright, no DB)...\n");
  for (const config of configs) {
    await testOne(config);
    console.log();
  }
}

main().catch(console.error);
