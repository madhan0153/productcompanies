// Generic Greenhouse ATS adapter.
//
// Greenhouse exposes a public board-listing JSON API at
//   https://boards-api.greenhouse.io/v1/boards/<board_token>/jobs?content=true
// returning every active posting in one response (no pagination), including
// the HTML body. We strip HTML to a plain-text description so the JD parser
// sees clean text.
//
// India filtering: postings have `location.name` (free text) and `offices`
// (array of named offices). We match either against India hub names.
//
// Adding a Greenhouse-hosted employer is one config file:
//   export const myCoConfig = greenhouseConfig({ slug: "myco", board: "myco" });
// where `board` is the Greenhouse board token (usually the company slug; for
// some employers it's distinct — check boards.greenhouse.io/<token> in a
// browser to confirm).

import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchJson, pickUserAgent } from "../lib/http.js";

export interface GreenhouseConfigInput {
  /** Our internal company slug. */
  slug: string;
  /** Greenhouse board token — segment after /boards/ in the public URL. */
  board: string;
  /** Hard cap. Default 800. */
  maxJobs?: number;
  /** Override India detection. */
  isIndiaJob?: (locationName: string, offices: string[], title: string) => boolean;
}

interface GreenhouseOffice {
  id?: number;
  name?: string;
  location?: string;
}
interface GreenhouseJob {
  id: number | string;
  title: string;
  updated_at?: string;
  absolute_url?: string;
  location?: { name?: string };
  offices?: GreenhouseOffice[];
  departments?: { name?: string }[];
  content?: string;          // HTML
  internal_job_id?: number;
}
interface GreenhouseListResponse {
  jobs?: GreenhouseJob[];
  meta?: { total?: number };
}

const INDIA_HUB_RE = /\b(India|Bengaluru|Bangalore|Hyderabad|Noida|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|Kolkata|Ahmedabad|Tenkasi|Jaipur|Indore|Coimbatore|Trivandrum|Thiruvananthapuram|Vizag|Visakhapatnam|Kochi|Cochin)\b/i;
const REMOTE_INDIA_RE = /\b(remote.*india|india.*remote|apac|asia[- ]pacific)\b/i;

const defaultIsIndia = (
  locName: string,
  offices: string[],
  _title: string,
): boolean => {
  if (INDIA_HUB_RE.test(locName)) return true;
  if (offices.some((o) => INDIA_HUB_RE.test(o))) return true;
  if (REMOTE_INDIA_RE.test(locName)) return true;
  return false;
};

function htmlToText(html: string): string {
  return html
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

export function greenhouseConfig(cfg: GreenhouseConfigInput): CompanyConfig {
  const maxJobs = cfg.maxJobs ?? 800;
  const isIndia = cfg.isIndiaJob ?? defaultIsIndia;
  const url = `https://boards-api.greenhouse.io/v1/boards/${cfg.board}/jobs?content=true`;

  return {
    slug: cfg.slug,
    async crawl(ctx: CrawlContext): Promise<RawJob[]> {
      const { log } = ctx;
      log(`Greenhouse [${cfg.board}] fetching ${url}`);

      let data: GreenhouseListResponse;
      try {
        data = await fetchJson<GreenhouseListResponse>(url, {
          headers: { Accept: "application/json", "User-Agent": pickUserAgent() },
          timeoutMs: 30_000,
        });
      } catch (err) {
        log(`Greenhouse [${cfg.board}] fetch failed: ${(err as Error).message}`, "warn");
        return [];
      }

      const jobs: RawJob[] = [];
      const total = data.jobs?.length ?? 0;
      for (const j of data.jobs ?? []) {
        const locName = j.location?.name ?? "";
        const offices = (j.offices ?? []).map((o) => o.name ?? "").filter(Boolean);
        if (!isIndia(locName, offices, j.title)) continue;

        jobs.push({
          external_id: String(j.id),
          title: j.title,
          location_raw: [locName, ...offices].filter(Boolean).join("; "),
          description: htmlToText(j.content ?? ""),
          apply_url: j.absolute_url ?? "",
          posted_at: j.updated_at,
          raw: j as unknown as Record<string, unknown>,
        });
        if (jobs.length >= maxJobs) break;
      }

      log(`Greenhouse [${cfg.board}] India jobs: ${jobs.length} / ${total} total`);
      return jobs;
    },
  };
}
