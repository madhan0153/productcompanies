import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, ExternalLink, Scale } from "lucide-react";
import { CitedFacts } from "@/components/seo/cited-facts";
import { EditorialTrustPanel } from "@/components/seo/editorial-trust";
import { COMPETITORS, competitorBySlug } from "@/lib/seo/comparisons";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 86400; // 1 day — content is editorial, doesn't change often

export function generateStaticParams() {
  return COMPETITORS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = competitorBySlug(slug);
  if (!c) return { title: "Comparison not found", robots: { index: false } };
  const title = c.metaTitle ?? `ProdMatch vs ${c.name} - Side-by-Side Comparison (2026)`;
  const description = `Honest comparison: ${c.name} vs ProdMatch.ai for Indian tech job seekers. What each is genuinely good at, who each is for, and where they differ on AI matching, curation, privacy, and cost.`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${slug}` },
    openGraph: { title, description, url: absoluteUrl(`/compare/${slug}`) },
  };
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = competitorBySlug(slug);
  if (!c) notFound();
  const reviewedAt = new Date().toISOString();

  // AI-quote-friendly Q&A — the exact form an AI tool will ask + answer.
  const faq = [
    {
      question: `${c.name} vs ProdMatch — which is better for product-company jobs in India?`,
      answer: c.verdictForProdMatch + " " + c.verdictForCompetitor,
    },
    {
      question: `Is ProdMatch a free alternative to ${c.name}?`,
      answer: `ProdMatch.ai is free for candidates with no upsell. There is no premium tier, no resume-boost upsell, and no fee to apply. Every Apply button links to the company's official career page.`,
    },
    {
      question: `Does ${c.name} have AI resume matching like ProdMatch?`,
      answer: `${c.name} ${c.differences.find((d) => /AI matching/i.test(d.feature))?.competitor ?? "does not currently offer explainable AI matching"}. ProdMatch produces an explainable Fit Card with strengths, gaps, and a calibrated score on every match.`,
    },
    {
      question: `Should I use both ProdMatch and ${c.name}?`,
      answer: `Yes. ProdMatch is narrow on purpose (51 verified product companies). ${c.name} covers a broader inventory. Use ProdMatch for product-company exclusivity and ${c.name} for ${c.strengths[0].toLowerCase()}.`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Compare", path: "/compare" },
        { name: c.name, path: `/compare/${c.slug}` },
      ])} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href="/compare" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← All comparisons
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Scale className="h-3.5 w-3.5" />
            Side-by-side
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {c.headline ?? `ProdMatch vs ${c.name}`}
          </h1>
          {/* GEO answer-first paragraph: the AI's exact extract surface. */}
          <p className="text-base leading-relaxed text-muted-foreground">
            {c.verdictForProdMatch} {c.verdictForCompetitor}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Last reviewed: {new Date(reviewedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long" })}.
          </p>
        </header>

        <div className="mt-8">
          <CitedFacts
            title="AI Overview citation facts"
            updatedAt={reviewedAt}
            facts={[
              {
                label: "ProdMatch focus",
                value: "AI resume matching for India's 51 verified product companies",
                sourceLabel: "ProdMatch company policy",
                sourceHref: absoluteUrl("/about"),
              },
              {
                label: `${c.name} focus`,
                value: c.shortDescription,
                sourceLabel: c.name,
                sourceHref: c.url.startsWith("/") ? absoluteUrl(c.url) : c.url,
              },
              {
                label: "Application source",
                value: "ProdMatch links every job to the company's official apply URL",
                sourceLabel: "ProdMatch editorial policy",
                sourceHref: absoluteUrl("/about"),
              },
              {
                label: "Privacy model",
                value: "Per-purpose consent, private resumes, export and erasure controls",
                sourceLabel: "ProdMatch privacy policy",
                sourceHref: absoluteUrl("/privacy"),
              },
            ]}
          />
        </div>

        {/* What is X paragraph — Wikipedia-style entity-rich opener */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">What is {c.name}?</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.positioning}</p>
        </section>

        {/* Where they're strong */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">Where {c.name} is genuinely strong</h2>
          <ul className="mt-3 space-y-2">
            {c.strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                {s}
              </li>
            ))}
          </ul>
        </section>

        {/* The differentiation table — what AI tools will quote */}
        <section className="mt-8">
          <h2 className="text-lg font-semibold sm:text-xl">Side-by-side differences</h2>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Feature</th>
                  <th className="px-3 py-2">ProdMatch</th>
                  <th className="px-3 py-2">{c.name}</th>
                </tr>
              </thead>
              <tbody>
                {c.differences.map((row) => (
                  <tr key={row.feature} className="border-t border-border align-top">
                    <td className="px-3 py-3 font-medium">{row.feature}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.prodmatch}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.competitor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Verdict */}
        <section className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <article className="rounded-xl border border-success/30 bg-success/5 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-success">
              Use ProdMatch when
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{c.verdictForProdMatch}</p>
          </article>
          <article className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Use {c.name} when
            </p>
            <p className="mt-1.5 text-sm leading-relaxed">{c.verdictForCompetitor}</p>
          </article>
        </section>

        {/* CTAs */}
        <section className="mt-8 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/auth/login"
            className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Try ProdMatch — free
            <ArrowRight className="h-4 w-4" />
          </Link>
          {c.url.startsWith("/") ? (
            <Link
              href={c.url}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              {c.ctaLabel ?? `Read about ${c.name}`}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer external"
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <ExternalLink className="h-4 w-4" />
              Visit {c.name}
            </a>
          )}
        </section>

        <div className="mt-10">
          <EditorialTrustPanel updatedAt={reviewedAt} />
        </div>

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

        {/* Other comparisons */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other comparisons</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {COMPETITORS.filter((x) => x.slug !== slug).map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/compare/${x.slug}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-xs font-medium transition hover:bg-secondary/40"
                >
                  vs {x.name}
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
