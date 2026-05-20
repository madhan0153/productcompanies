import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";
import { resolveAdaptive, type AdaptiveTelemetry } from "../lib/adaptive.js";
import { loadReferenceSignatures } from "../lib/fixture-store.js";

// Confirmed URL: https://www.google.com/about/careers/applications/jobs/results?location=India
// Cards: li.lLd3Je | title: h3.QJPWVe | ID in jsdata attr: "Aiqs8c;{ID};$N"
const BASE_URL =
  "https://www.google.com/about/careers/applications/jobs/results?location=India&q=";

// Logical label used in fingerprints.json and adaptive telemetry.
const CARD_LABEL = "job_card";
const CARD_SELECTOR = "li.lLd3Je";

interface ListingRow {
  id: string;
  title: string;
  location: string;
  applyUrl: string;
}

export const googleConfig: CompanyConfig = {
  slug: "google",
  async crawl(ctx: CrawlContext): Promise<RawJob[]> {
    const { page, log } = ctx;
    const allJobs: RawJob[] = [];
    const seenIds = new Set<string>();
    let pageNum = 1;
    const MAX_PAGES = 20; // 380 jobs / ~20 per page ≈ 19 pages

    // Saved reference fingerprints for the listing card. Empty when no
    // fixture has been captured yet — in that case the adaptive fallback
    // is a no-op and we behave exactly like before.
    const cardReference = loadReferenceSignatures("google", CARD_LABEL);

    const onTelemetry = (e: AdaptiveTelemetry) => {
      if (e.kind === "fallback_hit") {
        log(
          `[adaptive] ${e.label}: CSS selector failed; recovered ${e.count} via fingerprint match (mean confidence ${e.meanConfidence.toFixed(2)})`,
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
      await sleep(2000);

      // Happy path: CSS selector returns cards. We use $$eval for speed
      // because we extract many fields per card in one round-trip.
      let jobs = await extractListingRows(page, CARD_SELECTOR);

      // Cold path: zero matches. Selectors drift — career sites ship CSS
      // module renames and our brittle class hashes go stale. Use the
      // adaptive resolver to find structurally similar cards and re-extract.
      if (jobs.length === 0 && cardReference.length > 0) {
        const matches = await resolveAdaptive(page, {
          slug: "google",
          label: CARD_LABEL,
          selector: CARD_SELECTOR,
          reference: cardReference,
          onTelemetry,
        });
        if (matches.length > 0) {
          jobs = await extractListingRowsFromHandles(matches.map((m) => m.handle));
          for (const m of matches) {
            await m.handle.dispose();
          }
        }
      }

      const newJobs = jobs.filter(
        (j) => j.id && j.title && !seenIds.has(j.id),
      );

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
          // The listing card only carries the first paragraph of "Minimum
          // qualifications" — typically 300-500 chars. Drop it so
          // enrichDescriptions fetches the full detail page (responsibilities,
          // preferred quals, about-the-team paragraph).
          description: "",
          apply_url: j.applyUrl || `https://www.google.com/about/careers/applications/jobs/results/${j.id}`,
          raw: { id: j.id, title: j.title, location: j.location },
        });
      }

      log(`Page ${pageNum}: ${newJobs.length} jobs (total so far: ${allJobs.length})`);
      pageNum++;
      await sleep(1500);
    }

    log(`Total: ${allJobs.length} India jobs`);

    // Detail-page sweep. Google's careers page renders the JD in a main
    // panel after a short hydration; networkidle + grace covers it.
    await enrichDescriptions(ctx, allJobs, () => {
      const tryEls = [
        "main",
        "[role='main']",
        "[class*='job-detail'i]",
        "[class*='description'i]",
        "body",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        if (text.length >= 400) return Promise.resolve(text);
      }
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

    return allJobs;
  },
};

// ── Extraction helpers ─────────────────────────────────────────────────────
//
// Two paths converge on the same ListingRow shape. The $$eval path is the
// fast happy case (one round-trip per page). The handle-driven path is used
// after the adaptive fallback recovers cards via fingerprint match.

import type { ElementHandle, Page } from "playwright";

async function extractListingRows(page: Page, selector: string): Promise<ListingRow[]> {
  return page.$$eval(selector, (cards) =>
    cards.map((card) => {
      const jsdata = card.querySelector("[jsdata]")?.getAttribute("jsdata") ?? "";
      const id = jsdata.split(";")[1]?.trim() ?? "";
      const title = card.querySelector("h3.QJPWVe")?.textContent?.trim() ?? "";
      const raw = (card as HTMLElement).innerText ?? "";
      const parts = raw.split(/\n+/);
      let location = "";
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].trim() === "place" && parts[i + 1]) {
          location = parts[i + 1].trim();
          break;
        }
      }
      const anchor = card.querySelector("a[href]") as HTMLAnchorElement | null;
      const applyUrl = anchor?.href ?? "";
      return { id, title, location, applyUrl };
    }),
  );
}

async function extractListingRowsFromHandles(handles: ElementHandle[]): Promise<ListingRow[]> {
  const out: ListingRow[] = [];
  for (const card of handles) {
    const row = await card.evaluate((el) => {
      const c = el as HTMLElement;
      const jsdata = c.querySelector("[jsdata]")?.getAttribute("jsdata") ?? "";
      const id = jsdata.split(";")[1]?.trim() ?? "";
      const title = c.querySelector("h3.QJPWVe")?.textContent?.trim() ?? "";
      const raw = c.innerText ?? "";
      const parts = raw.split(/\n+/);
      let location = "";
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].trim() === "place" && parts[i + 1]) {
          location = parts[i + 1].trim();
          break;
        }
      }
      const anchor = c.querySelector("a[href]") as HTMLAnchorElement | null;
      const applyUrl = anchor?.href ?? "";
      return { id, title, location, applyUrl };
    });
    out.push(row);
  }
  return out;
}
