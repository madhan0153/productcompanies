// /companies/[slug]/llm.md — LLM-friendly Markdown variant.
//
// Same data the HTML company page renders, served as plain Markdown so AI
// agents can fetch a single URL and extract entities cleanly without
// running through the React HTML payload.
//
// Cached at the edge for 1 hour. Referenced from llms.txt as the canonical
// per-company source.

import { CRAWLER_META } from "@prodmatch/shared";
import {
  loadActiveJobs,
  loadCompanyHubBreakdown,
  loadCompanyTopSkills,
} from "@/lib/seo/data";
import { siteOrigin } from "@/lib/seo/site";

export const revalidate = 3600;
export const dynamic = "force-static";

export function generateStaticParams() {
  return CRAWLER_META.map((c) => ({ slug: c.slug }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) {
    return new Response("Not Found", { status: 404 });
  }

  const origin = siteOrigin();
  const [jobs, hubBreakdown, topSkills] = await Promise.all([
    loadActiveJobs({ companySlug: slug, limit: 60 }),
    loadCompanyHubBreakdown(slug),
    loadCompanyTopSkills(slug),
  ]);

  const hubsRanked = Object.entries(hubBreakdown).sort((a, b) => b[1] - a[1]);

  const lines: string[] = [];
  lines.push(`# ${company.name} careers in India`);
  lines.push(``);
  lines.push(`Source: ${origin}/companies/${slug}`);
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## TL;DR`);
  lines.push(``);
  if (jobs.length > 0) {
    lines.push(
      `${company.name} has ${jobs.length} open engineering roles in India ` +
      `right now, refreshed in the last 24 hours from the official career ` +
      `page. ${hubsRanked.length > 0 ? `Primary hubs: ${hubsRanked.slice(0, 4).map(([h, n]) => `${h} (${n})`).join(", ")}.` : ""} ` +
      `Apply directly through ${company.name}'s official career page; ` +
      `ProdMatch never hosts applications or charges any fees.`,
    );
  } else {
    lines.push(
      `${company.name} has no open engineering roles in the last 24-hour ` +
      `crawl of its official career page. ProdMatch refreshes daily.`,
    );
  }
  lines.push(``);

  lines.push(`## Open roles`);
  lines.push(``);
  if (jobs.length > 0) {
    for (const job of jobs.slice(0, 30)) {
      const comp = job.compLpaMin != null && job.compLpaMax != null
        ? ` · ${job.compLpaMin}–${job.compLpaMax} LPA`
        : "";
      const sen = job.seniority ? ` · ${job.seniority}` : "";
      const loc = job.location ? ` · ${job.location}` : "";
      lines.push(`- [${job.title}](${origin}/listings/${job.id})${loc}${sen}${comp}`);
    }
  } else {
    lines.push(`No active roles right now.`);
  }
  lines.push(``);

  if (hubsRanked.length > 0) {
    lines.push(`## Where ${company.name} is hiring (India hubs)`);
    lines.push(``);
    for (const [hub, count] of hubsRanked) {
      lines.push(`- ${hub}: ${count} open ${count === 1 ? "role" : "roles"}`);
    }
    lines.push(``);
  }

  if (topSkills.length > 0) {
    lines.push(`## Most-mentioned skills in active ${company.name} JDs`);
    lines.push(``);
    lines.push(topSkills.slice(0, 20).join(", "));
    lines.push(``);
  }

  lines.push(`## Canonical facts`);
  lines.push(``);
  lines.push(`- ${company.name} is one of the 51 product-based companies tracked by ProdMatch.ai.`);
  lines.push(`- Listings are sourced only from ${company.name}'s official career page — no aggregators.`);
  lines.push(`- ProdMatch updates this data every 24 hours.`);
  lines.push(`- Every Apply button links directly to ${company.name}'s own apply URL — ProdMatch does not host applications.`);
  lines.push(`- ProdMatch is free for candidates and DPDP Act 2023 compliant.`);
  lines.push(``);

  lines.push(`## Related pages`);
  lines.push(``);
  lines.push(`- [Compare ProdMatch vs Naukri](${origin}/compare/naukri)`);
  lines.push(`- [Compare ProdMatch vs LinkedIn](${origin}/compare/linkedin)`);
  lines.push(`- [All 51 product companies](${origin}/companies)`);
  lines.push(`- [How to get product-company jobs in India](${origin}/guides/how-to-get-product-company-jobs-india)`);
  lines.push(``);

  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
      "access-control-allow-origin": "*",
    },
  });
}
