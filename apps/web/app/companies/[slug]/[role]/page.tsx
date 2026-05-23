// /companies/[slug]/[role] — company × role cross-product page.
// 51 cos × 13 roles = 663 SEO pages from a single template.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Briefcase, MapPin } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES, publicRoleBySlug } from "@/lib/seo/roles";
import { loadActiveJobs } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return CRAWLER_META.flatMap((c) =>
    PUBLIC_ROLES.map((r) => ({ slug: c.slug, role: r.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; role: string }> }): Promise<Metadata> {
  const { slug, role } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  const r = publicRoleBySlug(role);
  if (!company || !r) return { title: "Not found" };
  const title = `${company.name} ${r.label} Jobs in India · ProdMatch`;
  const description = `Open ${r.label} roles at ${company.name} in India. Sourced from the official ${company.name} career page, refreshed daily. AI fit-card available after free sign-up.`;
  return {
    title,
    description,
    alternates: { canonical: `/companies/${slug}/${role}` },
    openGraph: { title, description, url: absoluteUrl(`/companies/${slug}/${role}`) },
  };
}

export default async function CompanyRolePage({ params }: { params: Promise<{ slug: string; role: string }> }) {
  const { slug, role } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  const r = publicRoleBySlug(role);
  if (!company || !r) notFound();

  const jobs = await loadActiveJobs({ companySlug: slug, roleFunction: r.canonical, limit: 40 });

  const hubs = new Map<string, number>();
  for (const job of jobs) for (const h of job.hubs ?? []) hubs.set(h, (hubs.get(h) ?? 0) + 1);

  const faq = [
    {
      question: `Is ${company.name} hiring ${r.plural.toLowerCase()} in India right now?`,
      answer: jobs.length > 0
        ? `Yes — ${jobs.length} open ${r.label} ${jobs.length === 1 ? "role" : "roles"} at ${company.name} were active in the last 24 hours.`
        : `No open ${r.label} roles at ${company.name} were active in the last 24 hours. ProdMatch refreshes daily — check back tomorrow.`,
    },
    {
      question: `What does a ${r.label} at ${company.name} typically work on?`,
      answer: `Open ${r.label} roles at ${company.name} are listed below with their official job descriptions. Sign in to ProdMatch for an AI Fit Card that maps each JD to your specific skills.`,
    },
    {
      question: `How do I apply to ${company.name} ${r.plural.toLowerCase()} directly?`,
      answer: `Every role on this page links to ${company.name}'s official application URL. ProdMatch does not host applications or charge any fees.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Companies", path: "/companies" },
        { name: company.name, path: `/companies/${slug}` },
        { name: r.plural, path: `/companies/${slug}/${role}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link
          href={`/companies/${slug}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          ← {company.name}
        </Link>

        <header className="mt-4 flex items-start gap-4">
          <CompanyLogo name={company.name} logoUrl={jobs[0]?.company.logoUrl ?? null} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {company.name} · India
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {company.name} {r.label} jobs in India
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {jobs.length > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{jobs.length}</span> open{" "}
                  {r.label} {jobs.length === 1 ? "role" : "roles"} at {company.name} —
                  from the official career page, refreshed in the last 24 hours.
                </>
              ) : (
                <>
                  No open {r.label} roles at {company.name} in the last 24 hours.
                  ProdMatch refreshes daily.
                </>
              )}
            </p>
          </div>
        </header>

        <section className="mt-8">
          {jobs.length > 0 ? (
            <ul className="space-y-2">
              {jobs.map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/listings/${job.id}`}
                    className="group flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/30 sm:p-4"
                  >
                    <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold sm:text-base">{job.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[job.location, job.seniority].filter(Boolean).join(" · ") || "India"}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              No matching roles right now. Try:
            </p>
          )}
        </section>

        {/* City fan-out: city × role pages this role exists in */}
        {hubs.size > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">{r.plural} by city</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...hubs.entries()].sort((a, b) => b[1] - a[1]).map(([hub, count]) => (
                <li key={hub}>
                  <Link
                    href={`/cities/${hubToSlug(hub)}/${role}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                  >
                    <MapPin className="h-3 w-3" />
                    {hub} {r.label.toLowerCase()} jobs ({count})
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Other roles at this company */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other {company.name} roles</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PUBLIC_ROLES.filter((x) => x.slug !== role).slice(0, 8).map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/companies/${slug}/${x.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {company.name} {x.label} jobs
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
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
