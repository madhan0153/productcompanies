import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PILLAR_GUIDES } from "@/lib/seo/guides";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Career Guides for Indian Product-Company Job Seekers",
  description: "In-depth guides on product-company job-hunting in India — service-to-product switch, resume tactics, DSA roadmap, AI matching, salary insights. Field-tested by ProdMatch's data.",
  alternates: { canonical: "/guides" },
  openGraph: { title: "ProdMatch career guides", url: absoluteUrl("/guides") },
};

export default function GuidesIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
      ])} />
      <JsonLd data={itemListJsonLd(PILLAR_GUIDES.map((g) => ({
        name: g.title,
        path: `/guides/${g.slug}`,
        description: g.description,
      })))} />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            Career guides
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Field-tested guides for Indian product-company job seekers
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            No fluff. Each guide is built on data from ProdMatch&apos;s
            matching engine + the daily crawl of 51 product companies&apos;
            official career pages.
          </p>
        </header>

        <ul className="mt-8 space-y-3">
          {PILLAR_GUIDES.map((g) => (
            <li key={g.slug}>
              <Link
                href={`/guides/${g.slug}`}
                className="group block rounded-xl border border-border bg-card p-5 transition hover:border-primary/30 hover:bg-secondary/30"
              >
                <h2 className="text-lg font-semibold leading-snug sm:text-xl">{g.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{g.tldr}</p>
                <p className="mt-3 inline-flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 className="h-3 w-3" />
                    {g.readMinutes} min read
                  </span>
                  <span>·</span>
                  <span>Updated {new Date(g.dateModified ?? g.datePublished).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-primary group-hover:underline">
                    Read <ArrowRight className="h-3 w-3" />
                  </span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <PublicFooter />
    </div>
  );
}
