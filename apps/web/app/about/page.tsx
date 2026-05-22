import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Zap, MapPin, Sparkles } from "lucide-react";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "About ProdMatch.ai — India's product-company job engine",
  description:
    "ProdMatch.ai matches Indian engineers to high-package roles at 18 verified product companies. AI-explainable matches sourced from official career pages only. DPDP Act 2023 compliant.",
  alternates: { canonical: "/about" },
  openGraph: { title: "About ProdMatch.ai", url: absoluteUrl("/about") },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ])} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            About ProdMatch
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            ProdMatch.ai exists for one user: the Indian software engineer who
            wants to break into — or grow inside — a high-quality product
            company, and is tired of sifting through aggregator job-boards
            full of irrelevant service-company listings.
          </p>
        </header>

        <section className="mt-8 space-y-6">
          <Section title="Why we exist" icon={<Zap className="h-5 w-5" />}>
            India has the largest engineering talent pool in the world, but
            the bridge from IT-services / freshers / mid-career engineers to
            top product companies (Google, Microsoft, Razorpay, Swiggy,
            Zerodha, PhonePe, and 12 more) is murky and informal. ProdMatch
            cuts that murk with two things: a daily crawl of the 18
            companies&apos; official career pages, and an AI that explains
            <em> why </em> a role matches your resume — strengths, gaps,
            calibrated fit score.
          </Section>

          <Section title="What we won't do" icon={<ShieldCheck className="h-5 w-5" />}>
            We never sell your data. We never host applications (every role
            links to the company&apos;s own apply URL). We never list
            service-company or staffing-agency roles. We never charge for
            matches.
          </Section>

          <Section title="How the matching works" icon={<Sparkles className="h-5 w-5" />}>
            On sign-up, upload your resume. ProdMatch parses it into
            structured signals (role function, years, tech stack, projects,
            product-company readiness) and ranks every active role across
            the 18 companies. Each match comes with a Fit Card: strengths,
            gaps, comp band, and a calibrated score you can interrogate.
          </Section>

          <Section title="Built in India, for India" icon={<MapPin className="h-5 w-5" />}>
            Compensation in LPA. Hubs in Bengaluru, Hyderabad, Pune,
            Gurugram, Noida, Delhi NCR, Mumbai, Chennai, and Remote-India.
            DPDP Act 2023 compliance from day one — per-purpose granular
            consent, full data export, one-click erasure, append-only
            audit log.
          </Section>
        </section>

        <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-base font-semibold">Contact + grievance</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            For privacy or grievance queries under the Digital Personal Data
            Protection Act 2023, contact{" "}
            <a href="mailto:grievance@prodmatch.ai" className="text-primary hover:underline">
              grievance@prodmatch.ai
            </a>.
            For everything else:{" "}
            <a href="mailto:hello@prodmatch.ai" className="text-primary hover:underline">
              hello@prodmatch.ai
            </a>.
          </p>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Want to see how ProdMatch ranks <em>your</em> resume?{" "}
          <Link href="/auth/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>{" "}
          — free, no credit card.
        </p>
      </main>

      <PublicFooter />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{children}</p>
    </article>
  );
}
