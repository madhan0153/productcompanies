// Generic SmartRecruiters ATS adapter.
//
// SmartRecruiters exposes a public postings list at
//   https://api.smartrecruiters.com/v1/companies/<company>/postings
// returning paginated `content[]` (default 100/page). Each posting carries
// `name`, `location: {city, country, remote}`, `releasedDate`, `ref`.
// The list endpoint omits the JD body; we follow up with a per-posting GET
// on `/postings/<ref>` to fetch `jobAd.sections.jobDescription.text`.
//
// India filtering: `location.country` is an ISO label ("in", "IN", "India").
// We accept either the country OR a known India hub city.
//
// Adding a SmartRecruiters-hosted employer:
//   export const myCo = smartRecruitersConfig({ slug: "myco", company: "myco" });
// where `company` is the SR company slug — visible in the careers URL
// e.g. https://jobs.smartrecruiters.com/<company>.

import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";
import { fetchJson, pickUserAgent } from "../lib/http.js";

export interface SmartRecruitersConfigInput {
  slug: string;
  company: string;
  pageSize?: number;
  maxJobs?: number;
  /** Override India detection. */
  isIndiaJob?: (location: { city?: string; country?: string }, title: string) => boolean;
}

interface SRPostingListItem {
  id: string;
  name: string;
  ref?: string;
  releasedDate?: string;
  uuid?: string;
  location?: { city?: string; country?: string; remote?: boolean };
}
interface SRListResponse {
  content?: SRPostingListItem[];
  totalFound?: number;
  totalPages?: number;
  pageId?: number;
}
interface SRPostingDetail {
  id?: string;
  refNumber?: string;
  name?: string;
  applyUrl?: string;
  jobAd?: {
    sections?: {
      companyDescription?: { text?: string; title?: string };
      jobDescription?: { text?: string; title?: string };
      qualifications?: { text?: string };
      additionalInformation?: { text?: string };
    };
  };
}

const INDIA_HUB_RE = /\b(India|Bengaluru|Bangalore|Hyderabad|Noida|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|Kolkata|Ahmedabad|Tenkasi|Jaipur|Indore|Coimbatore|Trivandrum|Thiruvananthapuram|Vizag|Visakhapatnam|Kochi|Cochin)\b/i;
const IN_COUNTRY_RE = /^(in|ind|india)$/i;

const defaultIsIndia = (loc: { city?: string; country?: string }): boolean => {
  if (loc.country && IN_COUNTRY_RE.test(loc.country)) return true;
  if (loc.city && INDIA_HUB_RE.test(loc.city)) return true;
  return false;
};

function stripHtml(s: string | undefined): string {
  if (!s) return "";
  return s
    .replace(/<\/?(p|br|div|ul|ol|li|h[1-6])[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function smartRecruitersConfig(cfg: SmartRecruitersConfigInput): CompanyConfig {
  const pageSize = cfg.pageSize ?? 100;
  const maxJobs = cfg.maxJobs ?? 500;
  const isIndia = cfg.isIndiaJob ?? defaultIsIndia;

  return {
    slug: cfg.slug,
    async crawl(ctx: CrawlContext): Promise<RawJob[]> {
      const { log } = ctx;
      const jobs: RawJob[] = [];
      let page = 0;
      let totalPages = Infinity;
      const seen = new Set<string>();

      while (page < totalPages && jobs.length < maxJobs) {
        const url = `https://api.smartrecruiters.com/v1/companies/${cfg.company}/postings?limit=${pageSize}&offset=${page * pageSize}`;
        let data: SRListResponse;
        try {
          data = await fetchJson<SRListResponse>(url, {
            headers: { Accept: "application/json", "User-Agent": pickUserAgent() },
            timeoutMs: 25_000,
          });
        } catch (err) {
          log(`SR [${cfg.company}] page ${page} failed: ${(err as Error).message}`, "warn");
          break;
        }
        if (totalPages === Infinity) totalPages = data.totalPages ?? 1;
        const batch = data.content ?? [];
        if (batch.length === 0) break;

        for (const p of batch) {
          if (!p.location || !isIndia(p.location, p.name)) continue;
          const ref = p.ref ?? p.id;
          if (seen.has(ref)) continue;
          seen.add(ref);

          let description = "";
          let applyUrl = `https://jobs.smartrecruiters.com/${cfg.company}/${p.id}`;
          try {
            const detail = await fetchJson<SRPostingDetail>(
              `https://api.smartrecruiters.com/v1/companies/${cfg.company}/postings/${p.id}`,
              { headers: { Accept: "application/json", "User-Agent": pickUserAgent() }, timeoutMs: 20_000 },
            );
            if (detail.applyUrl) applyUrl = detail.applyUrl;
            const sec = detail.jobAd?.sections;
            description = [
              stripHtml(sec?.jobDescription?.text),
              stripHtml(sec?.qualifications?.text),
              stripHtml(sec?.additionalInformation?.text),
            ].filter(Boolean).join("\n\n").trim();
          } catch (err) {
            log(`SR [${cfg.company}] detail ${p.id} failed: ${(err as Error).message}`, "warn");
          }

          const cityCountry = [p.location.city, p.location.country].filter(Boolean).join(", ");
          jobs.push({
            external_id: p.id,
            title: p.name,
            location_raw: cityCountry,
            description,
            apply_url: applyUrl,
            posted_at: p.releasedDate,
            raw: p as unknown as Record<string, unknown>,
          });
          await sleep(120 + Math.floor(Math.random() * 80));
          if (jobs.length >= maxJobs) break;
        }
        page++;
        await sleep(300);
      }

      log(`SR [${cfg.company}] India jobs: ${jobs.length}`);
      return jobs;
    },
  };
}
