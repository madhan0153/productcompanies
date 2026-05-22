import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock3, Target, XCircle } from "lucide-react";
import { CRAWLER_META } from "@prodmatch/shared";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { interviewProcessFor } from "@/lib/seo/interview-processes";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 86400;

export function generateStaticParams() {
  return CRAWLER_META.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) return { title: "Not found", robots: { index: false } };
  const title = `${company.name} Interview Process 2026 — Rounds, Questions, Prep`;
  const description = `Detailed ${company.name} engineering interview process for 2026: rounds, what to prepare, common rejection reasons, and what raises your odds. India product-company candidate guide.`;
  return {
    title,
    description,
    alternates: { canonical: `/companies/${slug}/interview-process` },
    openGraph: { title, description, url: absoluteUrl(`/companies/${slug}/interview-process`) },
  };
}

export default async function CompanyInterviewProcessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = CRAWLER_META.find((c) => c.slug === slug);
  if (!company) notFound();
  const spec = interviewProcessFor(slug);
  const primary = spec.processes[0]!;

  const totalMinutes = primary.rounds.reduce((s, r) => s + r.durationMin, 0);

  const faq = [
    {
      question: `What is the interview process at ${company.name}?`,
      answer: spec.tldr,
    },
    {
      question: `How many rounds does ${company.name} have?`,
      answer: `${primary.rounds.length} rounds in the typical ${primary.loopLabel.toLowerCase()}: ${primary.rounds.map((r) => r.name).join(", ")}.`,
    },
    {
      question: `What should I prepare for the ${company.name} interview?`,
      answer: primary.successFactors.join(" "),
    },
    {
      question: `Why do candidates get rejected at ${company.name}?`,
      answer: `Common reasons: ${primary.commonRejectionReasons.join("; ")}.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Companies", path: "/companies" },
        { name: company.name, path: `/companies/${slug}` },
        { name: "Interview process", path: `/companies/${slug}/interview-process` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href={`/companies/${slug}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← {company.name}
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Target className="h-3.5 w-3.5" />
            {company.name} · Interview process
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {company.name} interview process — 2026
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">{spec.tldr}</p>
          <p className="text-[11px] text-muted-foreground">
            Editorial. Based on publicly-shared candidate experiences,
            engineering blogs, and patterns ProdMatch sees across the loop.
            Not an authoritative reproduction of any company&apos;s internal process.
          </p>
        </header>

        {/* Overview */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">Overview</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{spec.overview}</p>
        </section>

        {/* The rounds */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">{primary.loopLabel}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Total time across rounds: ~{Math.round(totalMinutes / 60)} hours, typically spread across 1-2 weeks.
          </p>
          <ol className="mt-4 space-y-3">
            {primary.rounds.map((round, i) => (
              <li key={round.name} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-snug">{round.name}</h3>
                    {round.durationMin > 0 && (
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock3 className="h-3 w-3" />
                        {round.durationMin} min
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{round.description}</p>
                    {round.prep && round.prep.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {round.prep.map((p) => (
                          <li key={p} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px]">
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Success / failure factors */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-success/30 bg-success/5 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-success">
              <CheckCircle2 className="h-4 w-4" />
              What raises your odds
            </h2>
            <ul className="mt-3 space-y-2">
              {primary.successFactors.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
              <XCircle className="h-4 w-4" />
              Common rejection reasons
            </h2>
            <ul className="mt-3 space-y-2">
              {primary.commonRejectionReasons.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm leading-relaxed">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </article>
        </section>

        {/* Cross-links */}
        <section className="mt-10 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Link href={`/companies/${slug}`} className="rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40">
            <span className="font-medium">Open roles at {company.name}</span>
          </Link>
          <Link href={`/salaries/${slug}`} className="rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40">
            <span className="font-medium">{company.name} salaries</span>
          </Link>
          <Link href="/dsa/patterns" className="rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40">
            <span className="font-medium">DSA patterns to prep</span>
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
