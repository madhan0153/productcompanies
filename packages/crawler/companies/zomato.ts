import { chromium } from "playwright";
import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";

// Zomato (now part of "Eternal") publishes openings via Zoho Recruit:
//   https://eternal.zohorecruit.in/jobs/Careers
// Their own marketing pages (zomato.com/careers, eternal.com/careers/openings)
// are SPA shells with no actual listings. www.zomato.com itself sits behind
// Akamai which rejects Playwright's HTTP/2 fingerprint with
// ERR_HTTP2_PROTOCOL_ERROR — but the Zoho subdomain isn't behind that
// defence, so a normal Playwright session works there. We still launch a
// dedicated Chromium with --disable-http2 in case Zoho fronts their CDN
// the same way later.
//
// DOM (confirmed via smoke test):
//   .cw-filter-joblist          — one element per job
//   .cw-3-title                 — anchor with title text + href to /jobs/Careers/{id}/{slug}
//   .cw-filter-joblist-right    — type + posted date

const PORTAL_URL = "https://eternal.zohorecruit.in/jobs/Careers";

export const zomatoConfig: CompanyConfig = {
  slug: "zomato",
  async crawl(_ctx: CrawlContext): Promise<RawJob[]> {
    const log = _ctx.log;

    let browser;
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-http2",
          "--disable-blink-features=AutomationControlled",
        ],
      });
    } catch (err) {
      log(`failed to launch dedicated browser: ${(err as Error).message}`, "error");
      return [];
    }

    try {
      const browserCtx = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        extraHTTPHeaders: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9",
          "Accept-Language": "en-US,en;q=0.9",
        },
        viewport: { width: 1366, height: 900 },
      });
      const page = await browserCtx.newPage();

      try {
        await page.goto(PORTAL_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      } catch (err) {
        log(`nav failed: ${(err as Error).message.split("\n")[0]}`, "error");
        return [];
      }

      // Zoho Recruit fetches the job list via XHR after page load. Wait for
      // either a result row to appear or a "no openings" indicator.
      try {
        await page.waitForSelector(".cw-filter-joblist, .careers-nojob-text", {
          timeout: 20_000,
        });
      } catch { /* fall through — selectors may not have fired */ }
      await sleep(2000);

      // Try to expand pagination if present (Zoho's "Load more" pattern)
      for (let i = 0; i < 5; i++) {
        const more = await page.$(".cw-loadmore-btn, [class*='loadmore']");
        if (!more) break;
        try {
          await more.click({ timeout: 2000 });
          await sleep(1500);
        } catch { break; }
      }

      const rawJobs = await page.$$eval(".cw-filter-joblist", (rows) =>
        rows.map((row) => {
          const link = row.querySelector(".cw-3-title") as HTMLAnchorElement | null;
          const title = (link?.textContent ?? "").trim();
          const href = link?.href ?? "";
          const right = (row.querySelector(".cw-filter-joblist-right")?.textContent ?? "").trim();
          // The title sometimes embeds the location: "Senior PM, Bangalore, ZR_1_JOB"
          const parts = title.split(",").map((s) => s.trim());
          const cleanTitle = parts[0] ?? title;
          const location = parts.length > 1 ? parts[1] : "Gurugram";
          return { title: cleanTitle, href, right, fullTitle: title, location };
        }).filter((r) => r.title.length > 3 && r.href.length > 10),
      );

      log(`Found ${rawJobs.length} listings on Zoho Recruit`);

      const jobs: RawJob[] = rawJobs.map((r) => {
        // Job ID is in the URL path: /jobs/Careers/{numeric-id}/{slug}
        const m = r.href.match(/\/Careers\/(\d+)/);
        const id = m?.[1] ?? r.href;
        return {
          external_id: id,
          title: r.title,
          location_raw: r.location,
          description: "",
          apply_url: r.href,
          raw: { fullTitle: r.fullTitle, right: r.right, href: r.href },
        };
      });

      // Visit each detail page for the full JD body. Zoho Recruit's detail
      // pages mount the description into #cw-rich-description (the rich-text
      // body) inside the .cw-jobdescription wrapper. Confirmed via DOM probe.
      await enrichDescriptions({ page, log }, jobs, () => {
        const tryEls = [
          "#cw-rich-description",
          ".cw-jobdescription",
          ".cw-jobdetails-container",
          "[class*='jobdescription'i]",
          "main",
        ];
        for (const sel of tryEls) {
          const el = document.querySelector(sel);
          const text = (el?.textContent ?? "").trim();
          if (text.length >= 100) return Promise.resolve(text);
        }
        return Promise.resolve("");
      }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

      log(`Total: ${jobs.length} jobs`);
      return jobs;
    } finally {
      try { await browser.close(); } catch { /* ignore */ }
    }
  },
};
