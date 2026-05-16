import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { enrichDescriptions } from "./_types.js";
import { fetchWithRetry } from "../lib/http.js";

// careers.cred.club/openings uses Next.js SSG with all job data in __NEXT_DATA__.
// IMPORTANT: the listing's `content.description` is just CRED's company
// boilerplate ("CRED is an exclusive community…") — identical for every
// role. The actual JD body lives only on /openings/{id}. We discard the
// boilerplate and pull the real JD via enrichDescriptions.
const PAGE_URL = "https://careers.cred.club/openings";

interface CredJob {
  id: string;
  text: string;
  categories?: {
    location?: string;
    department?: string;
    commitment?: string;
    allLocations?: string[];
  };
  content?: { description?: string };
  createdAt?: string;
}

interface NextData {
  props?: {
    pageProps?: {
      data?: { data?: CredJob[] };
    };
  };
}

export const credConfig: CompanyConfig = {
  slug: "cred",
  async crawl(ctx: CrawlContext): Promise<RawJob[]> {
    const { log } = ctx;
    const res = await fetchWithRetry(PAGE_URL, { headers: { Accept: "text/html,application/xhtml+xml" } });
    const html = await res.text();

    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("CRED: __NEXT_DATA__ not found in page HTML");

    const nextData = JSON.parse(m[1]) as NextData;
    const listings = nextData.props?.pageProps?.data?.data ?? [];
    log(`Total: ${listings.length} jobs`);

    const jobs: RawJob[] = listings.map((j) => {
      const location = j.categories?.allLocations?.join(", ") ?? j.categories?.location ?? "Bengaluru";
      return {
        external_id: j.id,
        title: j.text,
        location_raw: location,
        // Discard listing boilerplate — see file header.
        description: "",
        apply_url: `https://careers.cred.club/openings/${j.id}`,
        posted_at: j.createdAt,
        raw: j as unknown as Record<string, unknown>,
      };
    });

    // Pull the real JD body. CRED's detail page is a CSR React app; the JD
    // sits under a heading once hydrated. Use a broad selector and a grace
    // period to catch the late paint.
    await enrichDescriptions(ctx, jobs, () => {
      const tryEls = [
        "[class*='job-description'i]",
        "[data-testid*='description'i]",
        "main article",
        "main",
        "body",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        // Drop the company boilerplate header so the parser doesn't see it.
        const cleaned = text.replace(/^\s*(what is CRED|CRED is an exclusive community)[^\n]*\n+/i, "");
        if (cleaned.length >= 200) return Promise.resolve(cleaned);
      }
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

    return jobs;
  },
};
