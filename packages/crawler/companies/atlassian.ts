import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Atlassian left Lever. Using Playwright with API interception on their careers page.
export const atlassianConfig: CompanyConfig = {
  slug: "atlassian",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const collected: RawJob[] = [];

    page.on("response", async (resp) => {
      const url = resp.url();
      const ct = resp.headers()["content-type"] ?? "";
      if (!ct.includes("json")) return;

      // Atlassian uses SmartRecruiters or their own API
      if (
        url.includes("smartrecruiters") ||
        url.includes("atlassian.com/api") ||
        url.includes("workday") ||
        (url.includes("atlassian") && (url.includes("jobs") || url.includes("careers") || url.includes("search")))
      ) {
        try {
          const body = (await resp.json()) as Record<string, unknown>;
          const items = (
            body.content ??
            body.jobs ??
            body.jobPostings ??
            body.results ??
            []
          ) as Array<Record<string, unknown>>;

          for (const j of items) {
            const id = String(j.id ?? j.uuid ?? j.jobId ?? "");
            if (!id || collected.some((c) => c.external_id === id)) continue;
            const location = (j.location as Record<string, unknown>)?.name ?? j.location ?? "";
            collected.push({
              external_id: id,
              title: String(j.name ?? j.title ?? ""),
              location_raw: String(location || "India"),
              description: String(j.jobAd ?? j.description ?? j.descriptionPlain ?? ""),
              apply_url: String(j.ref ?? j.applyUrl ?? j.absoluteUrl ?? ""),
              posted_at: j.releasedDate ? String(j.releasedDate) : undefined,
              raw: j,
            });
          }
        } catch { /* ignore */ }
      }
    });

    // Atlassian careers — filter by India
    await page.goto(
      "https://www.atlassian.com/company/careers/all-jobs?team=&location=India",
      { waitUntil: "networkidle", timeout: 60_000 },
    );
    await sleep(3000);

    // Scroll to trigger lazy load
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await sleep(1000);
    }

    if (collected.length === 0) {
      // HTML fallback
      const links = await page.$$eval(
        'a[href*="/company/careers/"], a[href*="jobs/"]',
        (els) =>
          els.map((el) => ({
            href: (el as HTMLAnchorElement).href,
            title:
              el.closest?.("[class*='job']")?.querySelector?.("h3, h4, [class*='title']")?.textContent?.trim() ??
              el.textContent?.trim() ?? "",
          })).filter((l) => l.title.length > 3 && l.href.length > 10),
      );
      log(`HTML fallback: ${links.length} links`);
      for (const l of links.slice(0, 300)) {
        const id = l.href.split("/").at(-1) ?? l.href;
        collected.push({
          external_id: id,
          title: l.title,
          location_raw: "India",
          description: "",
          apply_url: l.href,
          raw: { href: l.href },
        });
      }
    }

    log(`Total: ${collected.length} jobs`);
    return collected;
  },
};
