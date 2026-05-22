// /companies/[slug] — public landing for a single product company.
//
// SEO design: H1 with primary keyword "{Company} careers in India", open
// roles table (auto from DB, deep-linked to /listings/[id]), top tech
// stack and hub breakdown derived from active JDs, internal links to
// company × role + city × role pages, FAQ block for AI Overviews.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Briefcase, ExternalLink, MapPin } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES, publicRoleFromCanonical } from "@/lib/seo/roles";
import {
  loadActiveJobs,
  loadCompanyHubBreakdown,
  loadCompanyTopSkills,
} from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return CRAWLER_META.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) return { title: "Company not found" };

  // We only need the count for description nuance; loading 1 row keeps this cheap.
  await loadActiveJobs({ companySlug: slug, limit: 1 });

  const title = `${company.name} Careers in India — Open Engineering Roles`;
  const description = `Browse open engineering roles at ${company.name} in India. Sourced from the official ${company.name} careers page and refreshed daily. AI fit-card analysis available after free sign-up.`;

  return {
    title,
    description,
    alternates: { canonical: `/companies/${slug}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/companies/${slug}`),
    },
  };
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) notFound();

  const [jobs, hubBreakdown, topSkills] = await Promise.all([
    loadActiveJobs({ companySlug: slug, limit: 60 }),
    loadCompanyHubBreakdown(slug),
    loadCompanyTopSkills(slug),
  ]);

  const totalOpen = jobs.length;
  const hubsRanked = Object.entries(hubBreakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  // Role-function distribution → which company × role pages exist for this co.
  const roleCounts = new Map<string, number>();
  for (const job of jobs) {
    if (job.roleFunctionJd) {
      roleCounts.set(job.roleFunctionJd, (roleCounts.get(job.roleFunctionJd) ?? 0) + 1);
    }
  }

  const faq = [
    {
      question: `Is ${company.name} a product-based company?`,
      answer: `Yes. ${company.name} is one of the 18 product-based companies tracked by ProdMatch.ai. We index their official career page directly — every listing here links to ${company.name}'s own apply URL.`,
    },
    {
      question: `How often does ProdMatch update ${company.name} listings?`,
      answer: `${company.name}'s career page is crawled every 24 hours. Each open role you see was confirmed available within the last day.`,
    },
    {
      question: `How do I see my AI fit score for ${company.name} roles?`,
      answer: `Create a free ProdMatch account and upload your resume (PDF, ≤5 MB). We'll score every ${company.name} role against your profile and explain why each match scored where it did.`,
    },
    {
      question: `Where is ${company.name} hiring in India?`,
      answer: hubsRanked.length > 0
        ? `${company.name} currently has roles in ${hubsRanked.map(([h]) => h).join(", ")}.`
        : `Visit ${company.name}'s official career page for current hub availability.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Companies", path: "/companies" },
        { name: company.name, path: `/companies/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="flex items-start gap-4 sm:gap-5">
          <CompanyLogo name={company.name} logoUrl={jobs[0]?.company.logoUrl ?? null} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Product company · India
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              {company.name} careers in India
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {totalOpen > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{totalOpen}</span> open
                  engineering {totalOpen === 1 ? "role" : "roles"} at {company.name} —
                  sourced from the official career page, refreshed daily by ProdMatch.ai.
                </>
              ) : (
                <>
                  ProdMatch tracks {company.name}&apos;s official career page every
                  24 hours. New roles will appear here as they go live.
                </>
              )}
            </p>
          </div>
        </header>

        {/* ── Quick stats ────────────────────────────────────────────── */}
        {totalOpen > 0 && (
          <section className="mt-6 grid grid-cols-3 gap-2">
            <Stat label="Open roles" value={String(totalOpen)} />
            <Stat label="Top hub" value={hubsRanked[0]?.[0] ?? "—"} />
            <Stat label="Updated" value="Within 24h" />
          </section>
        )}

        {/* ── Open roles ─────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Open roles</h2>
          {jobs.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {jobs.slice(0, 25).map((job) => (
                <li key={job.id}>
                  <Link
                    href={`/listings/${job.id}`}
                    className="group flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/30 sm:p-4"
                  >
                    <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold sm:text-base">{job.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[job.location, job.seniority, fmtComp(job.compLpaMin, job.compLpaMax)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              No open roles at {company.name} right now. We&apos;ll refresh in 24 hours.
            </p>
          )}
        </section>

        {/* ── Hubs ──────────────────────────────────────────────────── */}
        {hubsRanked.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold sm:text-xl">Where {company.name} is hiring</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {hubsRanked.map(([hub, count]) => (
                <li key={hub}>
                  <Link
                    href={`/cities/${hubToSlug(hub)}`}
                    className="flex min-h-12 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">{hub}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Roles by function ─────────────────────────────────────── */}
        {roleCounts.size > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold sm:text-xl">Browse by role</h2>
            <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PUBLIC_ROLES
                .filter((r) => (roleCounts.get(r.canonical) ?? 0) > 0)
                .map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/companies/${slug}/${r.slug}`}
                      className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                    >
                      <span className="min-w-0 truncate font-medium">
                        {company.name} {r.label} jobs
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {roleCounts.get(r.canonical)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* ── Tech stack ────────────────────────────────────────────── */}
        {topSkills.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold sm:text-xl">Most-asked skills</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Pulled from {totalOpen} active {company.name} JDs.
            </p>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {topSkills.map((skill) => (
                <li
                  key={skill}
                  className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── FAQ ───────────────────────────────────────────────────── */}
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

        {/* ── Related companies ─────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold sm:text-xl">Other product companies</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {CRAWLER_META.filter((c) => c.slug !== slug).slice(0, 12).map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/companies/${c.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Cross-links to derivative pages */}
        <section className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            href={`/salaries/${slug}`}
            className="group flex min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
          >
            <span className="min-w-0 truncate font-medium">{company.name} salaries (2026)</span>
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

        {/* ── Apply on official site footnote ───────────────────────── */}
        <p className="mt-10 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          Every role on this page links to {company.name}&apos;s official application URL.
          ProdMatch never charges or middlemans applications.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-sm font-semibold tabular-nums sm:text-base">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function fmtComp(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null;
  if (min != null && max != null) return `${min}–${max} LPA`;
  if (min != null) return `${min}+ LPA`;
  return `up to ${max} LPA`;
}

// Reference role helper kept for future use (e.g. crosslinking to taxonomy).
export const _publicRoleFromCanonical = publicRoleFromCanonical;
