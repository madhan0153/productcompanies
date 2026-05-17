import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

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

    // Zerodha careers is server-rendered HTML — no SPA, no XHR. Every job
    // is a plain anchor whose href deepens past /careers/. The old selector
    // matched `/careers/` literally (including the index page link itself),
    // then filtered out nothing useful. Tighten to anchors whose href has
    // more path beyond /careers/.
    const items = await page.$$eval(
      'a[href*="/careers/"]',
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
