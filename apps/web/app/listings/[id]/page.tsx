// /listings/[id] — public job page with JobPosting JSON-LD.
//
// This is THE SEO unlock. Without a public, indexable, schema-marked
// page per job, ProdMatch can't appear in Google for Jobs at all.
//
// The page intentionally does NOT reproduce the full JD verbatim (which
// would create a duplicate-content issue with the official career page).
// Instead it surfaces:
//   - Title, company, location, comp band, seniority — facts.
//   - Our short jd_summary (LLM-generated overview, materially different
//     from the raw JD).
//   - Top skills extracted from the JD.
//   - "Apply on official site" button (only path to apply).
//   - "See AI fit analysis" CTA (gated behind sign-in).
//   - Related roles (same company, same role function, same city).
//
// Schema: JobPosting + BreadcrumbList + FAQPage.
//
// `is_active = false` → 410 Gone (drives Google to de-index quickly).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  ExternalLink,
  MapPin,
  Clock3,
  Building2,
  Sparkles,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd, jobPostingJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl, HUB_REGION, hubToSlug } from "@/lib/seo/site";
import { publicRoleFromCanonical } from "@/lib/seo/roles";
import { loadActiveJobs, loadJobById } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 1800; // 30 min — jobs go stale fast

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const job = await loadJobById(id);
  if (!job) return { title: "Job not found", robots: { index: false } };
  const title = `${job.title} at ${job.company.name}${job.location ? ` — ${job.location}` : ""}`;
  const description = (job.jdSummary ?? "")
    .slice(0, 155)
    .replace(/\s+/g, " ")
    .trim() ||
    `Open ${job.title} role at ${job.company.name}${job.location ? ` in ${job.location}` : ""}. Apply on the official career page. AI fit-card available via free sign-up.`;
  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/listings/${id}`),
      type: "article",
    },
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await loadJobById(id);
  if (!job) notFound();

  const role = publicRoleFromCanonical(job.roleFunctionJd);
  const primaryHub = job.hubs?.[0] ?? null;
  const region = primaryHub ? HUB_REGION[primaryHub] ?? null : null;

  const datePosted = job.postedAt ?? job.lastSeenAt ?? new Date().toISOString();

  // Related roles for internal-linking + onward navigation.
  const [related, similarRole, similarCity] = await Promise.all([
    loadActiveJobs({ companySlug: job.company.slug, limit: 6 }),
    role
      ? loadActiveJobs({ roleFunction: role.canonical, limit: 6 })
      : Promise.resolve([] as Awaited<ReturnType<typeof loadActiveJobs>>),
    primaryHub
      ? loadActiveJobs({ hub: primaryHub, limit: 6 })
      : Promise.resolve([] as Awaited<ReturnType<typeof loadActiveJobs>>),
  ]);

  const faq = [
    {
      question: `Is the ${job.title} role at ${job.company.name} still open?`,
      answer: `As of the last refresh (within 24 hours), yes. ProdMatch removes roles from the index when ${job.company.name} takes them off their official career page.`,
    },
    {
      question: `How do I apply for ${job.title} at ${job.company.name}?`,
      answer: job.applyUrl
        ? `Click "Apply on official site" — you'll be sent directly to ${job.company.name}'s own application page. ProdMatch never hosts applications.`
        : `Visit ${job.company.name}'s official career page; ProdMatch sends every application through the company's own apply URL.`,
    },
    {
      question: `What's the compensation for this role?`,
      answer: job.compLpaMin != null && job.compLpaMax != null
        ? `The disclosed compensation band is ${job.compLpaMin}–${job.compLpaMax} LPA.`
        : `${job.company.name} hasn't disclosed a compensation band on the JD. Sign in to ProdMatch for a calibrated estimate based on role + city + seniority.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Companies", path: "/companies" },
        { name: job.company.name, path: `/companies/${job.company.slug}` },
        { name: job.title, path: `/listings/${job.id}` },
      ])} />
      <JsonLd data={jobPostingJsonLd({
        id: job.id,
        title: job.title,
        description: job.jdSummary ?? `${job.title} role at ${job.company.name}. Apply on the official ${job.company.name} career page.`,
        datePosted,
        company: {
          name: job.company.name,
          slug: job.company.slug,
          logoUrl: job.company.logoUrl,
        },
        location: job.location ?? primaryHub,
        regionCode: region,
        applyUrl: job.applyUrl,
        compLpaMin: job.compLpaMin,
        compLpaMax: job.compLpaMax,
        seniority: job.seniority,
        lastSeenAt: job.lastSeenAt,
      })} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {/* Breadcrumb */}
        <nav className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/companies" className="hover:text-foreground">Companies</Link>
          <span>›</span>
          <Link href={`/companies/${job.company.slug}`} className="hover:text-foreground">
            {job.company.name}
          </Link>
          {role && (
            <>
              <span>›</span>
              <Link href={`/companies/${job.company.slug}/${role.slug}`} className="hover:text-foreground">
                {role.plural}
              </Link>
            </>
          )}
        </nav>

        {/* Header */}
        <header className="mt-4 flex items-start gap-3 sm:gap-4">
          <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
              {job.title}
            </h1>
            <p className="mt-1 inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
              <Link href={`/companies/${job.company.slug}`} className="font-semibold text-foreground hover:underline">
                {job.company.name}
              </Link>
              {job.location && (
                <span className="inline-flex items-center gap-1">
                  · <MapPin className="h-3 w-3" /> {job.location}
                </span>
              )}
              {job.seniority && <span>· {job.seniority}</span>}
            </p>
          </div>
        </header>

        {/* Stat strip */}
        <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {job.compLpaMin != null && (
            <Stat label="Compensation" value={`${job.compLpaMin}–${job.compLpaMax ?? job.compLpaMin}L`} />
          )}
          {job.seniority && <Stat label="Level" value={job.seniority} />}
          {primaryHub && <Stat label="Hub" value={primaryHub} />}
          <Stat label="Updated" value="<24h ago" />
        </section>

        {/* Primary CTAs */}
        <section className="mt-6 flex flex-col gap-2 sm:flex-row">
          {job.applyUrl && (
            <a
              href={job.applyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow external"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <ExternalLink className="h-4 w-4" />
              Apply on {job.company.name} official site
            </a>
          )}
          <Link
            href={`/auth/login?next=${encodeURIComponent(`/jobs/${job.id}`)}`}
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary" />
            See AI fit analysis
          </Link>
        </section>

        {/* JD summary (LLM-generated; materially different from the raw JD) */}
        {job.jdSummary && (
          <section className="mt-8 rounded-xl border border-border bg-card p-5">
            <h2 className="text-base font-semibold">About this role</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{job.jdSummary}</p>
            <p className="mt-3 text-[11px] text-muted-foreground">
              ProdMatch summarises each official JD into a quick read.
              <a href={job.applyUrl ?? "#"} target="_blank" rel="noopener noreferrer nofollow external" className="ml-1 text-primary hover:underline">
                Read the full JD on {job.company.name}&apos;s site →
              </a>
            </p>
          </section>
        )}

        {/* Tech stack */}
        {(job.techStack ?? []).length > 0 && (
          <section className="mt-6">
            <h2 className="text-base font-semibold">Tech stack signals</h2>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {(job.techStack ?? []).slice(0, 20).map((s) => (
                <li key={s} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs">{s}</li>
              ))}
            </ul>
          </section>
        )}

        {/* Internal-link onward navigation */}
        {related.length > 1 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              More open roles at {job.company.name}
            </h2>
            <ul className="mt-3 space-y-2">
              {related.filter((r) => r.id !== job.id).slice(0, 5).map((r) => (
                <RelatedRow key={r.id} job={r} />
              ))}
            </ul>
            <Link
              href={`/companies/${job.company.slug}`}
              className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All {job.company.name} roles
              <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        )}

        {role && similarRole.length > 1 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold inline-flex items-center gap-1.5">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              Other {role.label} jobs at product companies
            </h2>
            <ul className="mt-3 space-y-2">
              {similarRole.filter((r) => r.id !== job.id).slice(0, 4).map((r) => (
                <RelatedRow key={r.id} job={r} />
              ))}
            </ul>
            <Link href={`/roles/${role.slug}`} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">
              All {role.plural} <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        )}

        {primaryHub && similarCity.length > 1 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Other roles in {primaryHub}
            </h2>
            <ul className="mt-3 space-y-2">
              {similarCity.filter((r) => r.id !== job.id).slice(0, 4).map((r) => (
                <RelatedRow key={r.id} job={r} />
              ))}
            </ul>
            <Link
              href={`/cities/${hubToSlug(primaryHub)}`}
              className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              All {primaryHub} roles <ArrowRight className="h-3 w-3" />
            </Link>
          </section>
        )}

        {/* FAQ */}
        <section className="mt-10 rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Frequently asked</h2>
          <dl className="mt-4 space-y-4">
            {faq.map((item) => (
              <div key={item.question}>
                <dt className="text-sm font-semibold">{item.question}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="mt-6 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock3 className="h-3 w-3" />
          ProdMatch indexes {job.company.name}&apos;s official career page every 24 hours.
          We never charge for applications.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-sm font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function RelatedRow({ job }: { job: Awaited<ReturnType<typeof loadActiveJobs>>[number] }) {
  return (
    <li>
      <Link
        href={`/listings/${job.id}`}
        className="group flex min-h-14 items-center gap-3 rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/30"
      >
        <CompanyLogo name={job.company.name} logoUrl={job.company.logoUrl} size={32} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{job.title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[job.company.name, job.location, job.seniority].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    </li>
  );
}
