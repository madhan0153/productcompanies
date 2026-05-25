import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { fetchWithRetry, pickUserAgent } from "../lib/http.js";
import { stripHtml } from "./_simple.js";

const SEARCH_URL = "https://jobs.intuit.com/search-jobs/India/27595/2/1269750/22x351115/78x667743/50/2";

function decodeHtml(input: string): string {
  return input
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function attr(input: string, name: string): string | undefined {
  const match = input.match(new RegExp(`${name}="([^"]*)"`, "i"));
  return match ? decodeHtml(match[1] ?? "") : undefined;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetchWithRetry(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": pickUserAgent(),
    },
    timeoutMs: 30_000,
  });
  return res.text();
}

function parseListings(html: string): RawJob[] {
  const jobs: RawJob[] = [];
  const itemRe = /<li\b[^>]*data-intuit-jobid="[^"]+"[\s\S]*?<\/li>/gi;
  for (const match of html.matchAll(itemRe)) {
    const item = match[0];
    const anchor = item.match(/<a\b[^>]*class="[^"]*\bsr-item\b[^"]*"[^>]*>/i)?.[0] ?? "";
    const href = attr(anchor, "href");
    const title = attr(anchor, "data-title");
    const jobId = attr(item.match(/<li\b[^>]*>/i)?.[0] ?? "", "data-intuit-jobid");
    const location = decodeHtml(
      item.match(/<span\b[^>]*class="job-location"[^>]*>([\s\S]*?)<\/span>/i)?.[1]?.replace(/<[^>]+>/g, " ") ?? "",
    );

    if (!href || !title || !jobId || !/\bIndia\b/i.test(location)) continue;
    jobs.push({
      external_id: jobId,
      title,
      location_raw: location,
      description: "",
      apply_url: new URL(href, "https://jobs.intuit.com").toString(),
      raw: { href, title, location },
    });
  }
  return jobs;
}

function parseDescription(html: string): string {
  const main =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ??
    html.match(/<section\b[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/section>/i)?.[1] ??
    html;
  return stripHtml(main).slice(0, 12_000);
}

export const intuitConfig: CompanyConfig = {
  slug: "intuit",
  async crawl(ctx): Promise<RawJob[]> {
    const html = await fetchText(SEARCH_URL);
    const jobs = parseListings(html);

    let enriched = 0;
    for (const job of jobs) {
      if (!job.apply_url) continue;
      try {
        job.description = parseDescription(await fetchText(job.apply_url));
        if ((job.description ?? "").length >= 80) enriched++;
      } catch (error) {
        ctx.log(`Intuit detail ${job.external_id} failed: ${(error as Error).message}`, "warn");
      }
    }

    ctx.log(`Intuit official jobs: ${jobs.length} India jobs, descriptions ${enriched}/${jobs.length}`);
    return jobs;
  },
};
