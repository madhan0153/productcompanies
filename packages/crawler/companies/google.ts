import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Confirmed URL: https://www.google.com/about/careers/applications/jobs/results?location=India
// Cards: li.lLd3Je | title: h3.QJPWVe | ID in jsdata attr: "Aiqs8c;{ID};$N"
const BASE_URL =
  "https://www.google.com/about/careers/applications/jobs/results?location=India&q=";

export const googleConfig: CompanyConfig = {
  slug: "google",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    const seenIds = new Set<string>();
    let pageNum = 1;
    const MAX_PAGES = 20; // 380 jobs / ~20 per page ≈ 19 pages

    while (pageNum <= MAX_PAGES) {
      const url = pageNum === 1 ? BASE_URL : `${BASE_URL}&page=${pageNum}`;
      log(`Loading page ${pageNum}...`);

      await page.goto(url, { waitUntil: "networkidle", timeout: 45_000 });
      await sleep(2000);

      // Extract jobs from confirmed li.lLd3Je cards
      const jobs = await page.$$eval("li.lLd3Je", (cards) =>
        cards.map((card) => {
          // ID from jsdata: "Aiqs8c;74939955737961158;$2"
          const jsdata = card.querySelector("[jsdata]")?.getAttribute("jsdata") ?? "";
          const id = jsdata.split(";")[1]?.trim() ?? "";

          const title = card.querySelector("h3.QJPWVe")?.textContent?.trim() ?? "";

          // Parse innerText: "Title|corporate_fare|Google|place|Location|bar_chart|Level|..."
          const raw = (card as HTMLElement).innerText ?? "";
          const parts = raw.split(/\n+/);

          // Find location: line after "place" icon label
          let location = "";
          for (let i = 0; i < parts.length; i++) {
            if (parts[i].trim() === "place" && parts[i + 1]) {
              location = parts[i + 1].trim();
              break;
            }
          }

          // Find description: lines after "Minimum qualifications" or after bar_chart level
          const descStart = parts.findIndex((p) =>
            /minimum qualifications|responsibilities|about the job/i.test(p),
          );
          const description = descStart >= 0 ? parts.slice(descStart).join("\n") : "";

          // Apply URL from the anchor
          const anchor = card.querySelector("a[href]") as HTMLAnchorElement | null;
          const applyUrl = anchor?.href ?? "";

          return { id, title, location, description, applyUrl, raw: {} as Record<string, unknown> };
        }),
      );

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
          description: j.description,
          apply_url: j.applyUrl || `https://www.google.com/about/careers/applications/jobs/results/${j.id}`,
          raw: { id: j.id, title: j.title, location: j.location },
        });
      }

      log(`Page ${pageNum}: ${newJobs.length} jobs (total so far: ${allJobs.length})`);
      pageNum++;
      await sleep(1500);
    }

    log(`Total: ${allJobs.length} India jobs`);
    return allJobs;
  },
};
