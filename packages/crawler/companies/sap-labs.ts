import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";

// Confirmed: jobs.sap.com/search/?q=&optionsFacetsDD_country=IN is server-rendered HTML
// Pagination via startrow=0,25,50,...; 25 jobs/page; ~159 India jobs
// Job rows: <tr class="data-row"> with <a class="jobTitle-link" href="/job/{slug}/{id}/">Title</a>
// ID: last numeric path segment of href; City: first decoded token of slug path
const BASE_URL = "https://jobs.sap.com/search/?q=&optionsFacetsDD_country=IN";
const JOBS_BASE = "https://jobs.sap.com";
const PAGE_SIZE = 25;

export const sapLabsConfig: CompanyConfig = {
  slug: "sap-labs",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const allJobs: RawJob[] = [];
    const seenIds = new Set<string>();
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const url = `${BASE_URL}&startrow=${offset}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" },
      });
      if (!res.ok) throw new Error(`SAP fetch ${res.status} at offset ${offset}`);
      const html = await res.text();

      // Extract total on first page: aria-label="Results 1 – 25 of 159"
      if (offset === 0) {
        const m = html.match(/Results\s+<b>\d[^<]*<\/b>\s+of\s+<b>([\d,]+)<\/b>/i)
          ?? html.match(/of\s+<b>([\d,]+)<\/b>/i);
        if (m) {
          total = parseInt(m[1].replace(/,/g, ""), 10);
          log(`Total jobs reported: ${total}`);
        } else {
          total = PAGE_SIZE; // fallback: only fetch one page
        }
      }

      // Parse job rows
      const rowPattern = /<tr[^>]*class="[^"]*data-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
      let match: RegExpExecArray | null;
      let pageCount = 0;

      while ((match = rowPattern.exec(html)) !== null) {
        const rowHtml = match[1];
        const linkMatch = rowHtml.match(/class="jobTitle-link"[^>]*href="([^"]+)"[^>]*>([^<]+)</);
        if (!linkMatch) continue;

        const href = linkMatch[1];
        const title = linkMatch[2].trim();

        // ID: last path segment (numeric)
        const idMatch = href.match(/\/(\d+)\/?$/);
        const id = idMatch?.[1] ?? href;
        if (!id || seenIds.has(id)) continue;
        seenIds.add(id);

        // City: decode first path segment after /job/, split by hyphens, first token
        const slugMatch = href.match(/\/job\/([^/]+)\//);
        const city = slugMatch ? extractCity(decodeURIComponent(slugMatch[1])) : "India";

        allJobs.push({
          external_id: id,
          title,
          location_raw: city,
          description: "",
          apply_url: `${JOBS_BASE}${href}`,
          raw: { id, title, href },
        });
        pageCount++;
      }

      log(`Offset ${offset}: ${pageCount} jobs (total so far: ${allJobs.length})`);

      if (pageCount === 0) break; // no more rows
      offset += PAGE_SIZE;
    }

    log(`Total: ${allJobs.length} India jobs`);
    return allJobs;
  },
};

function extractCity(slug: string): string {
  // slug looks like "Bangalore-Senior-Account-Executive-...-560103"
  // First token is the city
  const first = slug.split("-")[0] ?? "India";
  // Normalize common SAP city names
  const map: Record<string, string> = {
    Bangalore: "Bengaluru",
    Bengaluru: "Bengaluru",
    Hyderabad: "Hyderabad",
    Gurgaon: "Gurugram",
    Gurugram: "Gurugram",
    Mumbai: "Mumbai",
    Pune: "Pune",
    Delhi: "Delhi NCR",
    Noida: "Noida",
    Chennai: "Chennai",
  };
  return map[first] ?? first;
}
