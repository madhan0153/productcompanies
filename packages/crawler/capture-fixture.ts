// Adaptive crawler — fixture capture CLI.
//
// Usage:
//   pnpm capture-fixture --slug=google
//   pnpm capture-fixture --slug=apple
//
// What it does:
//   1. Navigates to the listing page for the given html-dom crawler.
//   2. Captures listing HTML to packages/crawler/__fixtures__/<slug>/listing.html.
//   3. Captures element fingerprints to .../fingerprints.json.
//   4. Runs a coarse PII redaction pass on the saved HTML.
//   5. Prints a checklist reminding the operator to hand-review before committing.
//
// Safety:
//   - Only runs against the official career-page URL declared below.
//   - Refuses non-html-dom slugs.
//   - Strips query params from URLs in the saved HTML.
//   - Replaces email- and phone-shaped strings with redaction tokens.
//   - DOES NOT auto-commit. The operator reviews and commits manually.

import { chromium, type Page } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { captureFingerprints } from "./lib/adaptive.js";
import {
  CRAWLER_META_BY_SLUG,
  HTML_DOM_SLUGS,
  type CrawlerMeta,
} from "@prodmatch/shared";

// ── Capture specs (one per html-dom crawler) ───────────────────────────────
//
// Each spec declares the listing URL + the logical selectors the live
// crawler relies on. We keep this colocated so the capture flow can drive
// any html-dom crawler without per-company refactors.

interface CaptureSpec {
  listingUrl: string;
  selectors: Record<string, string>;
  /** Optional pre-capture hook: wait for selector, click, etc. */
  prepare?: (page: Page) => Promise<void>;
}

const CAPTURE_SPECS: Record<string, CaptureSpec> = {
  google: {
    listingUrl: "https://www.google.com/about/careers/applications/jobs/results?location=India",
    selectors: { job_card: "li.lLd3Je", job_title: "h3.QJPWVe" },
    prepare: async (page) => {
      await page.waitForSelector("li.lLd3Je", { timeout: 30_000 }).catch(() => undefined);
    },
  },
  apple: {
    listingUrl: "https://jobs.apple.com/en-in/search?location=india-INDC",
    selectors: { job_link: "a.link-inline[href*='/details/']" },
    prepare: async (page) => {
      await page.waitForSelector("a.link-inline[href*='/details/']", { timeout: 30_000 }).catch(() => undefined);
    },
  },
  zerodha: {
    listingUrl: "https://zerodha.com/careers/",
    selectors: { job_link: 'a[href*="/careers/"]' },
    prepare: async (page) => {
      await page.waitForLoadState("domcontentloaded");
    },
  },
  zomato: {
    listingUrl: "https://eternal.zohorecruit.in/jobs/Careers",
    selectors: { job_card: ".cw-filter-joblist" },
    prepare: async (page) => {
      await page.waitForSelector(".cw-filter-joblist, .careers-nojob-text", { timeout: 30_000 }).catch(() => undefined);
    },
  },
};

// ── CLI parsing ────────────────────────────────────────────────────────────

function parseSlug(): string {
  const arg = process.argv.find((a) => a.startsWith("--slug="));
  const slug = arg?.replace("--slug=", "").trim() ?? "";
  if (!slug) {
    console.error("Usage: pnpm capture-fixture --slug=<slug>");
    console.error(`Known html-dom slugs: ${HTML_DOM_SLUGS.join(", ")}`);
    process.exit(2);
  }
  if (!HTML_DOM_SLUGS.includes(slug)) {
    const meta: CrawlerMeta | undefined = CRAWLER_META_BY_SLUG[slug];
    if (!meta) {
      console.error(`Unknown slug "${slug}". Approved slugs only.`);
    } else {
      console.error(
        `Slug "${slug}" is kind="${meta.kind}" — fixture capture is only meaningful for html-dom crawlers.`,
      );
    }
    process.exit(2);
  }
  if (!CAPTURE_SPECS[slug]) {
    console.error(`No CaptureSpec registered for "${slug}". Add one to capture-fixture.ts.`);
    process.exit(2);
  }
  return slug;
}

// ── PII redaction ──────────────────────────────────────────────────────────

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// Phone pattern: 7+ digits with optional separators (catches +91 numbers,
// Indian 10-digit, etc.) — intentionally over-aggressive on a captured fixture.
const PHONE_RE = /(?:\+?\d[\s\-.()]?){7,}\d/g;

function redactPii(html: string): { redacted: string; counts: { emails: number; phones: number; urls: number } } {
  let emails = 0;
  let phones = 0;
  let urls = 0;
  let redacted = html.replace(EMAIL_RE, () => {
    emails++;
    return "[REDACTED_EMAIL]";
  });
  redacted = redacted.replace(PHONE_RE, (m) => {
    // Don't redact short numbers that look like job IDs in URL paths.
    const digits = m.replace(/\D/g, "");
    if (digits.length < 8) return m;
    phones++;
    return "[REDACTED_PHONE]";
  });
  // Strip query strings from URLs in href/src attrs (search tokens, etc.).
  redacted = redacted.replace(/(href|src)="([^"]*)"/g, (_m, attr, url) => {
    if (url.includes("?")) {
      urls++;
      return `${attr}="${url.split("?")[0]}"`;
    }
    return `${attr}="${url}"`;
  });
  return { redacted, counts: { emails, phones, urls } };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const slug = parseSlug();
  const spec = CAPTURE_SPECS[slug];
  const outDir = join(__dirname, "__fixtures__", slug);

  console.log(`[capture] slug=${slug}`);
  console.log(`[capture] url=${spec.listingUrl}`);
  console.log(`[capture] out=${outDir}`);

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-http2",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  try {
    const ctx = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 900 },
    });
    const page = await ctx.newPage();

    console.log("[capture] navigating...");
    await page.goto(spec.listingUrl, { waitUntil: "networkidle", timeout: 60_000 });
    if (spec.prepare) await spec.prepare(page);
    // Small grace for JS-rendered listings.
    await page.waitForTimeout(2000);

    // ── 1. Capture HTML ────────────────────────────────────────────────
    const rawHtml = await page.content();
    const { redacted, counts } = redactPii(rawHtml);
    const htmlPath = join(outDir, "listing.html");
    writeFileSync(htmlPath, redacted, "utf8");
    console.log(
      `[capture] wrote ${htmlPath} (${(redacted.length / 1024).toFixed(1)} KB; redacted ${counts.emails} emails, ${counts.phones} phones, ${counts.urls} URL query strings)`,
    );

    // ── 2. Capture fingerprints for each labelled selector ─────────────
    const signatures: Record<string, unknown[]> = {};
    for (const [label, selector] of Object.entries(spec.selectors)) {
      const sigs = await captureFingerprints(page, selector, 20);
      signatures[label] = sigs;
      console.log(`[capture] label=${label} selector=${selector} signatures=${sigs.length}`);
    }

    const fingerprints = {
      version: 1 as const,
      slug,
      capturedAt: new Date().toISOString(),
      source: spec.listingUrl,
      signatures,
    };
    const jsonPath = join(outDir, "fingerprints.json");
    writeFileSync(jsonPath, JSON.stringify(fingerprints, null, 2), "utf8");
    console.log(`[capture] wrote ${jsonPath}`);

    // ── 3. Operator checklist ─────────────────────────────────────────
    console.log("\n[capture] ✅ Done.");
    console.log("\nReview checklist before committing:");
    console.log(`  1. Open ${htmlPath} and scan for any remaining PII the regex missed.`);
    console.log(`  2. Confirm only public, structural HTML is present (no candidate names, recruiter emails, etc.).`);
    console.log(`  3. Open ${jsonPath} and confirm 'attrs' contains no hashed user-specific IDs.`);
    console.log(`  4. Run: pnpm test:crawler`);
    console.log(`  5. Flip CRAWLER_META.${slug}.hasFixture = true in packages/shared/src/crawler-meta.ts`);
    console.log(`  6. git add packages/crawler/__fixtures__/${slug}/ packages/shared/src/crawler-meta.ts`);
    console.log(`  7. git commit`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[capture] failed:", err);
  process.exit(1);
});
