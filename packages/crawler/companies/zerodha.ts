import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import type { ElementHandle, Page } from "playwright";
import { sleep } from "./_types.js";
import { resolveAdaptive, type AdaptiveTelemetry } from "../lib/adaptive.js";
import { loadReferenceSignatures } from "../lib/fixture-store.js";

const CARD_LABEL = "job_link";
const CARD_SELECTOR = 'a[href*="/careers/"]';

interface RawLink {
  href: string;
  title: string;
}

// Zerodha uses a custom careers page
export const zerodhaConfig: CompanyConfig = {
  slug: "zerodha",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    await page.goto("https://zerodha.com/careers/", {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });

    await sleep(2500);

    // Adaptive reference signatures — empty until a fixture is captured.
    const cardReference = loadReferenceSignatures("zerodha", CARD_LABEL);

    const onTelemetry = (e: AdaptiveTelemetry) => {
      if (e.kind === "fallback_hit") {
        log(
          `[adaptive] ${e.label}: CSS failed; recovered ${e.count} via fingerprint match (mean confidence ${e.meanConfidence.toFixed(2)})`,
          "warn",
        );
      } else if (e.kind === "miss") {
        log(`[adaptive] ${e.label}: no recovery (${e.reason})`, "warn");
      }
    };

    // Happy path: anchors with /careers/ tail.
    let items = await extractZerodhaLinks(page, CARD_SELECTOR);

    // Drift fallback. Note: Zerodha's selector is intentionally broad, so
    // the CSS path is unlikely to return zero — but if a refactor moves
    // the listing into a different element class, the adaptive fallback
    // recovers.
    if (items.length === 0 && cardReference.length > 0) {
      const matches = await resolveAdaptive(page, {
        slug: "zerodha",
        label: CARD_LABEL,
        selector: CARD_SELECTOR,
        reference: cardReference,
        onTelemetry,
      });
      if (matches.length > 0) {
        items = await extractZerodhaFromHandles(matches.map((m) => m.handle));
        for (const m of matches) await m.handle.dispose();
      }
    }

    log(`Found ${items.length} job links`);

    // Diagnostic: when we drain zero, dump what was on the page so the next
    // run can be fixed without a debug deployment.
    if (items.length === 0) {
      const anchorCount = await page.$$eval("a", (els) => els.length);
      const sampleHrefs = await page.$$eval("a", (els) =>
        els
          .slice(0, 20)
          .map((el) => (el as HTMLAnchorElement).href)
          .filter((h) => h && !h.startsWith("javascript:")),
      );
      const titleTag = await page.title();
      log(
        `Zerodha: 0 links matched. page.title="${titleTag}", anchors=${anchorCount}, ` +
        `sample=${JSON.stringify(sampleHrefs)}`,
        "warn",
      );
    }

    for (const item of items.slice(0, 200)) {
      // Extract job ID from URL path
      const pathParts = new URL(item.href).pathname.split("/").filter(Boolean);
      const id = pathParts.at(-1) ?? item.href;

      // Visit detail page to get description
      try {
        await page.goto(item.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await sleep(500);
        const description = await page
          .$eval(
            "main, article, [class*='content'], [class*='description'], .job-description",
            (el) => el.textContent?.trim() ?? "",
          )
          .catch(() => "");

        const location = await page
          .$eval('[class*="location"], [class*="loc"]', (el) => el.textContent?.trim() ?? "")
          .catch(() => "Bengaluru"); // Zerodha is Bengaluru-based

        jobs.push({
          external_id: id,
          title: item.title,
          location_raw: location || "Bengaluru",
          description,
          apply_url: item.href,
          raw: { href: item.href },
        });
      } catch (err) {
        log(`Failed to fetch ${item.href}: ${err}`, "warn");
        jobs.push({
          external_id: id,
          title: item.title,
          location_raw: "Bengaluru",
          description: "",
          apply_url: item.href,
          raw: { href: item.href },
        });
      }

      await sleep(800);
    }

    log(`Total: ${jobs.length} jobs`);
    return jobs;
  },
};

// ── Extraction helpers ─────────────────────────────────────────────────────

const NAV_WORDS = new Set(["careers", "about", "team", "culture", "perks", "benefits", "process", "faq"]);

async function extractZerodhaLinks(page: Page, selector: string): Promise<RawLink[]> {
  return page.$$eval(
    selector,
    (els) =>
      els
        .map((el) => ({
          href: (el as HTMLAnchorElement).href,
          title: el.textContent?.trim() ?? "",
        }))
        // Must have something after /careers/ — drop the careers index
        // self-link. Title must be non-trivial.
        .filter((l) => /\/careers\/[^/?#]+/.test(l.href) && l.title.length > 3)
        // Drop the obvious nav links by stripping known non-job tail slugs.
        .filter((l) => {
          const tail = l.href.replace(/[?#].*$/, "").split("/").filter(Boolean).pop() ?? "";
          const navWords = new Set(["careers", "about", "team", "culture", "perks", "benefits", "process", "faq"]);
          return !navWords.has(tail);
        })
        // Dedup by href.
        .filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i),
  );
}

async function extractZerodhaFromHandles(handles: ElementHandle[]): Promise<RawLink[]> {
  const out: RawLink[] = [];
  const seenHrefs = new Set<string>();
  for (const h of handles) {
    const link = await h.evaluate((el) => {
      const a = el as HTMLAnchorElement;
      return { href: a.href, title: a.textContent?.trim() ?? "" };
    });
    if (!/\/careers\/[^/?#]+/.test(link.href) || link.title.length <= 3) continue;
    const tail = link.href.replace(/[?#].*$/, "").split("/").filter(Boolean).pop() ?? "";
    if (NAV_WORDS.has(tail)) continue;
    if (seenHrefs.has(link.href)) continue;
    seenHrefs.add(link.href);
    out.push(link);
  }
  return out;
}
