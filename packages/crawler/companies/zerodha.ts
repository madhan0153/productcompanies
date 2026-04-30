import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Zerodha uses a custom careers page
export const zerodhaConfig: CompanyConfig = {
  slug: "zerodha",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    await page.goto("https://zerodha.com/careers/", {
      waitUntil: "networkidle",
      timeout: 60_000,
    });

    await sleep(1500);

    // Zerodha's careers page lists jobs in a simple table/list
    const items = await page.$$eval(
      // Common selectors for Zerodha's careers page
      'a[href*="/careers/"], .job-listing a, [class*="job"] a, table tr a',
      (els) =>
        els
          .map((el) => ({
            href: (el as HTMLAnchorElement).href,
            title: el.textContent?.trim() ?? "",
          }))
          .filter((l) => l.href.includes("/careers/") && l.title.length > 3),
    );

    log(`Found ${items.length} job links`);

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
