import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import {
  JsonLd,
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  howToJsonLd,
} from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PILLAR_GUIDES, pillarGuideBySlug } from "@/lib/seo/guides";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";
import { HowToGetProductJobs } from "./_content/how-to-get-product-company-jobs-india";
import { ServicesToProductSwitch } from "./_content/services-to-product-switch";
import { AiResumeMatcherComparison } from "./_content/ai-resume-matcher-comparison";
import { WomenInTechIndia } from "./_content/women-in-tech-india";
import { FreshersProductCompanyJobs } from "./_content/freshers-product-company-jobs-india";

export const revalidate = 86400;

export function generateStaticParams() {
  return PILLAR_GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = pillarGuideBySlug(slug);
  if (!guide) return { title: "Guide not found", robots: { index: false } };
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      url: absoluteUrl(`/guides/${guide.slug}`),
      type: "article",
      publishedTime: guide.datePublished,
      modifiedTime: guide.dateModified ?? guide.datePublished,
      authors: [guide.authorName ?? "ProdMatch Editorial"],
    },
  };
}

const RENDERERS: Record<string, () => React.ReactNode> = {
  "how-to-get-product-company-jobs-india": () => <HowToGetProductJobs />,
  "services-to-product-switch": () => <ServicesToProductSwitch />,
  "ai-resume-matcher-comparison": () => <AiResumeMatcherComparison />,
  "women-in-tech-india": () => <WomenInTechIndia />,
  "freshers-product-company-jobs-india": () => <FreshersProductCompanyJobs />,
};

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = pillarGuideBySlug(slug);
  if (!guide) notFound();
  const renderer = RENDERERS[guide.slug];
  if (!renderer) notFound();

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title, path: `/guides/${guide.slug}` },
      ])} />
      <JsonLd data={articleJsonLd({
        headline: guide.headline,
        description: guide.description,
        url: absoluteUrl(`/guides/${guide.slug}`),
        datePublished: guide.datePublished,
        dateModified: guide.dateModified ?? guide.datePublished,
        authorName: guide.authorName ?? "ProdMatch Editorial",
      })} />

      <article className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <Link href="/guides" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          ← All guides
        </Link>

        <header className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Career guide
          </div>
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {guide.headline}
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">{guide.tldr}</p>
          <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3 w-3" />
              {guide.readMinutes} min read
            </span>
            <span>·</span>
            <span>Published {new Date(guide.datePublished).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            <span>·</span>
            <span>By {guide.authorName ?? "ProdMatch Editorial"}</span>
          </p>
        </header>

        {/* Body */}
        <div className="prose prose-sm prose-neutral mt-8 max-w-none dark:prose-invert sm:prose-base">
          {renderer()}
        </div>

        {/* CTA */}
        <section className="mt-10 rounded-xl border border-primary/20 bg-primary-soft p-5 sm:p-6">
          <h2 className="text-base font-semibold">Try ProdMatch on your resume</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Upload your PDF. We rank every active role at the 51 product
            companies by fit, with strengths + gaps, in under 60 seconds.
          </p>
          <Link
            href="/auth/login"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in — free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>

        {/* Related */}
        <section className="mt-10">
          <h2 className="text-lg font-semibold">Other guides</h2>
          <ul className="mt-3 space-y-2">
            {PILLAR_GUIDES.filter((g) => g.slug !== slug).map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/guides/${g.slug}`}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                >
                  <span className="min-w-0 truncate font-medium">{g.title}</span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <PublicFooter />
    </div>
  );
}

// Helper used by the content modules to inject HowTo + FAQ JSON-LD per guide.
// Each content module renders its own <JsonLd> blocks for these.
export { howToJsonLd as _howToJsonLd, faqJsonLd as _faqJsonLd };
