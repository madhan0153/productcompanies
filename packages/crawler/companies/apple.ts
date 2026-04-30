import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Confirmed: jobs.apple.com/en-in/search?location=india-INDC
// 8 jobs per page, URL pagination via ?page=N, ~30 pages for 236 India jobs
// Selectors: a.link-inline[href*='/details/'] for title+ID, div.job-title-location span:last-child for location
const BASE_URL = "https://jobs.apple.com/en-in/search?location=india-INDC";
const DETAIL_BASE = "https://jobs.apple.com";

export const appleConfig: CompanyConfig = {
  slug: "apple",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    const seenIds = new Set<string>();
    let pageNum = 1;
    const MAX_PAGES = 35;

    while (pageNum <= MAX_PAGES) {
      const url = pageNum === 1 ? BASE_URL : `${BASE_URL}&page=${pageNum}`;
      log(`Loading page ${pageNum}...`);
      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      await sleep(1500);

      const jobs = await page.$$eval(
        "a.link-inline[href*='/details/']",
        (links): Array<{ id: string; title: string; location: string; href: string }> => {
          const seen = new Set<string>();
          const result: Array<{ id: string; title: string; location: string; href: string }> = [];

          for (const el of links as HTMLAnchorElement[]) {
            // Skip "See full role description" and "Where we're hiring" links
            const text = el.textContent?.trim() ?? "";
            if (!text || text.startsWith("See full") || text.startsWith("Where")) continue;

            const m = el.href.match(/\/details\/([^/?]+)/);
            const id = m?.[1] ?? "";
            if (!id || seen.has(id)) continue;
            seen.add(id);

            // Location: sibling div.job-title-location > span:last-child
            const row = el.closest("[class*='job-list-item']") as HTMLElement | null;
            const locEl = row?.querySelector("[class*='job-title-location'] span:last-child") as HTMLElement | null;
            const location = locEl?.textContent?.trim() ?? "India";

            result.push({ id, title: text, location, href: el.href });
          }
          return result;
        },
      );

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
    return allJobs;
  },
};
