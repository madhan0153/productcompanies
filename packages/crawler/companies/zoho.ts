import { chromium } from "playwright";
import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { enrichDescriptions, sleep } from "./_types.js";

const PORTAL_URL = "https://careers.zohocorp.com/jobs/Careers";

interface ZohoJobRow {
  title: string;
  href: string;
  right: string;
}

export const zohoConfig: CompanyConfig = {
  slug: "zoho",
  async crawl(ctx): Promise<RawJob[]> {
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-http2"],
    });
    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36",
        extraHTTPHeaders: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9" },
      });
      const page = await context.newPage();
      await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await page.waitForSelector(".cw-filter-joblist, .careers-nojob-text", { timeout: 20_000 }).catch(() => {});
      await sleep(1500);

      let rows = await page.$$eval(".cw-filter-joblist", (els) =>
        els.map((el) => {
          const link = el.querySelector(".cw-3-title, a[href*='/jobs/Careers/']") as HTMLAnchorElement | null;
          return {
            title: (link?.textContent ?? "").trim(),
            href: link?.href ?? "",
            right: (el.querySelector(".cw-filter-joblist-right")?.textContent ?? "").trim(),
          };
        }).filter((row) => row.title.length > 2 && row.href.length > 10),
      ) as ZohoJobRow[];

      if (rows.length === 0) {
        rows = await page.$$eval("a[href*='/jobs/Careers/']", (links) =>
          links.map((link) => ({
            title: (link.textContent ?? "").trim(),
            href: (link as HTMLAnchorElement).href,
            right: (link.parentElement?.textContent ?? "").trim(),
          })).filter((row) => row.title.length > 2 && row.href.length > 10),
        ) as ZohoJobRow[];
      }

      const jobs = rows.map((row): RawJob => {
        const id = row.href.match(/\/Careers\/(\d+)/)?.[1] ?? row.href;
        return {
          external_id: id,
          title: row.title,
          location_raw: "India",
          description: "",
          apply_url: row.href,
          raw: row as unknown as Record<string, unknown>,
        };
      });

      await enrichDescriptions({ page, log: ctx.log }, jobs, () => {
        const selectors = ["#cw-rich-description", ".cw-jobdescription", ".cw-jobdetails-container", "main"];
        for (const selector of selectors) {
          const text = (document.querySelector(selector)?.textContent ?? "").trim();
          if (text.length >= 80) return Promise.resolve(text);
        }
        return Promise.resolve("");
      }, { waitUntil: "domcontentloaded", extraWaitMs: 2000, timeoutMs: 22_000, concurrency: 2 });

      ctx.log(`Zoho Recruit [zoho] jobs: ${jobs.length}`);
      return jobs;
    } finally {
      await browser.close().catch(() => {});
    }
  },
};
