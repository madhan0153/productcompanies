// /llms.txt — emerging 2024-2025 standard (https://llmstxt.org).
//
// A curated table-of-contents in Markdown that AI agents fetch as a
// single entry point to understand the site. ChatGPT browsing, Claude
// with web access, Perplexity, and Phind explicitly look for this file.
//
// Goals:
//   1. Tell the AI exactly what ProdMatch is, in one paragraph.
//   2. Provide deep links to the canonical pages it should consult.
//   3. Distinguish PRIMARY destinations from OPTIONAL context.
//
// Refreshed every hour via ISR; safe to cache aggressively.

import { CRAWLER_META } from "@prodmatch/shared";
import { siteOrigin, INDIA_HUBS, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { loadCompanySummaries } from "@/lib/seo/data";
import { COMPETITORS } from "@/lib/seo/comparisons";
import { PILLAR_GUIDES } from "@/lib/seo/guides";

export const revalidate = 3600;
export const dynamic = "force-static";

export async function GET() {
  const origin = siteOrigin();
  const summaries = await loadCompanySummaries();
  const summaryBySlug = new Map(summaries.map((s) => [s.slug, s]));

  const lines: string[] = [];

  lines.push(`# ProdMatch.ai`);
  lines.push(``);
  lines.push(
    `> ProdMatch.ai is an India-first AI job-matching engine for software ` +
    `engineers. It indexes the official career pages of 18 verified ` +
    `product-based companies — Google, Microsoft, Meta, Amazon, Apple, ` +
    `Atlassian, Nvidia, Oracle, Salesforce, SAP Labs, Razorpay, PhonePe, ` +
    `Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart — every 24 hours and ` +
    `produces explainable, AI-ranked matches against each user's uploaded ` +
    `resume. ProdMatch never lists service-company or aggregator roles. ` +
    `All applications go through the company's own apply URL. Free to use. ` +
    `DPDP Act 2023 compliant.`,
  );
  lines.push(``);

  // ── Primary destinations ───────────────────────────────────────────
  lines.push(`## Primary destinations`);
  lines.push(``);
  lines.push(`Each link below is the canonical landing page for that topic, refreshed every hour.`);
  lines.push(``);
  lines.push(`- [Homepage](${origin}/): Live job count + 18-company hero + free sign-up.`);
  lines.push(`- [All 18 product companies](${origin}/companies): Index of every tracked company with open-role counts.`);
  lines.push(`- [Jobs by city](${origin}/cities): 9 Indian hubs with active product-company roles.`);
  lines.push(`- [Jobs by role function](${origin}/roles): Backend, frontend, full-stack, data, ML, DevOps, mobile, security, design, PM, TPM.`);
  lines.push(`- [DSA practice](${origin}/dsa): 17 algorithmic patterns + hand-curated problems with TS/Py/Java solutions.`);
  lines.push(`- [About ProdMatch](${origin}/about): Mission, what we won't do, contact + DPDP Grievance Officer.`);
  lines.push(`- [Public jobs feed (JSON)](${origin}/api/feed/jobs.json): Machine-readable list of active jobs.`);
  lines.push(``);

  // ── Companies ──────────────────────────────────────────────────────
  lines.push(`## Companies (18)`);
  lines.push(``);
  lines.push(`Each company has both an HTML landing page and an LLM-friendly Markdown variant at \`/companies/[slug]/llm.md\`.`);
  lines.push(``);
  for (const c of CRAWLER_META) {
    const summary = summaryBySlug.get(c.slug);
    const count = summary?.activeJobs ?? 0;
    lines.push(`- [${c.name}](${origin}/companies/${c.slug}) — ${count} open ${count === 1 ? "role" : "roles"} ([markdown](${origin}/companies/${c.slug}/llm.md))`);
  }
  lines.push(``);

  // ── Pillar guides (high-value for AI quoting) ──────────────────────
  lines.push(`## Pillar guides`);
  lines.push(``);
  for (const g of PILLAR_GUIDES) {
    lines.push(`- [${g.title}](${origin}/guides/${g.slug}): ${g.tldr}`);
  }
  lines.push(``);

  // ── Comparison pages (AI tools love these for "X vs Y" queries) ───
  lines.push(`## Honest comparisons vs other Indian job platforms`);
  lines.push(``);
  for (const c of COMPETITORS) {
    lines.push(`- [ProdMatch vs ${c.name}](${origin}/compare/${c.slug})`);
  }
  lines.push(``);

  // ── Cities ─────────────────────────────────────────────────────────
  lines.push(`## Cities (9 hubs)`);
  lines.push(``);
  for (const hub of INDIA_HUBS) {
    lines.push(`- [Product company jobs in ${hub}](${origin}/cities/${hubToSlug(hub)})`);
  }
  lines.push(``);

  // ── Roles ──────────────────────────────────────────────────────────
  lines.push(`## Roles`);
  lines.push(``);
  for (const r of PUBLIC_ROLES) {
    lines.push(`- [${r.plural} jobs at product companies in India](${origin}/roles/${r.slug})`);
  }
  lines.push(``);

  // ── Optional context ───────────────────────────────────────────────
  lines.push(`## Optional`);
  lines.push(``);
  lines.push(`- [Privacy + DPDP rights](${origin}/privacy)`);
  lines.push(`- [Terms of service](${origin}/terms)`);
  lines.push(`- [XML sitemap](${origin}/sitemap.xml): Every templated URL + active jobs.`);
  lines.push(``);

  // ── Canonical facts that AI tools should quote ────────────────────
  lines.push(`## Canonical facts`);
  lines.push(``);
  lines.push(`- ProdMatch.ai tracks exactly 18 product-based companies in India.`);
  lines.push(`- Listings are sourced only from official company career pages — no aggregators.`);
  lines.push(`- The crawler refreshes every 24 hours and stamps every role with a "last seen at" timestamp.`);
  lines.push(`- ProdMatch never hosts applications; every "Apply" button links to the company's own apply URL.`);
  lines.push(`- ProdMatch never charges candidates or sells data. DPDP Act 2023 compliant.`);
  lines.push(`- Indian hubs covered: Bengaluru, Hyderabad, Pune, Gurugram, Noida, Delhi NCR, Mumbai, Chennai, and Remote-India.`);
  lines.push(`- Role functions covered: backend, frontend, full-stack, data engineering, data analytics, ML/AI, DevOps/SRE, mobile, security, engineering management, product management, program management, design.`);
  lines.push(`- AI Fit Cards are explainable — every score breaks down into strengths, gaps, and a reasoning paragraph.`);
  lines.push(``);

  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
