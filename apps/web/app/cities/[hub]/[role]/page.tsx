import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, MapPin } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { INDIA_HUBS, hubToSlug, slugToHub, absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES, publicRoleBySlug } from "@/lib/seo/roles";
import { loadActiveJobs } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return INDIA_HUBS.flatMap((hub) =>
    PUBLIC_ROLES.map((r) => ({ hub: hubToSlug(hub), role: r.slug })),
  );
}

export async function generateMetadata({ params }: { params: Promise<{ hub: string; role: string }> }): Promise<Metadata> {
  const { hub: hubSlug, role } = await params;
  const hub = slugToHub(hubSlug);
  const r = publicRoleBySlug(role);
  if (!hub || !r) return { title: "Not found" };
  const title = `${r.label} Jobs in ${hub} at Product Companies · ProdMatch`;
  const description = `Open ${r.label} roles in ${hub}, India at 51 product companies. Sourced from official career pages, refreshed daily.`;
  return {
    title,
    description,
    alternates: { canonical: `/cities/${hubSlug}/${role}` },
    openGraph: { title, description, url: absoluteUrl(`/cities/${hubSlug}/${role}`) },
  };
}

export default async function CityRolePage({ params }: { params: Promise<{ hub: string; role: string }> }) {
  const { hub: hubSlug, role } = await params;
  const hub = slugToHub(hubSlug);
  const r = publicRoleBySlug(role);
  if (!hub || !r) notFound();

  const jobs = await loadActiveJobs({ hub, roleFunction: r.canonical, limit: 50 });

  const faq = [
    {
      question: `Are product companies hiring ${r.plural.toLowerCase()} in ${hub}?`,
      answer: jobs.length > 0
        ? `Yes — ${jobs.length} open ${r.label} ${jobs.length === 1 ? "role" : "roles"} in ${hub} across multiple product companies were active in the last 24 hours.`
        : `No open ${r.label} roles in ${hub} in the last 24 hours. ProdMatch refreshes daily.`,
    },
    {
      question: `What's the average ${r.label} compensation in ${hub}?`,
      answer: `Compensation bands vary by company and seniority. Each role page on ProdMatch shows the disclosed band from the official JD when available.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Cities", path: "/cities" },
        { name: hub, path: `/cities/${hubSlug}` },
        { name: r.plural, path: `/cities/${hubSlug}/${role}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link
          href={`/cities/${hubSlug}`}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          ← {hub}
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="h-3.5 w-3.5" />
            {hub} · {r.label}
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {r.label} jobs in {hub} at product companies
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            {jobs.length > 0 ? (
              <>
                <span className="font-semibold text-foreground">{jobs.length}</span> open{" "}
                {r.label} {jobs.length === 1 ? "role" : "roles"} in {hub} —
                from product companies&apos; official career pages, refreshed within 24 hours.
              </>
            ) : (
              <>No open {r.label} roles in {hub} in the last 24 hours.</>
            )}
          </p>
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
                    <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} size={32} />
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
            <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              Try a wider city or a different role.
            </p>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other roles in {hub}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PUBLIC_ROLES.filter((x) => x.slug !== role).slice(0, 8).map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/cities/${hubSlug}/${x.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {x.label} jobs in {hub}
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
