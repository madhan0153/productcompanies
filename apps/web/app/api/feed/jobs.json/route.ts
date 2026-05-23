// /api/feed/jobs.json — public machine-readable feed of active jobs.
//
// Two audiences:
//   1. Aggregator-style AI tools (Perplexity, Bing Copilot, You.com,
//      Phind) that prefer structured JSON over HTML scraping.
//   2. Third-party developers building their own derivative tools on
//      top of ProdMatch's curated 51-company inventory.
//
// Shape is intentionally close to Schema.org JobPosting but flat, so it
// can be consumed without JSON-LD parsing.
//
// No auth required. Read-only. Cached at the edge for 30 min.

import { NextResponse } from "next/server";
import { loadActiveJobs } from "@/lib/seo/data";
import { siteOrigin, HUB_REGION } from "@/lib/seo/site";

export const revalidate = 1800;
export const dynamic = "force-static";

export async function GET() {
  const origin = siteOrigin();
  const jobs = await loadActiveJobs({ limit: 2000 });

  const items = jobs.map((j) => ({
    id: j.id,
    url: `${origin}/listings/${j.id}`,
    title: j.title,
    company: {
      slug: j.company.slug,
      name: j.company.name,
      logoUrl: j.company.logoUrl,
      page: `${origin}/companies/${j.company.slug}`,
    },
    location: j.location,
    region: j.hubs?.[0] ? HUB_REGION[j.hubs[0]] ?? null : null,
    hubs: j.hubs ?? [],
    seniority: j.seniority,
    employmentType: "FULL_TIME",
    techStack: j.techStack ?? [],
    roleFunction: j.roleFunctionJd,
    compensation:
      j.compLpaMin != null || j.compLpaMax != null
        ? {
            currency: "INR",
            unit: "LPA",
            min: j.compLpaMin,
            max: j.compLpaMax,
          }
        : null,
    description: j.jdSummary ?? null,
    applyUrl: j.applyUrl,
    postedAt: j.postedAt,
    lastSeenAt: j.lastSeenAt,
    isLikelyGhost: j.isLikelyGhost ?? false,
  }));

  return NextResponse.json(
    {
      version: "1.0",
      source: "ProdMatch.ai",
      sourceUrl: origin,
      license: "CC-BY-4.0 — attribution required",
      generatedAt: new Date().toISOString(),
      totalCompanies: 51,
      country: "IN",
      itemCount: items.length,
      items,
    },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=1800, s-maxage=1800",
        // Permissive CORS so third-party tools can fetch this from the browser.
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, OPTIONS",
      },
    },
  );
}
