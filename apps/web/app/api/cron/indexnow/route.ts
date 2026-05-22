// /api/cron/indexnow — IndexNow ping.
//
// IndexNow (indexnow.org) is a free protocol jointly endorsed by Microsoft
// Bing, Yandex, Naver, and Seznam. Pinging it after a crawl run tells Bing
// (which powers ChatGPT browsing) within seconds that new URLs are
// available. Without this, Bing might take 1-7 days to re-index changes.
//
// Auth: Bearer $CRON_SECRET. Invoked by the daily crawler workflow after
// recompute_matches finishes.
//
// Setup:
//   1. Generate a 32-char API key (env var INDEXNOW_KEY).
//   2. Host the key file at /{INDEXNOW_KEY}.txt (Next.js dynamic route below).
//   3. Operators need to add INDEXNOW_KEY in Vercel env vars.

import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/security/cron";
import { CRAWLER_META, DSA_CATALOG } from "@prodmatch/shared";
import { absoluteUrl, INDIA_HUBS, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { PUBLIC_SKILLS } from "@/lib/seo/skills";
import { loadActiveJobs } from "@/lib/seo/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const authFailure = requireCronAuth(req);
  if (authFailure) return authFailure;

  const key = process.env.INDEXNOW_KEY;
  if (!key) {
    return NextResponse.json(
      { ok: false, error: "INDEXNOW_KEY is not configured" },
      { status: 503 },
    );
  }

  const host = absoluteUrl("/").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const keyLocation = absoluteUrl(`/${key}.txt`);

  // Build the URL list. IndexNow accepts up to 10,000 URLs per ping; we
  // batch into 5,000-URL chunks for safety.
  const urlList: string[] = [
    absoluteUrl("/"),
    absoluteUrl("/companies"),
    absoluteUrl("/cities"),
    absoluteUrl("/roles"),
    absoluteUrl("/dsa"),
    absoluteUrl("/dsa/patterns"),
    absoluteUrl("/guides"),
    absoluteUrl("/compare"),
    absoluteUrl("/salaries"),
    absoluteUrl("/skills"),
    absoluteUrl("/about"),
  ];

  for (const c of CRAWLER_META) {
    urlList.push(absoluteUrl(`/companies/${c.slug}`));
    urlList.push(absoluteUrl(`/companies/${c.slug}/interview-process`));
    urlList.push(absoluteUrl(`/salaries/${c.slug}`));
    for (const r of PUBLIC_ROLES) {
      urlList.push(absoluteUrl(`/companies/${c.slug}/${r.slug}`));
    }
  }
  for (const r of PUBLIC_ROLES) {
    urlList.push(absoluteUrl(`/salaries/role/${r.slug}`));
  }
  for (const s of PUBLIC_SKILLS) {
    urlList.push(absoluteUrl(`/skills/${s.slug}`));
  }
  for (const hub of INDIA_HUBS) {
    urlList.push(absoluteUrl(`/cities/${hubToSlug(hub)}`));
    for (const r of PUBLIC_ROLES) {
      urlList.push(absoluteUrl(`/cities/${hubToSlug(hub)}/${r.slug}`));
    }
  }
  for (const r of PUBLIC_ROLES) {
    urlList.push(absoluteUrl(`/roles/${r.slug}`));
  }
  for (const p of DSA_CATALOG) {
    urlList.push(absoluteUrl(`/dsa/${p.slug}`));
  }
  // Include recent active jobs (capped at 1000 to stay under IndexNow's
  // per-ping limit comfortably).
  try {
    const jobs = await loadActiveJobs({ limit: 1000 });
    for (const job of jobs) urlList.push(absoluteUrl(`/listings/${job.id}`));
  } catch {
    /* best-effort */
  }

  // De-dupe.
  const urls = [...new Set(urlList)];

  // Chunk into 5K batches.
  const chunkSize = 5000;
  const chunks: string[][] = [];
  for (let i = 0; i < urls.length; i += chunkSize) {
    chunks.push(urls.slice(i, i + chunkSize));
  }

  const results: Array<{ chunk: number; status: number; ok: boolean }> = [];
  for (const [i, chunk] of chunks.entries()) {
    try {
      const res = await fetch("https://api.indexnow.org/IndexNow", {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key,
          keyLocation,
          urlList: chunk,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      results.push({ chunk: i, status: res.status, ok: res.ok });
    } catch (err) {
      results.push({
        chunk: i,
        status: 0,
        ok: false,
        ...({ error: err instanceof Error ? err.message : "fetch_failed" }),
      } as { chunk: number; status: number; ok: boolean; error?: string });
    }
  }

  return NextResponse.json({
    ok: true,
    submitted: urls.length,
    batches: chunks.length,
    results,
  });
}
