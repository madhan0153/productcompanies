import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ALL_SLUGS, COMPANY_CONFIGS } from "./companies/index.js";

// Tripwire: must equal the canonical ALL_SLUGS registry (CLAUDE.md's 51
// approved product companies). Update this list deliberately whenever an
// approved company is added/removed so the change is reviewed, never silent.
const EXPECTED_CRAWLER_SLUGS = [
  "adobe",
  "amazon",
  "apple",
  "arcesium",
  "atlassian",
  "browserstack",
  "cars24",
  "chargebee",
  "clevertap",
  "cred",
  "delhivery",
  "dream11",
  "flipkart",
  "freshworks",
  "google",
  "groww",
  "inmobi",
  "intuit",
  "lenskart",
  "meesho",
  "meta",
  "microsoft",
  "moengage",
  "myntra",
  "nobroker",
  "nvidia",
  "nykaa",
  "ola",
  "oracle",
  "paypal",
  "paytm",
  "phonepe",
  "pine-labs",
  "policybazaar",
  "postman",
  "practo",
  "razorpay",
  "salesforce",
  "sap-labs",
  "servicenow",
  "sharechat",
  "stripe",
  "swiggy",
  "uber",
  "udaan",
  "unacademy",
  "wingify",
  "yellow-ai",
  "zerodha",
  "zoho",
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
