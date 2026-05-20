import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import type { ElementHandle, Page } from "playwright";
import { sleep, enrichDescriptions } from "./_types.js";
import { resolveAdaptive, type AdaptiveTelemetry } from "../lib/adaptive.js";
import { loadReferenceSignatures } from "../lib/fixture-store.js";

// Confirmed: jobs.apple.com/en-in/search?location=india-INDC
// 8 jobs per page, URL pagination via ?page=N, ~30 pages for 236 India jobs
// Selectors: a.link-inline[href*='/details/'] for title+ID, div.job-title-location span:last-child for location
const BASE_URL = "https://jobs.apple.com/en-in/search?location=india-INDC";
const DETAIL_BASE = "https://jobs.apple.com";

const CARD_LABEL = "job_link";
const CARD_SELECTOR = "a.link-inline[href*='/details/']";

interface ListingRow {
  id: string;
  title: string;
  location: string;
  href: string;
}

export const appleConfig: CompanyConfig = {
  slug: "apple",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    const seenIds = new Set<string>();
    let pageNum = 1;
    const MAX_PAGES = 35;

    // Adaptive reference signatures — empty until a fixture is captured;
    // when empty, the fallback is a no-op and behavior is unchanged.
    const cardReference = loadReferenceSignatures("apple", CARD_LABEL);

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

    while (pageNum <= MAX_PAGES) {
      const url = pageNum === 1 ? BASE_URL : `${BASE_URL}&page=${pageNum}`;
      log(`Loading page ${pageNum}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      await sleep(1500);

      // Happy path.
      let jobs = await extractAppleListing(page, CARD_SELECTOR);

      // Drift fallback: CSS returned nothing, try fingerprint recovery.
      if (jobs.length === 0 && cardReference.length > 0) {
        const matches = await resolveAdaptive(page, {
          slug: "apple",
          label: CARD_LABEL,
          selector: CARD_SELECTOR,
          reference: cardReference,
          onTelemetry,
        });
        if (matches.length > 0) {
          jobs = await extractAppleFromHandles(matches.map((m) => m.handle));
          for (const m of matches) await m.handle.dispose();
        }
      }

      const newJobs = jobs.filter((j) => !seenIds.has(j.id));
      if (newJobs.length === 0) {
        log(`No new jobs on page ${pageNum}, stopping`);
        break;
      }

      for (const j of newJobs) {
        seenIds.add(j.id);
        allJobs.push({
          external_id: j.id,
          title: j.title,
          location_raw: j.location,
          description: "",
          apply_url: j.href.startsWith("http") ? j.href : `${DETAIL_BASE}${j.href}`,
          raw: { id: j.id, title: j.title, location: j.location },
        });
      }

      log(`Page ${pageNum}: ${newJobs.length} jobs (total so far: ${allJobs.length})`);
      pageNum++;
      await sleep(1000);
    }

    log(`Total: ${allJobs.length} India jobs`);

    // Apple's listing page has zero description text; detail pages are
    // React-rendered. networkidle + grace period to wait for JD body to mount.
    await enrichDescriptions({ page, log }, allJobs, () => {
      const tryEls = [
        "[data-testid*='description'i]",
        "[class*='jobdetails-description'i]",
        "[class*='job-description'i]",
        "[class*='jobdetails'i]",
        "main article",
        "main",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        if (text.length >= 200) return Promise.resolve(text);
      }
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

    return allJobs;
  },
};

// ── Extraction helpers ─────────────────────────────────────────────────────

async function extractAppleListing(page: Page, selector: string): Promise<ListingRow[]> {
  return page.$$eval(
    selector,
    (links) => {
      const seen = new Set<string>();
      const result: Array<ListingRow> = [];
      for (const el of links as HTMLAnchorElement[]) {
        const text = el.textContent?.trim() ?? "";
        if (!text || text.startsWith("See full") || text.startsWith("Where")) continue;
        const m = el.href.match(/\/details\/([^/?]+)/);
        const id = m?.[1] ?? "";
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const row = el.closest("[class*='job-list-item']") as HTMLElement | null;
        const locEl = row?.querySelector("[class*='job-title-location'] span:last-child") as HTMLElement | null;
        const location = locEl?.textContent?.trim() ?? "India";
        result.push({ id, title: text, location, href: el.href });
      }
      return result;
    },
  ) as Promise<ListingRow[]>;
}

async function extractAppleFromHandles(handles: ElementHandle[]): Promise<ListingRow[]> {
  const out: ListingRow[] = [];
  const seen = new Set<string>();
  for (const h of handles) {
    const row = await h.evaluate((el) => {
      const a = el as HTMLAnchorElement;
      const text = a.textContent?.trim() ?? "";
      if (!text || text.startsWith("See full") || text.startsWith("Where")) return null;
      const m = a.href.match(/\/details\/([^/?]+)/);
      const id = m?.[1] ?? "";
      if (!id) return null;
      const row = a.closest("[class*='job-list-item']") as HTMLElement | null;
      const locEl = row?.querySelector("[class*='job-title-location'] span:last-child") as HTMLElement | null;
      const location = locEl?.textContent?.trim() ?? "India";
      return { id, title: text, location, href: a.href };
    });
    if (row && !seen.has(row.id)) {
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}
