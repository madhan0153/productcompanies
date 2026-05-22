import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { INDIA_HUBS, hubToSlug, slugToHub, absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { loadActiveJobs } from "@/lib/seo/data";
import { companiesInHub } from "@/lib/seo/company-metadata";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return INDIA_HUBS.map((hub) => ({ hub: hubToSlug(hub) }));
}

export async function generateMetadata({ params }: { params: Promise<{ hub: string }> }): Promise<Metadata> {
  const { hub: hubSlug } = await params;
  const hub = slugToHub(hubSlug);
  if (!hub) return { title: "City not found" };
  const title = `Product Company Jobs in ${hub} — Open Engineering Roles`;
  const description = `Open engineering roles at 18 product companies in ${hub}, India. Daily-refreshed from official career pages. AI-ranked matches available after free sign-up.`;
  return {
    title,
    description,
    alternates: { canonical: `/cities/${hubSlug}` },
    openGraph: { title, description, url: absoluteUrl(`/cities/${hubSlug}`) },
  };
}

export default async function CityPage({ params }: { params: Promise<{ hub: string }> }) {
  const { hub: hubSlug } = await params;
  const hub = slugToHub(hubSlug);
  if (!hub) notFound();

  const jobs = await loadActiveJobs({ hub, limit: 60 });

  // Per-company breakdown so we can render company × city sub-links.
  const byCompany = new Map<string, { name: string; logoUrl: string | null; count: number }>();
  for (const job of jobs) {
    const cur = byCompany.get(job.company.slug);
    byCompany.set(job.company.slug, {
      name: job.company.name,
      logoUrl: job.company.logoUrl,
      count: (cur?.count ?? 0) + 1,
    });
  }

  // Role-function counts so we know which city × role pages have content.
  const roleCounts = new Map<string, number>();
  for (const job of jobs) {
    if (job.roleFunctionJd) {
      roleCounts.set(job.roleFunctionJd, (roleCounts.get(job.roleFunctionJd) ?? 0) + 1);
    }
  }

  const faq = [
    {
      question: `Which product companies are hiring in ${hub}?`,
      answer: byCompany.size > 0
        ? `${[...byCompany.values()].map((c) => c.name).slice(0, 8).join(", ")}${byCompany.size > 8 ? " and others" : ""}.`
        : `No product companies were actively hiring in ${hub} in the last 24 hours. We refresh daily.`,
    },
    {
      question: `How fresh are these ${hub} listings?`,
      answer: `Each ${hub} role on this page was confirmed available within the last 24 hours via the company's official career page.`,
    },
    {
      question: `How do I see my fit score for ${hub} roles?`,
      answer: `Create a free ProdMatch account, upload your resume (PDF, ≤5 MB), and we'll rank every ${hub} role by your specific fit and explain the score.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Cities", path: "/cities" },
        { name: hub, path: `/cities/${hubSlug}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="h-3.5 w-3.5" />
            {hub} · India
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product company jobs in {hub}
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {jobs.length > 0 ? (
              <>
                <span className="font-semibold text-foreground">{jobs.length}</span> open
                engineering {jobs.length === 1 ? "role" : "roles"} in {hub} across {byCompany.size}{" "}
                product {byCompany.size === 1 ? "company" : "companies"}, refreshed in the last
                24 hours.
              </>
            ) : (
              <>No active product-company roles in {hub} in the last 24 hours. ProdMatch refreshes daily.</>
            )}
          </p>
        </header>

        {/* By role function */}
        {roleCounts.size > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold sm:text-xl">By role</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {PUBLIC_ROLES
                .filter((r) => (roleCounts.get(r.canonical) ?? 0) > 0)
                .map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/cities/${hubSlug}/${r.slug}`}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                    >
                      {r.label} in {hub}
                      <span className="rounded-full bg-secondary px-1.5 text-[10px]">
                        {roleCounts.get(r.canonical)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Open roles */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Open roles in {hub}</h2>
          {jobs.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {jobs.slice(0, 30).map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/listings/${job.id}`}
                    className="group flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/30 sm:p-4"
                  >
                    <CompanyLogo
                      name={job.company.name}
                      logoUrl={job.company.logoUrl}
                      size={32}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold sm:text-base">{job.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[job.company.name, job.location, job.seniority].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              No open roles in {hub} right now. Browse all 18{" "}
              <Link href="/companies" className="text-primary hover:underline">product companies</Link>{" "}
              or try another city.
            </p>
          )}
        </section>

        {/* Companies hiring in this hub — live first, curated fallback */}
        {(byCompany.size > 0 ? [...byCompany.entries()].sort((a, b) => b[1].count - a[1].count).map(([slug, info]) => ({ slug, name: info.name, logoUrl: info.logoUrl, count: info.count })) : companiesInHub(hub).map((c) => ({ slug: c.slug, name: c.name, logoUrl: null as string | null, count: 0 }))).length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold sm:text-xl">Companies operating in {hub}</h2>
            {byCompany.size === 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Companies with engineering offices in {hub}. Live role counts will appear after the next 24-hour crawl.
              </p>
            )}
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(byCompany.size > 0
                ? [...byCompany.entries()].sort((a, b) => b[1].count - a[1].count).map(([slug, info]) => ({ slug, name: info.name, logoUrl: info.logoUrl, count: info.count }))
                : companiesInHub(hub).map((c) => ({ slug: c.slug, name: c.name, logoUrl: null as string | null, count: 0 }))
              ).map((info) => (
                  <li key={info.slug}>
                    <Link
                      href={`/companies/${info.slug}`}
                      className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition hover:bg-secondary/40"
                    >
                      <CompanyLogo name={info.name} logoUrl={info.logoUrl} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{info.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {info.count > 0 ? `${info.count} ${info.count === 1 ? "role" : "roles"}` : "view →"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Other cities */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Other cities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {INDIA_HUBS.filter((h) => h !== hub).map((other) => (
              <li key={other}>
                <Link
                  href={`/cities/${hubToSlug(other)}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {other}
                </Link>
              </li>
            ))}
          </ul>
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

// Reference so the build static-params helper isn't surprised by unused-import warnings.
export const _crawlerMetaReference = CRAWLER_META.length;
