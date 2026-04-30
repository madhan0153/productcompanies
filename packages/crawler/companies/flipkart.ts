import type { CompanyConfig, CrawlContext } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { sleep } from "./_types.js";

// Confirmed: Flipkart uses TurboHire platform
// URL: https://flipkart.turbohire.co/dashboardv2?orgId=4d757ba0-3d57-448a-b82c-238ed87ac90f&type=0
// API requires Bearer JWT obtained by loading the page → use Playwright interception
const ORG_ID = "4d757ba0-3d57-448a-b82c-238ed87ac90f";
const CAREER_URL = `https://flipkart.turbohire.co/dashboardv2?orgId=${ORG_ID}&type=0`;

interface TurboLocation {
  Address?: string;
}

interface TurboJob {
  JobId: string;
  JobCode: string;
  JobTitle: string;
  Department?: string;
  Location?: string | TurboLocation[];
  City?: string;
  PublishedDate?: string;
  ExpiryDates?: Record<string, string>;
  JobDescription?: string;
}

interface TurboResponse {
  Total: number;
  Result: TurboJob[];
}

function extractTurboCity(loc: string | TurboLocation[] | undefined): string | undefined {
  if (!loc) return undefined;
  if (typeof loc === "string") return loc || undefined;
  // Array of location objects — extract city from Address field
  const addr = loc[0]?.Address;
  if (!addr) return undefined;
  // Address: "Alok Clinic, Sector 1A, New Panvel East, Panvel, Maharashtra, India"
  // Use the second-to-last comma-segment as city approximation, or first segment
  const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

export const flipkartConfig: CompanyConfig = {
  slug: "flipkart",
  async crawl({ page, log }: CrawlContext): Promise<RawJob[]> {
    const jobs: RawJob[] = [];

    // Intercept the filteredjobs API response (JWT obtained automatically by page load)
    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("careerpagev2/filteredjobs") && resp.status() === 200,
      { timeout: 45_000 },
    );

    await page.goto(CAREER_URL, { waitUntil: "load", timeout: 60_000 });

    try {
      const resp = await responsePromise;
      const data = (await resp.json()) as TurboResponse;
      const batch = data.Result ?? [];
      log(`Total: ${data.Total} jobs`);

      for (const j of batch) {
        const location = j.City ?? extractTurboCity(j.Location) ?? "Bengaluru";
        jobs.push({
          external_id: j.JobId,
          title: j.JobTitle,
          location_raw: location,
          description: j.JobDescription ?? (j.Department ? `Department: ${j.Department}` : ""),
          apply_url: `https://flipkart.turbohire.co/candidatelogin?orgId=${ORG_ID}&jobId=${j.JobId}`,
          posted_at: j.PublishedDate,
          raw: j as unknown as Record<string, unknown>,
        });
      }
    } catch (err) {
      log(`API interception failed: ${err instanceof Error ? err.message : String(err)}`, "warn");
      // Fallback: wait and retry once
      await sleep(5000);
      const fallbackResp = await page.waitForResponse(
        (resp) => resp.url().includes("careerpagev2/filteredjobs"),
        { timeout: 30_000 },
      ).catch(() => null);
      if (fallbackResp) {
        const data = (await fallbackResp.json()) as TurboResponse;
        for (const j of (data.Result ?? [])) {
          jobs.push({
            external_id: j.JobId,
            title: j.JobTitle,
            location_raw: j.City ?? extractTurboCity(j.Location) ?? "Bengaluru",
            description: j.JobDescription ?? "",
            apply_url: `https://flipkart.turbohire.co/candidatelogin?orgId=${ORG_ID}&jobId=${j.JobId}`,
            posted_at: j.PublishedDate,
            raw: j as unknown as Record<string, unknown>,
          });
        }
      }
    }

    log(`Total: ${jobs.length} India jobs`);
    return jobs;
  },
};
