import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Cpu } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_SKILLS, publicSkillBySlug, matchSkill } from "@/lib/seo/skills";
import { loadActiveJobs } from "@/lib/seo/data";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export function generateStaticParams() {
  return PUBLIC_SKILLS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const skill = publicSkillBySlug(slug);
  if (!skill) return { title: "Skill not found", robots: { index: false } };
  const title = `${skill.name} Jobs at Product Companies in India — Open Roles`;
  const description = `Open engineering roles tagging ${skill.name} at India's 18 product companies — sourced from official career pages. ${skill.blurb}`;
  return {
    title,
    description,
    alternates: { canonical: `/skills/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/skills/${slug}`) },
  };
}

export default async function SkillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const skill = publicSkillBySlug(slug);
  if (!skill) notFound();

  // Pull a wide sample of active jobs and filter in-memory by tech_stack
  // alias match. Bounded so it works even when the crawler has populated
  // thousands of rows.
  const allJobs = await loadActiveJobs({ limit: 2000 });
  const jobs = allJobs.filter((job) =>
    (job.techStack ?? []).some((tok) => matchSkill(tok)?.slug === skill.slug),
  );

  const byCompany = new Map<string, { name: string; logoUrl: string | null; count: number }>();
  for (const job of jobs) {
    const cur = byCompany.get(job.company.slug);
    byCompany.set(job.company.slug, {
      name: job.company.name,
      logoUrl: job.company.logoUrl,
      count: (cur?.count ?? 0) + 1,
    });
  }

  const faq = [
    {
      question: `Which Indian product companies hire ${skill.name} engineers?`,
      answer: byCompany.size > 0
        ? `${[...byCompany.values()].map((c) => c.name).slice(0, 10).join(", ")}${byCompany.size > 10 ? " and others" : ""} have active ${skill.name} roles in the last 24-hour crawl.`
        : `No active ${skill.name}-tagged roles in the last 24-hour crawl. Browse all 18 product companies on ProdMatch for current openings.`,
    },
    {
      question: `What does an ${skill.name} engineer at an Indian product company actually work on?`,
      answer: skill.blurb,
    },
    {
      question: `Is ${skill.name} in demand at product-based companies in India in 2026?`,
      answer: `Yes. ${jobs.length > 0 ? `ProdMatch counted ${jobs.length} open ${skill.name}-tagged roles across ${byCompany.size} of India's 18 product companies in the last 24 hours.` : `${skill.name} appears regularly in product-company JDs even when the latest 24-hour crawl shows zero matches.`}`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Skills", path: "/skills" },
        { name: skill.name, path: `/skills/${slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href="/skills" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← All skills
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Cpu className="h-3.5 w-3.5" />
            {skill.category} · {skill.name}
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {skill.name} jobs at India&apos;s product companies
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">{skill.blurb}</p>
          {jobs.length > 0 && (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{jobs.length}</span> open
              {" "}{skill.name}-tagged {jobs.length === 1 ? "role" : "roles"} across{" "}
              <span className="font-semibold text-foreground">{byCompany.size}</span> product{" "}
              {byCompany.size === 1 ? "company" : "companies"}, refreshed in the last 24 hours.
            </p>
          )}
        </header>

        {byCompany.size > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold">Companies hiring {skill.name} engineers</h2>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[...byCompany.entries()]
                .sort((a, b) => b[1].count - a[1].count)
                .map(([s, info]) => (
                  <li key={s}>
                    <Link
                      href={`/companies/${s}`}
                      className="flex min-h-12 items-center gap-3 rounded-md border border-border bg-card px-3 py-2 transition hover:bg-secondary/40"
                    >
                      <CompanyLogo name={info.name} logoUrl={info.logoUrl} size={32} />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{info.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {info.count} {info.count === 1 ? "role" : "roles"}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {jobs.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-lg font-semibold">Open {skill.name} roles</h2>
            <ul className="mt-3 space-y-2">
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
          </section>
        ) : (
          <section className="mt-10 rounded-lg border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            No active {skill.name}-tagged roles in the last 24 hours. Browse{" "}
            <Link href="/companies" className="text-primary hover:underline">all 18 product companies</Link>{" "}
            or check the next crawl.
          </section>
        )}

        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other skills</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {PUBLIC_SKILLS.filter((s) => s.slug !== slug).slice(0, 16).map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/skills/${s.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  {s.name}
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
