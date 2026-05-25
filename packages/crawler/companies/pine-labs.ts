import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchJson } from "../lib/http.js";
import { INDIA_RE, stripHtml } from "./_simple.js";

interface PineJob {
  JobId: string;
  JobTitle?: string;
  JobDescription?: string;
  JobDescriptionV2?: string;
  Department?: string;
  Location?: string | { Address?: string };
  Locations?: Array<string | { Address?: string }>;
  JobType?: string;
}

function locPart(value: string | { Address?: string } | undefined): string {
  if (!value) return "";
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.map((item) => locPart(item as { Address?: string })).filter(Boolean).join(" / ");
      }
      if (parsed && typeof parsed === "object" && "Address" in parsed) {
        return locPart(parsed as { Address?: string });
      }
    } catch {
      return value;
    }
    return value;
  }
  return value.Address ?? "";
}

function locationText(job: PineJob): string {
  return [locPart(job.Location), ...(job.Locations ?? []).map(locPart)].filter(Boolean).join(" / ");
}

interface PineResponse {
  Jobs?: PineJob[];
}

export const pineLabsConfig: CompanyConfig = {
  slug: "pine-labs",
  async crawl(ctx): Promise<RawJob[]> {
    const data = await fetchJson<PineResponse>("https://www.pinelabs.com/api/gateway/turbo-hire", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://www.pinelabs.com",
        Referer: "https://www.pinelabs.com/careers/open-jobs",
      },
      body: JSON.stringify({
        Skip: 0,
        Top: 100,
        SortBy: "None",
        Filters: { Departments: [], Locations: [], JobTypes: [], SearchString: "" },
        GetFiltersData: true,
      }),
      timeoutMs: 25_000,
    });
    const jobs = (data.Jobs ?? [])
      .filter((job) => INDIA_RE.test(locationText(job)))
      .map((job): RawJob => ({
        external_id: job.JobId,
        title: job.JobTitle ?? `Pine Labs role ${job.JobId}`,
        location_raw: locationText(job),
        description: stripHtml(job.JobDescriptionV2 ?? job.JobDescription),
        apply_url: `https://www.pinelabs.com/careers/open-jobs?jobId=${encodeURIComponent(job.JobId)}`,
        raw: job as unknown as Record<string, unknown>,
      }));
    ctx.log(`TurboHire [pine-labs] India jobs: ${jobs.length}`);
    return jobs;
  },
};
