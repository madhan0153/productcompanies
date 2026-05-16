import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep, enrichDescriptions } from "./_types.js";
import { fetchJson } from "../lib/http.js";

// Nvidia Workday — locationHierarchy1 facet ID confirmed from careers page URL.
// CXS API path (used for listing) and the user-facing detail URL pattern are
// different: CXS is /wday/cxs/{tenant}/{site}, detail pages live under
// /en-US/{site}/job/.... Using the CXS path as a public URL 404s.
const BASE = "https://nvidia.wd5.myworkdayjobs.com";
const SITE = "NVIDIAExternalCareerSite";
const SITE_PATH = `/wday/cxs/nvidia/${SITE}`;
const PUBLIC_PREFIX = `/en-US/${SITE}`;
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
  return fetchJson<WdResponse>(`${BASE}${SITE_PATH}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appliedFacets: { locationHierarchy1: [INDIA_FACET_ID] },
      limit: 20,
      offset,
      searchText: "",
    }),
  });
}

export const nvidiaConfig: CompanyConfig = {
  slug: "nvidia",
  async crawl(ctx: CrawlContext): Promise<RawJob[]> {
    const { log } = ctx;
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
          // Drop the bullet teaser entirely so enrichDescriptions kicks in
          // (its < 60-char gate is what triggers the detail-page fetch).
          description: "",
          apply_url: `${BASE}${PUBLIC_PREFIX}${j.externalPath}`,
          posted_at: j.postedOn,
          raw: j as unknown as Record<string, unknown>,
        });
      }

      offset += batch.length;
      if (batch.length < 20) break;
      await sleep(500);
    }

    log(`Total: ${jobs.length} India jobs`);

    // Workday listing API returns only bullet teasers. Enrich with full JD body.
    await enrichDescriptions(ctx, jobs, () => {
      const tryEls = [
        "[data-automation-id='jobPostingDescription']",
        "[data-automation-id*='description'i]",
        "[class*='job-description'i]",
        "main article",
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
