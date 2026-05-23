import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ALL_SLUGS, COMPANY_CONFIGS } from "./companies/index.js";

const EXPECTED_CRAWLER_SLUGS = [
  "adobe",
  "amazon",
  "apple",
  "atlassian",
  "browserstack",
  "cars24",
  "cred",
  "dream11",
  "flipkart",
  "freshworks",
  "google",
  "groww",
  "inmobi",
  "intuit",
  "meesho",
  "meta",
  "microsoft",
  "nvidia",
  "oracle",
  "paypal",
  "phonepe",
  "postman",
  "razorpay",
  "salesforce",
  "sap-labs",
  "servicenow",
  "stripe",
  "swiggy",
  "uber",
  "unacademy",
  "zerodha",
  "zomato",
].sort();

const BANNED_SOURCE_PATTERNS = [
  "linkedin.com",
  "naukri.com",
  "indeed.com",
  "glassdoor.com",
  "monster.com",
  "foundit.in",
];

function assertEqual(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${name} mismatch\nactual:   ${a}\nexpected: ${e}`);
  }
}

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist") continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...sourceFiles(path));
    if (stat.isFile() && /\.(ts|js|json)$/.test(entry)) files.push(path);
  }
  return files;
}

assertEqual("crawler slugs", [...ALL_SLUGS].sort(), EXPECTED_CRAWLER_SLUGS);

const configSlugs = Object.entries(COMPANY_CONFIGS).map(([key, config]) => {
  if (key !== config.slug) {
    throw new Error(`Config key '${key}' does not match config.slug '${config.slug}'`);
  }
  return config.slug;
});
assertEqual("crawler config slugs", configSlugs.sort(), EXPECTED_CRAWLER_SLUGS);

const root = process.cwd();
const crawlerRoot = join(root, "packages", "crawler");
const offenders: string[] = [];

for (const file of sourceFiles(crawlerRoot)) {
  if (file.endsWith("source-invariants.ts")) continue;
  const text = readFileSync(file, "utf8").toLowerCase();
  for (const banned of BANNED_SOURCE_PATTERNS) {
    if (text.includes(banned)) {
      offenders.push(`${relative(root, file)} contains ${banned}`);
    }
  }
}

if (offenders.length > 0) {
  throw new Error(`Crawler source must not reference aggregator domains:\n${offenders.join("\n")}`);
}

console.log("crawler source invariants passed");
