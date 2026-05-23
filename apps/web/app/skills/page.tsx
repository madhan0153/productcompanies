import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import { JsonLd, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_SKILLS } from "@/lib/seo/skills";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Tech Skill Jobs at India's Product Companies — AWS, React, Java, Python",
  description: "Open engineering roles by skill at India's 51 product companies — AWS, Python, Java, Go, React, TypeScript, Kubernetes, Spark, PyTorch and more. Refreshed daily from official career pages.",
  alternates: { canonical: "/skills" },
  openGraph: { title: "Tech skill jobs at India's product companies", url: absoluteUrl("/skills") },
};

export default function SkillsIndexPage() {
  const byCategory = PUBLIC_SKILLS.reduce<Record<string, typeof PUBLIC_SKILLS[number][]>>(
    (acc, s) => {
      (acc[s.category] ??= []).push(s);
      return acc;
    },
    {},
  );
  const categoryOrder = ["Cloud", "Language", "Framework", "Database", "Infra", "Data", "ML", "Mobile", "Tooling"];

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Skills", path: "/skills" },
      ])} />
      <JsonLd data={itemListJsonLd(PUBLIC_SKILLS.map((s) => ({
        name: `${s.name} jobs at product companies in India`,
        path: `/skills/${s.slug}`,
      })))} />

      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <Cpu className="h-3.5 w-3.5" />
            By tech stack
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Jobs by tech skill at India&apos;s product companies
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Open engineering roles indexed by required tech skill across
            India&apos;s 51 product companies. Find {PUBLIC_SKILLS[0]!.name},{" "}
            {PUBLIC_SKILLS[1]!.name}, {PUBLIC_SKILLS[2]!.name} and 30+ other
            skills tagged across the live JD inventory, refreshed daily.
          </p>
        </header>

        <div className="mt-10 space-y-8">
          {categoryOrder
            .filter((c) => byCategory[c]?.length)
            .map((category) => (
              <section key={category}>
                <h2 className="text-lg font-semibold sm:text-xl">{category}</h2>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {byCategory[category]!.map((s) => (
                    <li key={s.slug}>
                      <Link
                        href={`/skills/${s.slug}`}
                        className="flex min-h-12 items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm transition hover:bg-secondary/40"
                      >
                        <span className="min-w-0 truncate font-medium">{s.name}</span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
