import type { Metadata } from "next";
import { JsonLd, breadcrumbJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";
import { PublicNav } from "@/components/public-nav";
import { PublicFooter } from "@/components/public-footer";

export const metadata: Metadata = {
  title: "Terms of Service — ProdMatch",
  description: "ProdMatch.ai terms of service. Free service, India jurisdiction, no warranty on job availability.",
  alternates: { canonical: "/terms" },
  openGraph: { title: "Terms of Service — ProdMatch", url: absoluteUrl("/terms") },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <JsonLd data={breadcrumbJsonLd([
        { name: "Home", path: "/" },
        { name: "Terms", path: "/terms" },
      ])} />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: 1 May 2026</p>

        <section className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <Section title="1. The service">
            ProdMatch.ai (&quot;ProdMatch&quot;) provides AI-ranked job matches
            for software roles at 18 verified Indian product companies.
            The service is free for personal use.
          </Section>

          <Section title="2. Job data accuracy">
            We source listings directly from each company&apos;s official
            career page and refresh every 24 hours. Listings can change
            without notice — confirm role availability on the company&apos;s
            site before applying. ProdMatch does not guarantee any role is
            still open, nor does it offer any guarantee of selection.
          </Section>

          <Section title="3. Your responsibilities">
            <ul className="ml-4 list-disc space-y-1">
              <li>Upload only your own resume. Don&apos;t impersonate.</li>
              <li>Don&apos;t scrape or stress-test the service. Rate limits apply.</li>
              <li>Don&apos;t use the matches for any unlawful purpose.</li>
            </ul>
          </Section>

          <Section title="4. Application flow">
            Every job page links to the company&apos;s own application URL.
            ProdMatch never hosts applications and never collects fees of
            any kind from candidates.
          </Section>

          <Section title="5. Account termination">
            We may suspend or remove accounts that violate these terms. You
            may delete your account at any time via{" "}
            <a className="text-primary hover:underline" href="/settings/privacy">Settings → Privacy</a>;
            erasure completes within 7 working days.
          </Section>

          <Section title="6. Liability">
            The service is provided &quot;as is&quot;, without warranty of
            merchantability or fitness for a particular purpose. ProdMatch
            is not liable for indirect or consequential damages, including
            lost employment opportunities.
          </Section>

          <Section title="7. Jurisdiction">
            These terms are governed by the laws of India. Disputes are
            subject to the courts of Bengaluru, Karnataka.
          </Section>

          <Section title="8. Contact">
            <p>
              Email{" "}
              <a className="text-primary hover:underline" href="mailto:hello@prodmatch.ai">
                hello@prodmatch.ai
              </a>
              {" "}with any questions.
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
