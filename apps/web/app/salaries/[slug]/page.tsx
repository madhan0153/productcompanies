import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, IndianRupee } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { loadCompanySalaryReport } from "@/lib/seo/salary-data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return CRAWLER_META.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) return { title: "Salaries not found", robots: { index: false } };
  const title = `${company.name} Salaries in India 2026 — Live Compensation Bands`;
  const description = `${company.name} engineering salary bands in India by seniority (SDE-1, SDE-2, SDE-3, Staff, Principal). Pulled from disclosed compensation in active job descriptions, refreshed every 24 hours.`;
  return {
    title,
    description,
    alternates: { canonical: `/salaries/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/salaries/${slug}`) },
  };
}

export default async function CompanySalaryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) notFound();

  const report = await loadCompanySalaryReport(slug);
  if (!report) notFound();

  const lastSeen = report.lastSeenAt
    ? new Date(report.lastSeenAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const faq = [
    {
      question: `What is the salary at ${company.name} in India?`,
      answer: report.rows.length > 0
        ? `${company.name} engineering salary in India spans roughly ${report.rows[0]!.band.p25Min}–${report.rows[report.rows.length - 1]!.band.p90Max} LPA across seniorities, based on ${report.totalDisclosedBands} disclosed bands in the last 24-hour crawl of ${company.name}'s official career page. Per-seniority percentiles are in the table on this page.`
        : `${company.name} hasn't disclosed enough compensation bands in their last 24-hour crawl (need at least 3 per seniority) for ProdMatch to publish a verified figure. Check ${company.name}'s official career page or revisit tomorrow.`,
    },
    {
      question: `Are these ${company.name} salary numbers official?`,
      answer: `Yes — they are sourced directly from disclosed compensation ranges in active ${company.name} job descriptions on their official career page. ProdMatch does not estimate, project, or scrape secondary sources. Only bands ProdMatch can verify from official JDs are published.`,
    },
    {
      question: `Does ${company.name} disclose stock / RSUs / bonuses?`,
      answer: `Public JDs rarely disclose stock or variable comp. The bands here reflect base + fixed components only. ${company.name}'s full TC may be 20-50% higher at senior levels once RSUs + sign-on are included.`,
    },
    {
      question: `How often are these numbers updated?`,
      answer: `Every 24 hours, when ProdMatch's crawler refreshes ${company.name}'s official career page. The last refresh ${lastSeen ? `was ${lastSeen}.` : "has not yet completed for this deployment."}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Salaries", path: "/salaries" },
        { name: company.name, path: `/salaries/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href="/salaries" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← All company salaries
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <IndianRupee className="h-3.5 w-3.5" />
            {company.name} · India
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {company.name} salaries in India — 2026
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            {report.rows.length > 0 ? (
              <>
                Salary bands at {company.name} computed from{" "}
                <strong>{report.totalDisclosedBands} disclosed compensation ranges</strong>{" "}
                across their currently-open engineering roles. Refreshed within the last 24 hours from{" "}
                {company.name}&apos;s official career page.
              </>
            ) : (
              <>
                {company.name} hasn&apos;t disclosed enough compensation bands
                (≥ 3 per seniority) in the latest crawl for ProdMatch to publish a
                verified figure. Check {company.name}&apos;s official career
                page directly, or revisit after the next 24-hour refresh.
              </>
            )}
          </p>
          {lastSeen && (
            <p className="text-[11px] text-muted-foreground">
              Last refreshed: {lastSeen}.
            </p>
          )}
        </header>

        {report.rows.length > 0 ? (
          <section className="mt-8">
            <h2 className="text-lg font-semibold sm:text-xl">{company.name} salary by seniority</h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Figures in LPA (lakhs / annum). N = disclosed JDs at this seniority.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Seniority</th>
                    <th className="px-3 py-2 text-right">p25 (low)</th>
                    <th className="px-3 py-2 text-right">p50 (median)</th>
                    <th className="px-3 py-2 text-right">p75 (high)</th>
                    <th className="px-3 py-2 text-right">p90 (top)</th>
                    <th className="px-3 py-2 text-right">N</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.seniority} className="border-t border-border">
                      <td className="px-3 py-3 font-medium">{row.seniority}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{row.band.p25Min}L</td>
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
              Not enough disclosed bands to publish per-seniority figures
              right now. ProdMatch only publishes when N ≥ 3 per seniority —
              a single data point is statistically meaningless and we won&apos;t
              put it in front of you as a fact.
            </p>
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/companies/${slug}`}
            className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
          >
            <span className="min-w-0 truncate font-medium">{company.name} open roles</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
          <Link
            href={`/companies/${slug}/interview-process`}
            className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
          >
            <span className="min-w-0 truncate font-medium">{company.name} interview process</span>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
          </Link>
        </section>

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
      </main>

      <PublicFooter />
    </div>
  );
}
