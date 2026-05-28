import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Sparkles, ShieldCheck, Clock3 } from "lucide-react";
import { absoluteUrl } from "@/lib/seo/site";

// DSA Lab v2 is in active authoring. The v1 templated catalog has been
// retired; the v2 bank is being hand-authored, reviewed in the admin
// queue, and promoted to live one batch at a time. This page is the
// public placeholder during the transition.

export const metadata: Metadata = {
  title: "DSA Lab — Hand-Authored Question Bank Coming Soon | ProdMatch.ai",
  description:
    "The ProdMatch DSA Lab is being rebuilt as a hand-authored bank of 800 fresh original questions across pure DSA, AI-applied, and Indian product-domain framings. Your daily question returns once the new bank ships.",
  alternates: { canonical: "/dsa" },
  openGraph: {
    title: "DSA Lab — Hand-Authored Question Bank Coming Soon",
    description: "Fresh original DSA questions, no templates, no copies. Coming soon.",
    url: absoluteUrl("/dsa"),
  },
};

export const dynamic = "force-static";

export default function DsaTransitionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:py-14">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              DSA Lab · v2 in progress
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              We&apos;re rebuilding the DSA Lab from scratch.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The old templated catalog is gone. In its place we&apos;re hand-authoring 800 original questions —
              fresh framings, full Python / Java / C++ solutions, and a progressive reveal experience designed for
              India&apos;s top product interviews. Every question is reviewed manually before it goes live.
            </p>
          </div>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Tile
          icon={<Sparkles className="h-4 w-4" />}
          title="800 questions"
          body="85% pure DSA · 10% AI-applied · 5% Indian product domain. Fresh original framings only."
        />
        <Tile
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Every question reviewed"
          body="Nothing reaches you until it passes manual review in the admin queue. Quality over volume."
        />
        <Tile
          icon={<Clock3 className="h-4 w-4" />}
          title="90-day no-repeat"
          body="Your daily picks won't recycle for three months once the new bank is live."
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">What you can do today</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The matching engine and resume tools remain fully live. Use them to lock down your target roles while the
          DSA bank ships.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/matches"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            See today&apos;s matches
          </Link>
          <Link
            href="/profile/resume"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold transition hover:bg-secondary/50"
          >
            Tune your resume
          </Link>
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        We&apos;ll email you the moment the first batch goes live. No filler — only fully reviewed questions.
      </p>
    </div>
  );
}

function Tile({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
