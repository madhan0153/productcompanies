import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Privacy & DPDP — ProdMatch",
  description:
    "How ProdMatch.ai handles your data under India's Digital Personal Data Protection Act 2023. Per-purpose consent, full export, one-click erasure, append-only audit log.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "Privacy & DPDP — ProdMatch", url: absoluteUrl("/privacy") },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Privacy", path: "/privacy" },
      ])} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            DPDP Act 2023 compliant
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Last updated: 1 May 2026. India&apos;s DPDP Act 2023 applies to every interaction.
          </p>
        </header>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="What we collect">
            <ul className="ml-4 list-disc space-y-1">
              <li>Email + display name (account creation).</li>
              <li>Your resume PDF (stored privately in Supabase Storage, owner-RLS).</li>
              <li>Parsed resume fields (role, years, tech stack, projects).</li>
              <li>Compute / browse metadata: matches, applications, DSA progress.</li>
            </ul>
          </Section>

          <Section title="Granular consent">
            We never bundle consents. You pick per-purpose: account, AI
            matching, digest emails, anonymous analytics. You can revoke any
            of them anytime from{" "}
            <Link className="text-primary hover:underline" href="/settings/privacy">Settings → Privacy</Link>.
          </Section>

          <Section title="Your rights">
            <ul className="ml-4 list-disc space-y-1">
              <li><strong>Access</strong> — export every byte we hold about you as a single ZIP.</li>
              <li><strong>Erasure</strong> — one-click deletion of profile, resume, matches. Audit-log entry retained per DPDP §11.</li>
              <li><strong>Correction</strong> — edit your resume + profile at any time.</li>
              <li><strong>Grievance</strong> — written reply within 7 days of request.</li>
            </ul>
          </Section>

          <Section title="What we don't do">
            <ul className="ml-4 list-disc space-y-1">
              <li>We don&apos;t sell your data. Ever.</li>
              <li>We don&apos;t share resumes with the 51 companies we track.</li>
              <li>We don&apos;t use your resume content to train models.</li>
              <li>We don&apos;t log resume text, parsed fields, or auth tokens.</li>
            </ul>
          </Section>

          <Section title="LLM processing">
            Resume parsing + match explanations use third-party LLM providers
            (Google Gemini, Groq, OpenRouter, and others, depending on
            availability). Inference is per-request and ephemeral — providers
            don&apos;t retain your data under our enterprise agreements.
          </Section>

          <Section title="Grievance Officer">
            <p>
              Email{" "}
              <a className="text-primary hover:underline" href="mailto:grievance@prodmatchai.in">
                grievance@prodmatchai.in
              </a>{" "}
              with your concern. We respond within 7 working days.
            </p>
          </Section>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2">{children}</div>
    </article>
  );
}
