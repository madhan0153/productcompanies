import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";

// Confirmed: careers.cred.club/openings uses Next.js SSG with all job data in __NEXT_DATA__
// props.pageProps.data.data[] contains all open roles
const PAGE_URL = "https://careers.cred.club/openings";

interface CredJob {
  id: string;
  text: string;
  categories?: {
    location?: string;
    department?: string;
    commitment?: string;
    allLocations?: string[];
  };
  content?: { description?: string };
  createdAt?: string;
}

interface NextData {
  props?: {
    pageProps?: {
      data?: { data?: CredJob[] };
    };
  };
}

export const credConfig: CompanyConfig = {
  slug: "cred",
  async crawl({ log }: CrawlContext): Promise<RawJob[]> {
    const res = await fetch(PAGE_URL, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ProdMatchBot/1.0)" },
    });
    if (!res.ok) throw new Error(`CRED fetch ${res.status}`);
    const html = await res.text();

    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new Error("CRED: __NEXT_DATA__ not found in page HTML");

    const nextData = JSON.parse(m[1]) as NextData;
    const jobs = nextData.props?.pageProps?.data?.data ?? [];
    log(`Total: ${jobs.length} jobs`);

    return jobs.map((j) => {
      const location = j.categories?.allLocations?.join(", ") ?? j.categories?.location ?? "Bengaluru";
      return {
        external_id: j.id,
        title: j.text,
        location_raw: location,
        description: j.content?.description ?? "",
        apply_url: `https://careers.cred.club/openings/${j.id}`,
        posted_at: j.createdAt,
        raw: j as unknown as Record<string, unknown>,
      };
    });
  },
};
