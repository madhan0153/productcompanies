import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Confirmed: metacareers.com/jobsearch uses GraphQL (POST /graphql, text/html content-type)
// Response: data.job_search_with_featured_jobs.all_jobs[]
// India offices: New Delhi, Mumbai, Gurgaon, Bangalore, Hyderabad
const BASE_URL =
  "https://www.metacareers.com/jobsearch?offices[0]=New%20Delhi%2C%20India&offices[1]=Mumbai%2C%20India&offices[2]=Gurgaon%2C%20India&offices[3]=Bangalore%2C%20India&offices[4]=Hyderabad%2C%20India";

interface MetaJob {
  id: string;
  title: string;
  locations?: string[];
  teams?: string[];
  sub_teams?: string[];
}

interface MetaGraphQLResponse {
  data?: {
    job_search_with_featured_jobs?: {
      all_jobs?: MetaJob[];
    };
  };
}

export const metaConfig: CompanyConfig = {
  slug: "meta",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const collected = new Map<string, RawJob>();

    // Meta's /graphql endpoint returns JSON with text/html content-type
    page.on("response", async (resp) => {
      if (!resp.url().includes("metacareers.com/graphql")) return;
      try {
        const text = await resp.text();
        if (!text.startsWith("{")) return;
        const body = JSON.parse(text) as MetaGraphQLResponse;
        const jobs = body.data?.job_search_with_featured_jobs?.all_jobs ?? [];
        for (const j of jobs) {
          if (!j.id || collected.has(j.id)) continue;
          const location = j.locations?.[0] ?? "India";
          collected.set(j.id, {
            external_id: j.id,
            title: j.title,
            location_raw: location,
            description: j.teams?.join(", ") ?? "",
            apply_url: `https://www.metacareers.com/jobs/${j.id}/`,
            raw: j as unknown as Record<string, unknown>,
          });
        }
      } catch { /* non-JSON */ }
    });

    log("Loading India jobs page...");
    await page.goto(BASE_URL, { waitUntil: "load", timeout: 60_000 });
    await sleep(6000);

    // If the page rendered more jobs via HTML (server-side), collect them too
    if (collected.size === 0) {
      log("GraphQL interception got nothing, trying HTML fallback");
      const links = await page.$$eval('a[href*="/jobs/"]', (els) =>
        (els as HTMLAnchorElement[])
          .map((el) => ({ href: el.href, title: el.textContent?.trim() ?? "" }))
          .filter((l) => /metacareers\.com\/jobs\/\d+/.test(l.href) && l.title.length > 3),
      );
      for (const l of links) {
        const id = l.href.match(/\/jobs\/(\d+)/)?.[1] ?? l.href;
        if (!collected.has(id)) {
          collected.set(id, {
            external_id: id,
            title: l.title,
            location_raw: "India",
            description: "",
            apply_url: l.href,
            raw: { href: l.href },
          });
        }
      }
    }

    log(`Total: ${collected.size} India jobs`);
    return Array.from(collected.values());
  },
};
