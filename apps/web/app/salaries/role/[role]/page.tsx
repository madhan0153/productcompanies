import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IndianRupee } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES, publicRoleBySlug } from "@/lib/seo/roles";
import { loadRoleSalaryReport } from "@/lib/seo/salary-data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return PUBLIC_ROLES.map((r) => ({ role: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  const r = publicRoleBySlug(role);
  if (!r) return { title: "Salary not found", robots: { index: false } };
  const title = `${r.label} Salary at Product Companies in India 2026`;
  const description = `Live ${r.label} salary aggregates across 18 product companies in India — Google, Razorpay, Swiggy, PhonePe and more. p25 / p50 / p75 bands from disclosed JDs, refreshed every 24 hours.`;
  return {
    title,
    description,
    alternates: { canonical: `/salaries/role/${role}` },
    openGraph: { title, description, url: absoluteUrl(`/salaries/role/${role}`) },
  };
}

export default async function RoleSalaryPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const r = publicRoleBySlug(role);
  if (!r) notFound();

  const report = await loadRoleSalaryReport(r.canonical);

  const faq = [
    {
      question: `What is the average ${r.label} salary at product companies in India in 2026?`,
      answer: report.rows.length > 0
        ? `${r.label} salary at India's product companies spans roughly ${Math.min(...report.rows.map((x) => x.band.p25Min))}–${Math.max(...report.rows.map((x) => x.band.p90Max))} LPA depending on company and seniority. Median p50 across ${report.rows.length} disclosed product cos: ${(Math.round(report.rows.reduce((s, x) => s + x.band.p50Min, 0) / report.rows.length * 10) / 10)} LPA at the low end of the band.`
        : `Not enough ${r.label} bands have been disclosed in active JDs (≥3 per company) for ProdMatch to publish a verified figure right now. Check back after the next 24-hour crawl.`,
    },
    {
      question: `Which Indian product company pays ${r.plural.toLowerCase()} the most?`,
      answer: report.rows.length > 0
        ? `Among the disclosed bands, ${report.rows[0]!.companyName} sits at the top of the published ${r.label} bands (p90 of ${report.rows[0]!.band.p90Max} LPA). Note: ProdMatch only reports JD-disclosed compensation — stock + variable can add 20-50% TC at senior levels.`
        : `No bands published yet. Compare directly on the per-company salary pages.`,
    },
    {
      question: `How does ProdMatch compute these ${r.label} salary aggregates?`,
      answer: `For every active ${r.label} JD ProdMatch crawls from the 18 product companies, we extract the disclosed compensation range and compute p25 / p50 / p75 / p90 per company. Bands with N < 3 are suppressed. Refreshes every 24 hours.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Salaries", path: "/salaries" },
        { name: r.plural, path: `/salaries/role/${role}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href="/salaries" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← All salaries
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <IndianRupee className="h-3.5 w-3.5" />
            {r.label} · India
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {r.label} salary at India&apos;s product companies — 2026
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Live {r.label} compensation bands across {report.rows.length} of
            India&apos;s 18 product companies that have disclosed enough JD
            bands (N ≥ 3) for ProdMatch to publish a verified figure.
          </p>
        </header>

        {report.rows.length > 0 ? (
          <section className="mt-8">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Company</th>
                    <th className="px-3 py-2 text-right">p50 (median)</th>
                    <th className="px-3 py-2 text-right">p75</th>
                    <th className="px-3 py-2 text-right">p90 (top)</th>
                    <th className="px-3 py-2 text-right">N</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.companySlug} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">
                        <Link href={`/salaries/${row.companySlug}`} className="hover:underline">
                          {row.companyName}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums font-semibold">{row.band.p50Min}L</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.band.p75Max}L</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.band.p90Max}L</td>
                      <td className="px-3 py-3 text-right text-xs text-muted-foreground">{row.band.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-xl border border-dashed border-border bg-secondary/30 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              Not enough disclosed {r.label} bands across companies right
              now. ProdMatch publishes only when N ≥ 3 per company so the
              numbers carry weight. Check back after the next 24-hour crawl.
            </p>
          </section>
        )}

        <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold">Frequently asked</h2>
          <dl className="mt-4 space-y-4">
            {faq.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-semibold">{item.question}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other role salaries</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PUBLIC_ROLES.filter((x) => x.slug !== role).map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/salaries/role/${x.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {x.label} salary
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
