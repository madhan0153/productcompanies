// Generic Workday ATS adapter.
//
// Many large enterprises publish their careers via Workday's `cxs` job-search
// API: a public, paginated JSON endpoint at
//   https://<tenant>.<wd_pod>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs
// where <tenant> = company subdomain, <wd_pod> = wd1/wd3/wd5/etc (regional
// Workday cluster), and <site> = the careers site path (varies per tenant,
// commonly "External" / "External_Career" / "<Company>Careers").
//
// This adapter takes (tenant, pod, site) plus an India-detection predicate
// and returns a fully-formed CompanyConfig. One module per Workday-using
// employer (Adobe, Intuit, Uber, PayPal, ServiceNow, …) now collapses into
// a few lines of config each.
//
// India filtering: we don't try to use Workday's appliedFacets.locationCountry
// (the country UUID is tenant-specific and discovering it requires a separate
// `facets` call). Instead we fetch all postings and filter by `locationsText`
// containing "India" — works across every tenant we tested without per-tenant
// reverse engineering.
//
// JD enrichment: Workday's listing endpoint returns titles + locations but no
// description body. We follow up with a per-job GET on the job detail URL,
// extract the `jobDescription` HTML, and stuff it into raw + description.

import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";
import { fetchJson, pickUserAgent } from "../lib/http.js";

export interface WorkdayConfigInput {
  /** Our internal company slug — must match a row in public.companies. */
  slug: string;
  /** Workday tenant (subdomain). e.g. "adobe", "intuit", "uber", "paypal". */
  tenant: string;
  /** Workday pod — wd1 / wd3 / wd5 / wd12 / etc. */
  pod: "wd1" | "wd3" | "wd5" | "wd12" | string;
  /** Workday careers site path. Varies per tenant; common values:
   *  "External", "External_Career", "<Company>Careers", "uberinternal". */
  site: string;
  /** Polite page size — Workday rejects >50 silently. */
  pageSize?: number;
  /** Hard cap on total jobs fetched. Defaults to 1000. */
  maxJobs?: number;
  /** Override India detection if `locationsText.includes("India")` is too loose. */
  isIndiaJob?: (postingLocations: string[], title: string) => boolean;
}

interface WorkdayJobPosting {
  title: string;
  externalPath: string;
  locationsText?: string;
  postedOn?: string;
  bulletFields?: string[];
}

interface WorkdaySearchResponse {
  jobPostings?: WorkdayJobPosting[];
  total?: number;
}

interface WorkdayJobDetail {
  jobPostingInfo?: {
    title?: string;
    jobDescription?: string;
    location?: string;
    postedOn?: string;
    jobReqId?: string;
  };
}

// Workday `locationsText` often returns a city name only ("Noida",
// "Bengaluru") with no country. Match either the country OR any India hub.
// "2 Locations" / "3 Locations" placeholders we'd need a detail-API call to
// resolve — we let them through and rely on the JD body + downstream
// location parser to flag non-India ones for deactivation.
const INDIA_HUB_RE = /\b(India|Bengaluru|Bangalore|Hyderabad|Noida|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|Kolkata|Ahmedabad|Tenkasi|Jaipur|Indore|Coimbatore|Trivandrum|Thiruvananthapuram|Vizag|Visakhapatnam)\b/i;
const MULTI_LOC_RE = /^\d+\s+Locations?$/i;

const defaultIsIndia = (locs: string[]): boolean =>
  locs.some((l) => INDIA_HUB_RE.test(l) || MULTI_LOC_RE.test(l));

/**
 * Build a CompanyConfig for a Workday-hosted careers site.
 *
 * Example: workdayConfig({ slug: "adobe", tenant: "adobe", pod: "wd5",
 *                          site: "external_experienced" });
 */
export function workdayConfig(cfg: WorkdayConfigInput): CompanyConfig {
  const pageSize = cfg.pageSize ?? 20;
  const maxJobs  = cfg.maxJobs  ?? 1000;
  const isIndia  = cfg.isIndiaJob ?? defaultIsIndia;
  const baseTenantUrl =
    `https://${cfg.tenant}.${cfg.pod}.myworkdayjobs.com`;
  const searchUrl =
    `${baseTenantUrl}/wday/cxs/${cfg.tenant}/${cfg.site}/jobs`;
  const detailBase =
    `${baseTenantUrl}/wday/cxs/${cfg.tenant}/${cfg.site}`;
  const referer = `${baseTenantUrl}/${cfg.site}`;

  return {
    slug: cfg.slug,
    async crawl(ctx: CrawlContext): Promise<RawJob[]> {
      const { log } = ctx;
      const jobs: RawJob[] = [];
      let offset = 0;
      let total = Infinity;
      const seen = new Set<string>();

      while (jobs.length < maxJobs && offset < total) {
        log(`Workday [${cfg.tenant}] offset=${offset} / ${total === Infinity ? "?" : total}`);
        let data: WorkdaySearchResponse;
        try {
          data = await fetchJson<WorkdaySearchResponse>(searchUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
              "User-Agent": pickUserAgent(),
              Referer: referer,
            },
            body: JSON.stringify({
              appliedFacets: {},
              limit: pageSize,
              offset,
              searchText: "",
            }),
            timeoutMs: 30_000,
          });
        } catch (err) {
          log(`Workday [${cfg.tenant}] page failed: ${(err as Error).message}`, "warn");
          break;
        }

        if (total === Infinity) total = data.total ?? 0;
        const batch = data.jobPostings ?? [];
        if (batch.length === 0) break;

        for (const p of batch) {
          const locs = (p.locationsText ?? "").split(/;|\||,/).map((s) => s.trim()).filter(Boolean);
          if (!isIndia(locs, p.title)) continue;
          if (!p.externalPath) continue;
          if (seen.has(p.externalPath)) continue;
          seen.add(p.externalPath);

          const applyUrl = `${baseTenantUrl}${p.externalPath}`;
          // Workday detail endpoint mirrors the listing path under the same
          // cxs base, e.g. /wday/cxs/<tenant>/<site>/job/<path>.
          const detailUrl =
            `${detailBase}/job${p.externalPath.replace(/^.*\/job/, "")}`;

          let description = "";
          try {
            const detail = await fetchJson<WorkdayJobDetail>(detailUrl, {
              headers: {
                Accept: "application/json",
                "User-Agent": pickUserAgent(),
                Referer: applyUrl,
              },
              timeoutMs: 25_000,
            });
            const html = detail.jobPostingInfo?.jobDescription ?? "";
            // Strip basic HTML to keep the description LLM-friendly.
            description = html
              .replace(/<\/?(p|br|div|ul|ol|li|h[1-6])[^>]*>/gi, "\n")
              .replace(/<[^>]+>/g, " ")
              .replace(/&nbsp;/g, " ")
              .replace(/&amp;/g, "&")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/\s+\n/g, "\n")
              .replace(/\n{3,}/g, "\n\n")
              .trim();
          } catch (err) {
            log(`detail-fail ${p.externalPath}: ${(err as Error).message}`, "warn");
          }

          jobs.push({
            external_id: p.externalPath,
            title: p.title,
            location_raw: p.locationsText ?? "",
            description,
            apply_url: applyUrl,
            posted_at: p.postedOn,
            raw: p as unknown as Record<string, unknown>,
          });

          // Polite jitter — detail-page fetches are expensive on Workday.
          await sleep(120 + Math.floor(Math.random() * 80));
          if (jobs.length >= maxJobs) break;
        }

        offset += batch.length;
        if (batch.length < pageSize) break;
        await sleep(400);
      }

      log(`Workday [${cfg.tenant}] total India jobs: ${jobs.length}`);
      return jobs;
    },
  };
}
