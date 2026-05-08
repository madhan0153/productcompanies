import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";

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
            // The listing only carries team labels (e.g. "Sales & Marketing");
            // those would otherwise pass enrichDescriptions' < 60-char gate
            // and skip the actual JD fetch. Keep blank.
            description: "",
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

    const arr = Array.from(collected.values());

    // Meta listing API only returns team names. Enrich each metacareers.com
    // detail page for the full JD body. Heavy SPA — needs networkidle + grace.
    await enrichDescriptions({ page, log }, arr, () => {
      // Meta's careers DOM uses obfuscated class names — selectors targeting
      // semantic class names won't match. Walk the page in priority order:
      // structured ARIA region → main → largest text block on the page.
      const tryEls = [
        "[role='main']",
        "main",
        "[data-pagelet*='Job']",
        "[data-testid*='job'i]",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        if (text.length >= 400) return Promise.resolve(text);
      }
      // Last resort — find the longest <div> on the page. Avoids picking up
      // the navigation chrome (which is short) when the JD wrapper has an
      // unrecognised id.
      const divs = Array.from(document.querySelectorAll("div"));
      let best = "";
      for (const d of divs) {
        const t = (d.textContent ?? "").trim();
        if (t.length > best.length) best = t;
      }
      if (best.length >= 400) return Promise.resolve(best);
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 2500, timeoutMs: 35_000 });

    return arr;
  },
};
