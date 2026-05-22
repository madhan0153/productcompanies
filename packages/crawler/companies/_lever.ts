// Generic Lever ATS adapter.
//
// Lever exposes a public, paginated-by-default JSON postings endpoint at
//   https://api.lever.co/v0/postings/<org>?mode=json
// which returns every active posting in one response (no pagination). Each
// posting includes a plain-text description (descriptionPlain) — we can
// skip detail-page navigation entirely.
//
// India filtering: postings carry `categories.location` as a free-text
// city / region string. We match on India hub names (Bengaluru, Hyderabad,
// Mumbai, …) and the country itself.
//
// Adding a Lever-hosted employer is one config file:
//   export const myCoConfig = leverConfig({ slug: "myco", org: "myco" });
// where `org` is the URL slug Lever uses (often the company's domain
// stem, e.g. "postman", "unacademy", "clevertap").

import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchJson, pickUserAgent } from "../lib/http.js";

export interface LeverConfigInput {
  /** Our internal company slug. */
  slug: string;
  /** Lever org URL slug — appears in api.lever.co/v0/postings/<org>. */
  org: string;
  /** Hard cap on jobs ingested. Default 500. */
  maxJobs?: number;
  /** Override India detection (string matcher on category fields). */
  isIndiaJob?: (postingLocation: string, workplaceType: string, title: string) => boolean;
}

interface LeverCategories {
  team?: string;
  department?: string;
  location?: string;
  commitment?: string;
  allLocations?: string[];
}

interface LeverPosting {
  id: string;
  text: string;                  // title
  categories?: LeverCategories;
  hostedUrl: string;
  applyUrl?: string;
  descriptionPlain?: string;
  description?: string;
  workplaceType?: "on-site" | "hybrid" | "remote" | string;
  createdAt?: number;
  updatedAt?: number;
}

const INDIA_HUB_RE = /\b(India|Bengaluru|Bangalore|Hyderabad|Noida|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|Kolkata|Ahmedabad|Tenkasi|Jaipur|Indore|Coimbatore|Trivandrum|Thiruvananthapuram|Vizag|Visakhapatnam|Kochi|Cochin)\b/i;
const REMOTE_INDIA_RE = /\b(remote.*india|india.*remote|apac|asia[- ]pacific)\b/i;

const defaultIsIndia = (
  location: string,
  workplaceType: string,
  _title: string,
): boolean => {
  if (INDIA_HUB_RE.test(location)) return true;
  if (workplaceType === "remote" && REMOTE_INDIA_RE.test(location)) return true;
  return false;
};

export function leverConfig(cfg: LeverConfigInput): CompanyConfig {
  const maxJobs = cfg.maxJobs ?? 500;
  const isIndia = cfg.isIndiaJob ?? defaultIsIndia;
  const url = `https://api.lever.co/v0/postings/${cfg.org}?mode=json`;

  return {
    slug: cfg.slug,
    async crawl(ctx: CrawlContext): Promise<RawJob[]> {
      const { log } = ctx;
      log(`Lever [${cfg.org}] fetching ${url}`);

      let postings: LeverPosting[] = [];
      try {
        postings = await fetchJson<LeverPosting[]>(url, {
          headers: { Accept: "application/json", "User-Agent": pickUserAgent() },
          timeoutMs: 30_000,
        });
      } catch (err) {
        log(`Lever [${cfg.org}] fetch failed: ${(err as Error).message}`, "warn");
        return [];
      }

      const jobs: RawJob[] = [];
      for (const p of postings) {
        const allLocs = p.categories?.allLocations ?? [];
        const primary = p.categories?.location ?? "";
        const merged = [primary, ...allLocs].filter(Boolean).join("; ");
        const wt = p.workplaceType ?? "on-site";
        // Try primary first; if it doesn't match, try each in allLocations.
        const indiaPrimary = isIndia(primary, wt, p.text);
        const indiaAny = indiaPrimary
          || allLocs.some((l) => isIndia(l, wt, p.text));
        if (!indiaAny) continue;

        jobs.push({
          external_id: p.id,
          title: p.text,
          location_raw: merged,
          // descriptionPlain is the LLM-friendly form. Fall back to stripped
          // HTML if Lever didn't supply it for some reason.
          description: (p.descriptionPlain ?? "").trim()
            || (p.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
          apply_url: p.applyUrl ?? p.hostedUrl,
          posted_at: p.createdAt ? new Date(p.createdAt).toISOString() : undefined,
          raw: p as unknown as Record<string, unknown>,
        });
        if (jobs.length >= maxJobs) break;
      }

      log(`Lever [${cfg.org}] India jobs: ${jobs.length} / ${postings.length} total`);
      return jobs;
    },
  };
}
