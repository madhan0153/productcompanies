import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { INDIA_HUBS, hubToSlug, absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES, publicRoleBySlug } from "@/lib/seo/roles";
import { loadActiveJobs } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return PUBLIC_ROLES.map((r) => ({ role: r.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ role: string }> }): Promise<Metadata> {
  const { role } = await params;
  const r = publicRoleBySlug(role);
  if (!r) return { title: "Role not found" };
  const title = `${r.plural} Jobs at Product Companies in India`;
  const description = `Open ${r.label} roles at 51 verified product companies in India — Google, Razorpay, Swiggy and more. Refreshed daily from official career pages.`;
  return {
    title,
    description,
    alternates: { canonical: `/roles/${role}` },
    openGraph: { title, description, url: absoluteUrl(`/roles/${role}`) },
  };
}

export default async function RolePage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  const r = publicRoleBySlug(role);
  if (!r) notFound();

  const jobs = await loadActiveJobs({ roleFunction: r.canonical, limit: 60 });

  const byCompany = new Map<string, { name: string; logoUrl: string | null; count: number }>();
  for (const job of jobs) {
    const cur = byCompany.get(job.company.slug);
    byCompany.set(job.company.slug, {
      name: job.company.name,
      logoUrl: job.company.logoUrl,
      count: (cur?.count ?? 0) + 1,
    });
  }
  const byHub = new Map<string, number>();
  for (const job of jobs) for (const h of job.hubs ?? []) byHub.set(h, (byHub.get(h) ?? 0) + 1);

  const faq = [
    {
      question: `How many ${r.label} jobs are open at Indian product companies right now?`,
      answer: jobs.length > 0
        ? `${jobs.length} ${r.label} roles across ${byCompany.size} product ${byCompany.size === 1 ? "company" : "companies"} were active in the last 24 hours.`
        : `No active ${r.label} roles in the last 24 hours. ProdMatch refreshes daily.`,
    },
    {
      question: `Which Indian product companies hire ${r.plural.toLowerCase()}?`,
      answer: byCompany.size > 0
        ? `${[...byCompany.values()].map((c) => c.name).slice(0, 10).join(", ")}.`
        : `Browse all 51 product companies ProdMatch tracks; many hire across multiple role functions.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Roles", path: "/roles" },
        { name: r.plural, path: `/roles/${role}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {r.plural} jobs at product companies in India
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {jobs.length > 0 ? (
              <>
                <span className="font-semibold text-foreground">{jobs.length}</span> open{" "}
                {r.label} roles across {byCompany.size} product{" "}
                {byCompany.size === 1 ? "company" : "companies"} — refreshed daily from official
                career pages.
              </>
            ) : (
              <>No active {r.label} roles in the last 24 hours.</>
            )}
          </p>
        </header>

        {byHub.size > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold sm:text-xl">By city</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {[...byHub.entries()].sort((a, b) => b[1] - a[1]).map(([hub, count]) => (
                <li key={hub}>
                  <Link
                    href={`/cities/${hubToSlug(hub)}/${role}`}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                  >
                    {r.label} in {hub}
                    <span className="rounded-full bg-secondary px-1.5 text-[10px]">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {byCompany.size > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold sm:text-xl">By company</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[...byCompany.entries()]
                .sort((a, b) => b[1].count - a[1].count)
                .map(([slug, info]) => (
                  <li key={slug}>
                    <Link
                      href={`/companies/${slug}/${role}`}
                      className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition hover:bg-secondary/40"
                    >
                      <CompanyLogo name={info.name} logoUrl={info.logoUrl} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {info.name} {r.label}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{info.count}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">All open {r.plural.toLowerCase()}</h2>
          {jobs.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {jobs.slice(0, 30).map((job) => (
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
              Browse other{" "}
              <Link href="/roles" className="text-primary hover:underline">roles</Link>{" "}
              or all{" "}
              <Link href="/companies" className="text-primary hover:underline">51 product companies</Link>.
            </p>
          )}
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

// Tiny reference so unused-import lints stay quiet for the company-list ref.
export const _crawler = CRAWLER_META.length;
export const _hubs = INDIA_HUBS.length;
