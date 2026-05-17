import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";

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
      // HTML fallback — careers SPA didn't expose its JSON; scrape anchor
      // tags directly. Filter aggressively: the careers shell page links to
      // dozens of nav pages (/careers/applying, /careers/interviewing,
      // /careers/awards, /careers/recruitment-fraud, /careers/all-jobs,
      // /careers/employee-awards, /careers/team-everyone, etc.) that the
      // old loose filter happily ingested as "jobs" — they all came in
      // with empty descriptions and identical signatures, which then poisoned
      // the upsert with ux_jobs_company_signature collisions.
      const NAV_SLUGS = new Set([
        "applying", "interviewing", "awards", "all-jobs",
        "earlycareers", "early-careers", "career-growth",
        "employee-awards", "perk-and-benefits", "perks-and-benefits",
        "recruitment-fraud", "resources", "teamanywhere", "team-anywhere",
        "team-everyone", "events", "blog", "stories",
        "diversity", "internships", "interns", "students",
        "locations", "teams", "remote", "leadership", "values",
        "candidate-resources", "interview-process", "faq", "faqs",
        "students-and-graduates", "graduate-program",
      ]);

      const looksLikeJobUrl = (href: string): boolean => {
        // Atlassian job detail URLs end in a long alphanumeric ID
        // (UUID-like) or a Workday/SmartRecruiters req number. Pure
        // nav slugs are short and word-like.
        const last = href.split("/").filter(Boolean).pop() ?? "";
        // Accept anything that looks UUID-y, req-id-y, or contains digits.
        if (/^[0-9a-f]{8}-[0-9a-f]{4}/.test(last)) return true;       // uuid
        if (/^[A-Z]{2,4}[-_]?\d{4,}/.test(last)) return true;         // JR-12345
        if (/\d{4,}/.test(last)) return true;                          // any 4+ digit id
        if (last.length > 30) return true;                             // long slug → likely job-title-NNNNN
        return false;
      };

      const links = await page.$$eval(
        'a[href*="/company/careers/details"], a[href*="smartrecruiters"], a[href*="workday"], a[href*="/jobs/"]',
        (els) =>
          els.map((el) => ({
            href: (el as HTMLAnchorElement).href,
            title:
              el.closest?.("[class*='job']")?.querySelector?.("h3, h4, [class*='title']")?.textContent?.trim() ??
              el.textContent?.trim() ?? "",
          })).filter((l) => l.title.length > 3 && l.href.length > 10),
      );

      // Filter out nav slugs and links that don't pass the job-url heuristic.
      const jobLinks = links.filter((l) => {
        const last = l.href.split("/").filter(Boolean).pop() ?? "";
        if (NAV_SLUGS.has(last)) return false;
        return looksLikeJobUrl(l.href);
      });

      log(`HTML fallback: ${jobLinks.length} job link(s) (filtered ${links.length - jobLinks.length} nav)`);
      for (const l of jobLinks.slice(0, 300)) {
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

    // Atlassian's listing endpoint gives just title + link; bodies live on the
    // detail page. They're using a custom careers stack — selectors are loose.
    await enrichDescriptions({ page, log }, collected, () => {
      const root =
        document.querySelector("[data-testid*='job-description']") ??
        document.querySelector("[class*='JobDescription']") ??
        document.querySelector("article") ??
        document.querySelector("main");
      return Promise.resolve((root?.textContent ?? "").trim());
    });

    return collected;
  },
};
