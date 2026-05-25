import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchJson } from "../lib/http.js";
import { INDIA_RE, stripHtml } from "./_simple.js";

interface MyntraSearchResponse {
  entities?: Array<{
    jobId?: string;
    jobDisplayId?: string;
    jobTitle?: string;
    jobLocation?: string;
    jobDescription?: string;
    jobType?: string;
  }>;
  total?: number;
}

export const myntraConfig: CompanyConfig = {
  slug: "myntra",
  async crawl(ctx): Promise<RawJob[]> {
    const headers = {
      Accept: "application/json",
      Origin: "https://jobs.myntra.com",
      Referer: "https://jobs.myntra.com/",
      WorkspaceId: "MYNTRA-93as3",
      workspaceId: "MYNTRA-93as3",
      "x-workspace-id": "MYNTRA-93as3",
    };
    const data = await fetchJson<MyntraSearchResponse>(
      "https://io.spire2grow.com/ies/v1/p/requisition/_search?page=1&size=50&",
      { headers, timeoutMs: 25_000, retryOnStatus: [401, 429] },
    );
    const jobs = (data.entities ?? [])
      .filter((job) => INDIA_RE.test(job.jobLocation ?? ""))
      .map((job): RawJob => ({
        external_id: job.jobId ?? job.jobDisplayId ?? `${job.jobTitle}-${job.jobLocation}`,
        title: job.jobTitle ?? "Myntra role",
        location_raw: job.jobLocation ?? "",
        description: stripHtml(job.jobDescription),
        apply_url: job.jobId ? `https://jobs.myntra.com/jobs/${job.jobId}` : "https://jobs.myntra.com/home",
        raw: job as unknown as Record<string, unknown>,
      }));
    ctx.log(`Spire [myntra] India jobs: ${jobs.length} (reported total ${data.total ?? 0})`);
    return jobs;
  },
};
