import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";

// Confirmed API: apply.careers.microsoft.com/api/pcsx/search
// 217 India jobs, 10 per page, paginate via `start`
const SEARCH_URL = "https://apply.careers.microsoft.com/api/pcsx/search";

interface MsPosition {
  id: number;
  displayJobId: string;
  name: string;
  locations?: string[];
  standardizedLocations?: string[];
  postedTs?: number;
  department?: string;
  positionUrl?: string;
}

interface MsApiResponse {
  data?: {
    positions?: MsPosition[];
    count?: number;
  };
}

async function fetchPage(start: number): Promise<MsApiResponse> {
  const params = new URLSearchParams({
    domain: "microsoft.com",
    query: "",
    location: "India",
    start: String(start),
    sort_by: "distance",
    filter_include_remote: "0",
    hl: "en",
  });
  const res = await fetch(`${SEARCH_URL}?${params}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
      Referer: "https://apply.careers.microsoft.com/",
    },
  });
  if (!res.ok) throw new Error(`Microsoft search API ${res.status}`);
  return res.json() as Promise<MsApiResponse>;
}

export const microsoftConfig: CompanyConfig = {
  slug: "microsoft",
  async crawl(ctx: CrawlContext): Promise<RawJob[]> {
    const { log } = ctx;
    const jobs: RawJob[] = [];
    let start = 0;
    let total = Infinity;

    while (jobs.length < total) {
      log(`Fetching start=${start} / ${total === Infinity ? "?" : total}...`);
      const data = await fetchPage(start);
      const result = data.data;
      if (!result) break;
      if (total === Infinity) total = result.count ?? 0;

      const batch = result.positions ?? [];
      if (batch.length === 0) break;

      for (const p of batch) {
        const location = p.locations?.join("; ") ?? "";
        // positionUrl from the API can be empty-string or relative; the `??`
        // fallback only triggers on null/undefined and let those through.
        // Build an absolute URL ourselves whenever positionUrl isn't a valid
        // absolute http(s) URL.
        const positionUrlIsAbs =
          typeof p.positionUrl === "string" &&
          /^https?:\/\//i.test(p.positionUrl);
        const applyUrl = positionUrlIsAbs
          ? p.positionUrl!
          : `https://jobs.careers.microsoft.com/global/en/job/${p.displayJobId ?? p.id}`;
        jobs.push({
          external_id: String(p.id),
          title: p.name,
          location_raw: location,
          description: p.department ? `Department: ${p.department}` : "",
          apply_url: applyUrl,
          posted_at: p.postedTs ? new Date(p.postedTs * 1000).toISOString() : undefined,
          raw: p as unknown as Record<string, unknown>,
        });
      }

      start += batch.length;
      if (batch.length < 10) break;
      await sleep(400);
    }

    log(`Total: ${jobs.length} India jobs`);

    // Microsoft's careers SPA loads the JD body asynchronously. networkidle
    // + grace + broad selectors. URL was rebuilt above to use the canonical
    // jobs.careers.microsoft.com host instead of relative positionUrl values.
    await enrichDescriptions(ctx, jobs, () => {
      const tryEls = [
        "[class*='description-content'i]",
        "[data-test-id*='description'i]",
        "[class*='job-description'i]",
        "[class*='jobdetail'i]",
        "[class*='ms-DocumentCard']",
        "main",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        if (text.length >= 200) return Promise.resolve(text);
      }
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

    return jobs;
  },
};
