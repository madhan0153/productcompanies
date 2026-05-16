import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";
import { fetchJson } from "../lib/http.js";

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
  return fetchJson<OracleResponse>(url);
}

export const oracleConfig: CompanyConfig = {
  slug: "oracle",
  async crawl(ctx: CrawlContext): Promise<RawJob[]> {
    const { log } = ctx;
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
        // Always keep the API seed (~500 chars). It's enough for the parser
        // to extract some skills, and discarding it left half of Oracle rows
        // with empty descriptions when detail-page enrichment failed.
        // enrichDescriptions only kicks in when seed is < 60 chars, so any
        // row with a real seed bypasses it — that's the right tradeoff.
        const seedDesc = [j.ShortDescriptionStr, j.ExternalResponsibilitiesStr, j.ExternalQualificationsStr]
          .filter(Boolean)
          .join("\n\n");
        jobs.push({
          external_id: j.Id,
          title: j.Title,
          location_raw: j.PrimaryLocation ?? "India",
          description: seedDesc,
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

    await enrichDescriptions(ctx, jobs, () => {
      const tryEls = [
        "[class*='job-description'i]",
        "[class*='job-details'i]",
        "main",
        "[role='main']",
        "body",
      ];
      for (const sel of tryEls) {
        const el = document.querySelector(sel);
        const text = (el?.textContent ?? "").trim();
        if (text.length >= 400) return Promise.resolve(text);
      }
      return Promise.resolve("");
    }, { waitUntil: "networkidle", extraWaitMs: 1500, timeoutMs: 35_000 });

    return jobs;
  },
};
