import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";

export const INDIA_RE = /\b(India|Bengaluru|Bangalore|Hyderabad|Noida|Gurugram|Gurgaon|Pune|Mumbai|Chennai|Delhi|NCR|Remote-India)\b/i;

export function stripHtml(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/<\/?(p|br|div|ul|ol|li|h[1-6]|tr|td|th)[^>]*>/gi, "\n")
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

export function emptyOfficialConfig(slug: string, note: string): CompanyConfig {
  return {
    slug,
    async crawl(ctx): Promise<RawJob[]> {
      ctx.log(note, "warn");
      return [];
    },
  };
}
