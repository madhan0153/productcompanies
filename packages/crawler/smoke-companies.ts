import { chromium } from "playwright";
import { COMPANY_CONFIGS } from "./companies/index.js";

const DEFAULT_SLUGS = [
  "arcesium",
  "chargebee",
  "clevertap",
  "delhivery",
  "lenskart",
  "myntra",
  "nykaa",
  "ola",
  "paytm",
  "policybazaar",
  "zoho",
  "moengage",
  "nobroker",
  "pine-labs",
  "practo",
  "sharechat",
  "udaan",
  "wingify",
  "yellow-ai",
];

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  return process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

const slugs = (arg("slugs")?.split(",").map((slug) => slug.trim()).filter(Boolean)) ?? DEFAULT_SLUGS;
const limit = Number(arg("limit") ?? "5");

async function main(): Promise<void> {
  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();

  let failures = 0;
  for (const slug of slugs) {
    const config = COMPANY_CONFIGS[slug];
    if (!config) {
      failures++;
      console.log(`\n${slug}: MISSING_CONFIG`);
      continue;
    }

    const logs: string[] = [];
    const started = Date.now();
    try {
      const jobs = await config.crawl({
        page,
        log: (message, level = "info") => logs.push(`${level.toUpperCase()}: ${message}`),
      });
      const sample = jobs.slice(0, limit);
      const status = sample.length > 0 ? "OK" : "ZERO";
      if (sample.length === 0) failures++;
      console.log(`\n${slug}: ${status} ${sample.length}/${jobs.length} shown in ${Math.round((Date.now() - started) / 1000)}s`);
      for (const line of logs.slice(-5)) console.log(`  ${line}`);
      for (const job of sample) {
        console.log(`  - ${job.title} | ${job.location_raw || "n/a"} | ${job.apply_url ?? "n/a"}`);
      }
    } catch (error) {
      failures++;
      console.log(`\n${slug}: ERROR ${(error as Error).message.split("\n")[0]}`);
      for (const line of logs.slice(-5)) console.log(`  ${line}`);
    }
  }

  await browser.close().catch(() => {});

  if (failures > 0) {
    process.exitCode = 1;
  }
}

void main();
