import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Zomato uses a custom careers page (JS-rendered)
export const zomatoConfig: CompanyConfig = {
  slug: "zomato",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    const collected: RawJob[] = [];

    // Intercept their internal jobs API
    page.on("response", async (resp) => {
      if (resp.url().includes("zomato.com") && /jobs|careers|openings/i.test(resp.url())) {
        try {
          const body = (await resp.json()) as Record<string, unknown>;
          const items = (body.jobs ?? body.openings ?? body.data ?? []) as Array<Record<string, unknown>>;
          for (const j of items) {
            collected.push({
              external_id: String(j.id ?? j.jobId ?? ""),
              title: String(j.title ?? j.jobTitle ?? ""),
              location_raw: String(j.location ?? j.city ?? "Gurugram"),
              description: String(j.description ?? j.jd ?? ""),
              apply_url: String(j.applyUrl ?? j.url ?? ""),
              posted_at: j.postedAt ? String(j.postedAt) : undefined,
              raw: j,
            });
          }
        } catch { /* ignore */ }
      }
    });

    await page.goto("https://www.zomato.com/careers", { waitUntil: "networkidle", timeout: 60_000 });
    await sleep(3000);

    // Try scrolling to load more
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1500);

    if (collected.length > 0) {
      log(`Total: ${collected.length} jobs (API intercepted)`);
      return collected;
    }

    // HTML fallback
    const links = await page.$$eval(
      'a[href*="job"], a[href*="career"], [class*="Job"] a, [class*="Opening"] a',
      (els) =>
        els
          .map((el) => ({
            href: (el as HTMLAnchorElement).href,
            title:
              el.closest?.("[class*='Job'], [class*='Opening']")?.querySelector?.("h2, h3, [class*='title']")?.textContent?.trim()
              ?? el.textContent?.trim() ?? "",
          }))
          .filter((l) => l.title.length > 3 && l.href.includes("zomato.com")),
    );

    log(`Found ${links.length} job links (HTML fallback)`);

    for (const l of links.slice(0, 200)) {
      const id = l.href.split("/").at(-1) ?? l.href;
      jobs.push({
        external_id: id,
        title: l.title,
        location_raw: "Gurugram",
        description: "",
        apply_url: l.href,
        raw: { href: l.href },
      });
    }

    log(`Total: ${jobs.length} jobs`);
    return jobs;
  },
};
