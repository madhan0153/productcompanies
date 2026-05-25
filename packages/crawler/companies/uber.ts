import { chromium } from "playwright";
import type { CompanyConfig } from "./_types.js";
import type { RawJob } from "@prodmatch/shared";
import { enrichDescriptions, sleep } from "./_types.js";

const LIST_URL = "https://www.uber.com/us/en/careers/list/";
const INDIA_RE = /\b(Bengaluru|Bangalore|Hyderabad|Gurugram|Gurgaon|Visakhapatnam|India)\b/i;

interface UberLink {
  href: string;
  title: string;
  text: string;
}

function parseLink(link: UberLink): RawJob | null {
  const id = link.href.match(/\/careers\/list\/(\d+)/)?.[1];
  if (!id || !INDIA_RE.test(link.text)) return null;
  const title = link.title.trim();
  if (!title) return null;
  const lines = link.text.split("\n").map((line) => line.trim()).filter(Boolean);
  const locationIndex = lines.findIndex((line) => /^Location$/i.test(line));
  const location = locationIndex >= 0 ? (lines[locationIndex + 1] ?? "India") : "India";
  return {
    external_id: id,
    title,
    location_raw: location,
    description: "",
    apply_url: link.href,
    raw: { text: link.text },
  };
}

export const uberConfig: CompanyConfig = {
  slug: "uber",
  async crawl(ctx): Promise<RawJob[]> {
    const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137 Safari/537.36",
      });
      const page = await context.newPage();
      await page.goto(LIST_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await sleep(5000);

      const links = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a[href*="/careers/list/"]')).map((anchor) => {
          const title = ((anchor as HTMLElement).innerText ?? anchor.textContent ?? "").trim();
          let current: HTMLElement | null = anchor as HTMLElement;
          for (let depth = 0; depth < 5 && current?.parentElement; depth++) {
            current = current.parentElement;
            const text = (current.innerText ?? current.textContent ?? "").trim();
            if (text.includes(title) && /\bLocation\b/i.test(text)) {
              return { href: (anchor as HTMLAnchorElement).href, title, text };
            }
          }
          return {
            href: (anchor as HTMLAnchorElement).href,
            title,
            text: title,
          };
        }),
      ) as UberLink[];

      const seen = new Set<string>();
      const jobs = links
        .map(parseLink)
        .filter((job): job is RawJob => job !== null)
        .filter((job) => {
          if (seen.has(job.external_id)) return false;
          seen.add(job.external_id);
          return true;
        });

      await enrichDescriptions({ page, log: ctx.log }, jobs, () => {
        const selectors = ["main", "[data-baseweb]", "body"];
        for (const selector of selectors) {
          const text = (document.querySelector(selector)?.textContent ?? "").trim();
          if (text.length >= 200) return Promise.resolve(text);
        }
        return Promise.resolve("");
      }, { waitUntil: "domcontentloaded", extraWaitMs: 1500, timeoutMs: 22_000, concurrency: 3 });

      ctx.log(`Uber official careers India jobs: ${jobs.length}`);
      return jobs;
    } finally {
      await browser.close().catch(() => {});
    }
  },
};
