import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchJson } from "../lib/http.js";

// Confirmed: Greenhouse board (job-boards.eu.greenhouse.io/groww) uses US API token = groww
const GH_TOKEN = "groww";

interface GhJob {
  id: number;
  title: string;
  absolute_url?: string;
  location?: { name?: string };
  content?: string;
  updated_at?: string;
}

export const growwConfig: CompanyConfig = {
  slug: "groww",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const data = await fetchJson<{ jobs?: GhJob[] }>(
      `https://boards-api.greenhouse.io/v1/boards/${GH_TOKEN}/jobs?content=true`,
    );
    const jobs = data.jobs ?? [];
    log(`Total: ${jobs.length} jobs`);
    return jobs.map((j) => ({
      external_id: String(j.id),
      title: j.title,
      location_raw: j.location?.name ?? "Bengaluru",
      description: j.content ?? "",
      apply_url: j.absolute_url ?? `https://job-boards.greenhouse.io/${GH_TOKEN}/jobs/${j.id}`,
      posted_at: j.updated_at,
      raw: j as unknown as Record<string, unknown>,
    }));
  },
};
