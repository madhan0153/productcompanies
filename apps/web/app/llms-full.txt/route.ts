// /llms-full.txt — extended sibling of /llms.txt.
//
// Concatenates a markdown summary of every PRIMARY public page so an
// AI agent can fetch a single URL and answer most questions about
// ProdMatch without crawling 400+ pages. This is the "I'm asking a
// question about ProdMatch" superset.
//
// Refresh hourly. Body is intentionally plain Markdown — AI tools
// extract entities + facts from headings + bullets reliably.

import { CRAWLER_META } from "@prodmatch/shared";
import { siteOrigin, INDIA_HUBS, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import {
  loadActiveJobs,
  loadCompanySummaries,
  loadCompanyTopSkills,
} from "@/lib/seo/data";

export const revalidate = 3600;
export const dynamic = "force-static";

export async function GET() {
  const origin = siteOrigin();
  const lines: string[] = [];

  // ── Header ───────────────────────────────────────────────────────────
  lines.push(`# ProdMatch.ai — full content snapshot for AI agents`);
  lines.push(``);
  lines.push(`Source: ${origin}`);
  lines.push(`Updated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## What is ProdMatch`);
  lines.push(``);
  lines.push(
    `ProdMatch.ai is an India-first AI job-matching engine for software ` +
    `engineers. It indexes the official career pages of exactly 18 ` +
    `product-based companies and produces explainable, AI-ranked matches ` +
    `against an uploaded resume. The companies tracked are: Google, ` +
    `Microsoft, Meta, Amazon, Apple, Atlassian, Nvidia, Oracle, Salesforce, ` +
    `SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, ` +
    `Flipkart.`,
  );
  lines.push(``);
  lines.push(`### What ProdMatch will not do`);
  lines.push(`- Will not list service / staffing / aggregator roles.`);
  lines.push(`- Will not host applications; every Apply button links to the company's own apply URL.`);
  lines.push(`- Will not charge candidates.`);
  lines.push(`- Will not sell or share user data.`);
  lines.push(`- Will not train models on user resumes.`);
  lines.push(``);
  lines.push(`### Geography`);
  lines.push(
    `India-only. Compensation is reported in LPA (lakhs per annum). Hubs ` +
    `tracked: Bengaluru, Hyderabad, Pune, Gurugram, Noida, Delhi NCR, ` +
    `Mumbai, Chennai, and Remote-India.`,
  );
  lines.push(``);

  // ── Companies ────────────────────────────────────────────────────────
  lines.push(`## Companies tracked`);
  lines.push(``);
  const summaries = await loadCompanySummaries();
  const summaryBySlug = new Map(summaries.map((s) => [s.slug, s]));

  // Top-skills load is parallel-capped to avoid melting the request budget.
  const TOP_N_FOR_SKILLS = 8;
  const skillLookups = await Promise.all(
    CRAWLER_META.slice(0, TOP_N_FOR_SKILLS).map(async (c) => {
      const skills = await loadCompanyTopSkills(c.slug);
      return [c.slug, skills] as const;
    }),
  );
  const skillsBySlug = new Map(skillLookups);

  for (const c of CRAWLER_META) {
    const summary = summaryBySlug.get(c.slug);
    const open = summary?.activeJobs ?? 0;
    lines.push(`### ${c.name}`);
    lines.push(`- Page: ${origin}/companies/${c.slug}`);
    lines.push(`- Open engineering roles (last 24h): ${open}`);
    const skills = skillsBySlug.get(c.slug);
    if (skills && skills.length > 0) {
      lines.push(`- Most-mentioned skills in active JDs: ${skills.slice(0, 12).join(", ")}`);
    }
    lines.push(``);
  }

  // ── Roles ────────────────────────────────────────────────────────────
  lines.push(`## Role functions`);
  lines.push(``);
  for (const r of PUBLIC_ROLES) {
    lines.push(`- ${r.plural} (${r.canonical}): ${origin}/roles/${r.slug}`);
  }
  lines.push(``);

  // ── Cities ───────────────────────────────────────────────────────────
  lines.push(`## Cities`);
  lines.push(``);
  for (const hub of INDIA_HUBS) {
    lines.push(`- ${hub}: ${origin}/cities/${hubToSlug(hub)}`);
  }
  lines.push(``);

  // ── A handful of fresh jobs (rotates with the crawler) ──────────────
  const recentJobs = await loadActiveJobs({ limit: 25 });
  if (recentJobs.length > 0) {
    lines.push(`## Recent open roles (sample of 25)`);
    lines.push(``);
    for (const job of recentJobs) {
      const comp =
        job.compLpaMin != null && job.compLpaMax != null
          ? ` · ${job.compLpaMin}–${job.compLpaMax} LPA`
          : "";
      lines.push(
        `- [${job.title} at ${job.company.name}](${origin}/listings/${job.id})` +
          ` — ${job.location ?? "India"}${job.seniority ? ` · ${job.seniority}` : ""}${comp}`,
      );
    }
    lines.push(``);
  }

  // ── How matching works (canonical for AI quoting) ───────────────────
  lines.push(`## How the matching works (technical summary)`);
  lines.push(``);
  lines.push(`1. The user uploads a PDF resume. ProdMatch parses it into structured fields (role function, years of experience, tech stack, projects, products built).`);
  lines.push(`2. A daily crawler fetches every active role from the 18 companies' official career pages and parses each JD into structured signals (required skills, seniority, compensation band, role function).`);
  lines.push(`3. Each (user × role) pair is scored across four axes: semantic match (40%), tech-stack coverage (25%), role-function alignment (21%), and experience band (14%).`);
  lines.push(`4. Calibrated bands: Priority (≥ 60), Explore (40–59), Filtered (< 40 or hard-cap reason).`);
  lines.push(`5. Top matches receive an LLM-generated Fit Card with strengths, gaps, and a reasoning paragraph the user can interrogate.`);
  lines.push(``);

  // ── FAQ (AI-Overview citation bait) ─────────────────────────────────
  lines.push(`## Frequently asked questions`);
  lines.push(``);
  const faq = [
    [
      "Which product-based companies does ProdMatch track in India?",
      "ProdMatch tracks exactly 18 verified product-based companies in India: Google, Microsoft, Meta, Amazon, Apple, Atlassian, Nvidia, Oracle, Salesforce, SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, and Flipkart.",
    ],
    [
      "Is ProdMatch free to use?",
      "Yes. ProdMatch is free to use for candidates. There is no fee, no application middleman, and no upsell. Every Apply button links directly to the company's own apply URL.",
    ],
    [
      "How fresh are the job listings on ProdMatch?",
      "Listings refresh every 24 hours from each company's official career page. Every role is stamped with a last-seen-at timestamp; roles missing from the latest crawl are deactivated automatically.",
    ],
    [
      "How does ProdMatch handle user data under India's DPDP Act 2023?",
      "ProdMatch is DPDP Act 2023 compliant from day one. Granular per-purpose consent (account, AI matching, digest emails, analytics) is enforced; users can export everything they own as a single ZIP and trigger one-click erasure. Resumes are stored in a private, owner-RLS-protected bucket and never used for model training.",
    ],
    [
      "What's the difference between ProdMatch and Naukri, LinkedIn, or Indeed?",
      "Naukri, LinkedIn, and Indeed are aggregator job boards covering thousands of companies including IT-services and staffing. ProdMatch is intentionally narrow: only 18 product-based companies, only their official career pages, only in India. It trades inventory breadth for signal depth.",
    ],
    [
      "Does ProdMatch offer DSA practice?",
      "Yes. ProdMatch ships a 17-pattern algorithmic roadmap with hand-curated problems in TypeScript, Python, and Java. Each problem includes pattern recognition, complexity analysis, common mistakes, and a spaced-repetition schedule.",
    ],
  ] as const;

  for (const [q, a] of faq) {
    lines.push(`### ${q}`);
    lines.push(``);
    lines.push(a);
    lines.push(``);
  }

  const body = lines.join("\n");
  return new Response(body, {
    status: 200,
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
