import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Confirmed: Oracle HCM Cloud REST API
// URL: https://careers.oracle.com/en/sites/jobsearch/jobs?locationId=300000000106947
const API_BASE = "https://eeho.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions";
const INDIA_LOCATION_ID = "300000000106947";
const SITE_NUMBER = "CX_45001";

interface OracleJob {
  Id: string;
  Title: string;
  PostedDate?: string;
  PrimaryLocation?: string;
  ShortDescriptionStr?: string;
  ExternalQualificationsStr?: string;
  ExternalResponsibilitiesStr?: string;
}

interface OracleResponse {
  items?: Array<{
    TotalJobsCount: number;
    requisitionList?: OracleJob[];
    Offset?: number;
    Limit?: number;
  }>;
}

async function fetchPage(offset: number): Promise<OracleResponse> {
  const url = `${API_BASE}?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=${SITE_NUMBER},selectedLocationsFacet=${INDIA_LOCATION_ID},locationId=${INDIA_LOCATION_ID},limit=25,offset=${offset}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json",
    },
  });
  if (!res.ok) throw new Error(`Oracle HCM API ${res.status}`);
  return res.json() as Promise<OracleResponse>;
}

export const oracleConfig: CompanyConfig = {
  slug: "oracle",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];
    let offset = 0;
    let total = Infinity;

    while (jobs.length < total) {
      log(`Fetching offset ${offset} / ${total === Infinity ? "?" : total}...`);
      const data = await fetchPage(offset);
      const item = data.items?.[0];
      if (!item) break;

      if (total === Infinity) total = item.TotalJobsCount ?? 0;
      const batch = item.requisitionList ?? [];
      if (batch.length === 0) break;

      for (const j of batch) {
        const desc = [j.ShortDescriptionStr, j.ExternalResponsibilitiesStr, j.ExternalQualificationsStr]
          .filter(Boolean)
          .join("\n\n");
        jobs.push({
          external_id: j.Id,
          title: j.Title,
          location_raw: j.PrimaryLocation ?? "India",
          description: desc,
          apply_url: `https://careers.oracle.com/en/sites/jobsearch/job/${j.Id}`,
          posted_at: j.PostedDate,
          raw: j as unknown as Record<string, unknown>,
        });
      }

      offset += batch.length;
      if (batch.length < 25) break;
      await sleep(500);
    }

    log(`Total: ${jobs.length} India jobs`);
    return jobs;
  },
};
