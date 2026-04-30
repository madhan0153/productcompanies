import type { Page } from "playwright";
import type { RawJob } from "@prodmatch/shared";

export interface CrawlContext {
  page: Page;
  log: (msg: string, level?: "info" | "warn" | "error") => void;
}

export interface CompanyConfig {
  slug: string;
  crawl: (ctx: CrawlContext) => Promise<RawJob[]>;
}

// Delay helper to be polite to servers
export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
