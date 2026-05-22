import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Engineering Roles at Product Companies in India",
  description:
    "Browse open roles by function — backend, frontend, full-stack, data, ML, DevOps, mobile, security, design, product management — across 18 product companies in India.",
  alternates: { canonical: "/roles" },
  openGraph: {
    title: "Engineering Roles at Product Companies in India",
    url: absoluteUrl("/roles"),
  },
};

export default function RolesIndexPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Roles", path: "/roles" },
      ])} />
      <JsonLd data={itemListJsonLd(PUBLIC_ROLES.map((r) => ({
        name: `${r.plural} jobs`,
        path: `/roles/${r.slug}`,
      })))} />

      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Briefcase className="h-3.5 w-3.5" />
            Engineering roles
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Jobs by role at India&apos;s product companies
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Find open roles by function at the 18 product companies ProdMatch
            tracks. Each role page lists open positions across all companies
            and cities, refreshed daily from official career pages.
          </p>
        </header>

        <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PUBLIC_ROLES.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/roles/${r.slug}`}
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/30"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Briefcase className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.plural}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">at product companies in India</p>
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
