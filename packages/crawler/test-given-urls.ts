/**
 * Test the 5 verified career page URLs provided by the user.
 * Run: tsx test-given-urls.ts
 */
import { chromium } from "playwright";

const CASES = [
  {
    slug: "amazon",
    url: "https://www.amazon.jobs/en/search?base_query=&loc_query=India&country=IND",
  },
  {
    slug: "salesforce",
    url: "https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site?CF_-_REC_-_LRV_-_Job_Posting_Anchor_-_Country_from_Job_Posting_Location_Extended=c4f78be1a8f14da0ab49ce1162348a5e",
  },
  {
    slug: "nvidia",
    url: "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite?locationHierarchy1=2fcb99c455831013ea52b82135ba3266",
  },
  {
    slug: "google",
    url: "https://www.google.com/about/careers/applications/jobs/results?location=India",
  },
  {
    slug: "microsoft",
    url: "https://apply.careers.microsoft.com/careers?hl=en&start=0&location=India&pid=1970393556753740&sort_by=distance&filter_include_remote=0",
  },
];

async function inspect(slug: string, pageUrl: string) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`${slug.toUpperCase()} — ${pageUrl.slice(0, 80)}`);

  const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await ctx.newPage();

  const apiCalls: Array<{ url: string; status: number; ct: string }> = [];
  const apiResponses: Array<{ url: string; snippet: string }> = [];

  page.on("response", async (resp) => {
    const url = resp.url();
    const ct = resp.headers()["content-type"] ?? "";
    if (ct.includes("json") && !url.includes("analytics") && !url.includes("gtag")) {
      apiCalls.push({ url: url.slice(0, 140), status: resp.status(), ct: ct.slice(0, 40) });
      try {
        const text = await resp.text();
        // Only keep if it looks like jobs data
        if (/job|position|opening|posting|career/i.test(text) && text.length > 100) {
          apiResponses.push({ url: url.slice(0, 80), snippet: text.slice(0, 300) });
        }
      } catch { /* ignore */ }
    }
  });

  try {
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 45_000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Count job-like elements
    const bodyText = await page.evaluate(() => document.body.innerText?.slice(0, 1000) ?? "");

    console.log("\n📡 JSON API calls:", apiCalls.length);
    for (const c of apiCalls.slice(0, 5)) {
      console.log(`  ${c.status} ${c.url}`);
    }

    if (apiResponses.length > 0) {
      console.log("\n📦 Job-like API response:");
      console.log("  URL:", apiResponses[0].url);
      console.log("  Snippet:", apiResponses[0].snippet.replace(/\n/g, " ").slice(0, 250));
    }

    // Look for job counts in body
    const jobCount = bodyText.match(/(\d+)\s+(?:jobs?|results?|positions?|openings?)/i)?.[0];
    console.log("\n📄 Page preview (job count hint):", jobCount ?? "no count found");
    console.log("   Body preview:", bodyText.replace(/\n+/g, " ").slice(0, 400));
  } catch (err) {
    console.log("ERROR:", err instanceof Error ? err.message : String(err));
  }

  await browser.close();
}

async function main() {
  const args = process.argv.slice(2);
  const slugFilter = args.find((a) => a.startsWith("--slug="))?.replace("--slug=", "");
  const cases = slugFilter ? CASES.filter((c) => c.slug === slugFilter) : CASES;

  for (const c of cases) {
    await inspect(c.slug, c.url);
  }
}

main().catch(console.error);
