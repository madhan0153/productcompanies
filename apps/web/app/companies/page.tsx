// /companies — index of every approved product company.
//
// SEO: 51 in-house brand-name companies, internal-link hub for company
// landing pages, JSON-LD ItemList for richer SERP rendering.
//
// Server component, ISR (revalidate hourly) — the company list is static
// but the per-company job counts come from Supabase and are refreshed
// every hour. No personalised data; safe to cache aggressively.

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { loadCompanySummaries } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600; // 1 hour ISR

export const metadata: Metadata = {
  title: "All 51 Product Companies Hiring Engineers in India",
  description:
    "Browse 51 verified Indian product-based companies hiring software engineers right now — Google, Microsoft, Razorpay, PhonePe, Swiggy, Zerodha and more. Daily-updated from official career pages.",
  alternates: { canonical: "/companies" },
  openGraph: {
    title: "All 51 Product Companies Hiring Engineers in India",
    description:
      "Verified Indian product-company career pages, indexed daily by ProdMatch.ai.",
    url: absoluteUrl("/companies"),
  },
};

export default async function CompaniesIndexPage() {
  const summaries = await loadCompanySummaries();
  const summaryBySlug = new Map(summaries.map((s) => [s.slug, s]));

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Companies", path: "/companies" },
      ])} />
      <JsonLd data={itemListJsonLd(CRAWLER_META.map((c) => ({
        name: c.name,
        path: `/companies/${c.slug}`,
        description: `${c.name} engineering roles in India`,
      })))} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Building2 className="h-3.5 w-3.5" />
            51 verified product companies
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product-based companies hiring in India
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Engineering roles at India&apos;s top product companies, sourced
            directly from official career pages and refreshed daily. Filter
            by company, role, or city — no service-company noise.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CRAWLER_META.map((company) => {
            const summary = summaryBySlug.get(company.slug);
            const hasJobs = (summary?.activeJobs ?? 0) > 0;
            return (
              <li key={company.slug}>
                <Link
                  href={`/companies/${company.slug}`}
                  className="group flex min-h-28 flex-col gap-2 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/30 hover:shadow-elev2 motion-reduce:hover:translate-y-0"
                  aria-label={`${company.name} careers in India`}
                >
                  <div className="flex items-start gap-3">
                    <CompanyLogo name={company.name} logoUrl={summary?.logoUrl ?? null} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{company.name}</p>
                      <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        {summary?.kind ?? "Product company"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {summary?.oneLiner ?? "Product company in India."}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    {(summary?.hubs ?? []).slice(0, 3).map((hub) => (
                      <span key={hub} className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                        {hub}
                      </span>
                    ))}
                    {hasJobs ? (
                      <span className="ml-auto rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                        {summary!.activeJobs} open
                      </span>
                    ) : (
                      <span className="ml-auto text-[10px] text-muted-foreground">view details →</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <section className="mt-12 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">How ProdMatch tracks these companies</h2>
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              ProdMatch&apos;s adaptive crawler visits each of the 51 companies&apos;
              official career pages every 24 hours. We never use job-board
              aggregators — every listing links directly to the company&apos;s own
              application URL. When a company changes their career-site DOM, our
              fingerprint-based recovery layer keeps the listings flowing without
              manual intervention.
            </p>
            <p>
              Each role is parsed by AI into structured signals (tech stack,
              seniority, compensation band, role function) and matched against
              your resume on demand. Sign in for explainable AI Fit Cards on
              every role.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
