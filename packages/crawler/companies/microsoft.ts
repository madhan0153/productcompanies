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
        jobs.push({
          external_id: String(p.id),
          title: p.name,
          location_raw: location,
          description: p.department ? `Department: ${p.department}` : "",
          apply_url: p.positionUrl ?? `https://apply.careers.microsoft.com/careers/${p.displayJobId}`,
          posted_at: p.postedTs ? new Date(p.postedTs * 1000).toISOString() : undefined,
          raw: p as unknown as Record<string, unknown>,
        });
      }

      start += batch.length;
      if (batch.length < 10) break;
      await sleep(400);
    }

    log(`Total: ${jobs.length} India jobs`);

    // The search API only returns title + department — visit each positionUrl
    // to grab the full JD body. Microsoft's careers app server-renders the
    // description into the main element.
    await enrichDescriptions(ctx, jobs, () => {
      const root =
        document.querySelector("[class*='ms-DocumentCard']") ??
        document.querySelector("[class*='job-detail']") ??
        document.querySelector("main") ??
        document.body;
      return Promise.resolve((root?.textContent ?? "").trim());
    });

    return jobs;
  },
};
