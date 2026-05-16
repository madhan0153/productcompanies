import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";
import { fetchJson } from "../lib/http.js";

// Confirmed API: https://www.amazon.jobs/en/search.json
interface AmazonJob {
  id_icims: string;
  title: string;
  location: string;
  description_short?: string;
  description?: string;
  posted_date?: string;
  job_path?: string;
}

interface AmazonApiResponse {
  jobs?: AmazonJob[];
  hits?: number;
}

async function fetchPage(offset: number): Promise<AmazonApiResponse> {
  const params = new URLSearchParams({
    base_query: "",
    loc_query: "India",
    country: "IND",
    result_limit: "100",
    offset: String(offset),
    sort: "recent",
  });
  return fetchJson<AmazonApiResponse>(`https://www.amazon.jobs/en/search.json?${params}`, {
    headers: { Referer: "https://www.amazon.jobs/en/search" },
  });
}

export const amazonConfig: CompanyConfig = {
  slug: "amazon",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    let offset = 0;
    let total = Infinity;

    while (jobs.length < total) {
      log(`Fetching offset ${offset} / ${total === Infinity ? "?" : total}...`);
      const data = await fetchPage(offset);
      const batch = data.jobs ?? [];
      if (total === Infinity) total = data.hits ?? 0;
      if (batch.length === 0) break;

      for (const j of batch) {
        jobs.push({
          external_id: j.id_icims,
          title: j.title,
          location_raw: j.location,
          description: j.description ?? j.description_short ?? "",
          apply_url: j.job_path ? `https://www.amazon.jobs${j.job_path}` : undefined,
          posted_at: j.posted_date,
          raw: j as unknown as Record<string, unknown>,
        });
      }

      offset += batch.length;
      if (batch.length < 100) break;
      await sleep(700);
    }

    log(`Total: ${jobs.length} jobs`);
    return jobs;
  },
};
