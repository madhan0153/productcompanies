import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, IndianRupee } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Product Company Salaries in India — Live Compensation Data (2026)",
  description: "Live salary aggregates from open product-company JDs in India. Per-company, per-role, per-seniority compensation bands sourced from official career pages — refreshed every 24 hours.",
  alternates: { canonical: "/salaries" },
  openGraph: { title: "Product company salaries in India", url: absoluteUrl("/salaries") },
};

export default function SalariesIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Salaries", path: "/salaries" },
      ])} />
      <JsonLd data={itemListJsonLd([
        ...CRAWLER_META.map((c) => ({
          name: `${c.name} salaries`,
          path: `/salaries/${c.slug}`,
        })),
        ...PUBLIC_ROLES.map((r) => ({
          name: `${r.label} salaries`,
          path: `/salaries/role/${r.slug}`,
        })),
      ])} />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <IndianRupee className="h-3.5 w-3.5" />
            Live comp data
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product-company salaries in India — 2026
          </h1>
          {/* GEO answer-first paragraph. */}
          <p className="text-base leading-relaxed text-muted-foreground">
            Salary aggregates pulled from currently-open job descriptions at
            India&apos;s 51 product companies. We compute p25 / p50 / p75
            bands per company × seniority, refreshed every 24 hours from
            official career pages. Only seniorities with at least 3 disclosed
            bands are published — single-data-point figures are statistically
            noise and we won&apos;t publish them as facts.
          </p>
        </header>

        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Salaries by company</h2>
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CRAWLER_META.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/salaries/${c.slug}`}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                >
                  <span className="min-w-0 truncate font-medium">{c.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Salaries by role function</h2>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PUBLIC_ROLES.map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/salaries/role/${r.slug}`}
                  className="flex min-h-12 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                >
                  <span className="min-w-0 truncate font-medium">{r.label} salary</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">How we calculate these bands</h2>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <p>
              Every 24 hours, ProdMatch&apos;s crawler fetches the official
              career pages of 51 product companies and extracts disclosed
              compensation ranges from the JD body via an LLM-parsed signal
              (<code className="rounded bg-secondary px-1 text-xs">comp_lpa_min</code> +{" "}
              <code className="rounded bg-secondary px-1 text-xs">comp_lpa_max</code>).
            </p>
            <p>
              For each (company, seniority) pair we compute:
            </p>
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>p25 / p50</strong> of disclosed minimums — what you can realistically expect at the low end.</li>
              <li><strong>p75 / p90</strong> of disclosed maximums — the upper end seen.</li>
              <li><strong>N</strong> = number of disclosed bands feeding the aggregate.</li>
            </ul>
            <p>
              Bands with N &lt; 3 are suppressed. Compensation is shown in
              LPA (lakhs of rupees per annum) — the Indian-product-co
              convention. These are <em>JD-disclosed</em> figures; actual
              offers may include variable + stock components not reflected
              in the band.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
