import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { INDIA_HUBS, hubToSlug, absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Product Company Jobs by City in India",
  description:
    "Engineering jobs at India's top 18 product companies, organised by city — Bengaluru, Hyderabad, Pune, Gurugram, Noida, Delhi NCR, Mumbai, Chennai, and Remote-India.",
  alternates: { canonical: "/cities" },
  openGraph: {
    title: "Product Company Jobs by City in India",
    url: absoluteUrl("/cities"),
  },
};

export default function CitiesIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Cities", path: "/cities" },
      ])} />
      <JsonLd data={itemListJsonLd(INDIA_HUBS.map((hub) => ({
        name: `${hub} product company jobs`,
        path: `/cities/${hubToSlug(hub)}`,
      })))} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <MapPin className="h-3.5 w-3.5" />
            9 hubs across India
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Product company jobs by city
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Find engineering roles at India&apos;s top product-based companies in your
            preferred hub. Every listing is sourced from the company&apos;s official
            career page and refreshed daily.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDIA_HUBS.map((hub) => (
            <li key={hub}>
              <Link
                href={`/cities/${hubToSlug(hub)}`}
                className="group flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/30"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{hub}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Product company jobs · India
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <PublicFooter />
    </div>
  );
}
