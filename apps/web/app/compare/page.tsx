import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Scale } from "lucide-react";
import { COMPETITORS } from "@/lib/seo/comparisons";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "ProdMatch vs Naukri vs LinkedIn vs AI Resume Matchers",
  description: "Honest side-by-side comparisons of ProdMatch.ai against Naukri, LinkedIn, AI resume matchers, Indeed, Hirist, Instahyre, Cutshort, Glassdoor, Foundit for Indian tech job seekers.",
  alternates: { canonical: "/compare" },
  openGraph: { title: "ProdMatch comparisons for Indian tech job seekers", url: absoluteUrl("/compare") },
};

export default function CompareIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Compare", path: "/compare" },
      ])} />
      <JsonLd data={itemListJsonLd(COMPETITORS.map((c) => ({
        name: `ProdMatch vs ${c.name}`,
        path: `/compare/${c.slug}`,
        description: c.shortDescription,
      })))} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Scale className="h-3.5 w-3.5" />
            Honest comparisons
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            ProdMatch vs Indian job boards and AI resume matchers
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            We won&apos;t claim ProdMatch is better at everything. These pages
            spell out what each platform is genuinely good at, who each is
            for, and where ProdMatch fits in the picture.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {COMPETITORS.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/compare/${c.slug}`}
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Scale className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">ProdMatch vs {c.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{c.shortDescription}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-10 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          We link out to each competitor for fairness. Every Apply button across
          ProdMatch goes to the company&apos;s official career page.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}
