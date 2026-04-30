import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Nvidia Workday — locationHierarchy1 facet ID confirmed from careers page URL
const BASE = "https://nvidia.wd5.myworkdayjobs.com";
const SITE_PATH = "/wday/cxs/nvidia/NVIDIAExternalCareerSite";
// From: ?locationHierarchy1=2fcb99c455831013ea52b82135ba3266
const INDIA_FACET_ID = "2fcb99c455831013ea52b82135ba3266";

interface WdJob {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WdResponse {
  jobPostings?: WdJob[];
  total?: number;
}

async function fetchPage(offset: number): Promise<WdResponse> {
  const res = await fetch(`${BASE}${SITE_PATH}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
    body: JSON.stringify({
      appliedFacets: { locationHierarchy1: [INDIA_FACET_ID] },
      limit: 20,
      offset,
      searchText: "",
    }),
  });
  if (!res.ok) throw new Error(`Nvidia Workday API ${res.status}`);
  return res.json() as Promise<WdResponse>;
}

export const nvidiaConfig: CompanyConfig = {
  slug: "nvidia",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    let offset = 0;
    let total = Infinity;

    while (jobs.length < total) {
      log(`Fetching offset ${offset} / ${total === Infinity ? "?" : total}...`);
      const data = await fetchPage(offset);
      if (total === Infinity) total = data.total ?? 0;
      const batch = data.jobPostings ?? [];
      if (batch.length === 0) break;

      for (const j of batch) {
        const id = j.externalPath.split("/").at(-1) ?? j.externalPath;
        jobs.push({
          external_id: id,
          title: j.title,
          location_raw: j.locationsText ?? "India",
          description: j.bulletFields?.join("\n") ?? "",
          apply_url: `${BASE}${j.externalPath}`,
          posted_at: j.postedOn,
          raw: j as unknown as Record<string, unknown>,
        });
      }

      offset += batch.length;
      if (batch.length < 20) break;
      await sleep(500);
    }

    log(`Total: ${jobs.length} India jobs`);
    return jobs;
  },
};
