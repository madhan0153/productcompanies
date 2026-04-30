"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles, ShieldCheck, Building2 } from "lucide-react";

const COMPANIES = [
  "Google", "Microsoft", "Meta", "Amazon", "Apple", "Atlassian", "Nvidia",
  "Oracle", "Salesforce", "SAP Labs", "Razorpay", "PhonePe", "Zerodha",
  "CRED", "Groww", "Swiggy", "Zomato", "Flipkart",
];

export function Hero() {
  const reduce = useReducedMotion();

  const fade = (delay = 0) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative min-h-screen overflow-hidden gradient-mesh">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background pointer-events-none" />

      <div className="container relative mx-auto px-4 py-20 lg:py-32">
        <motion.div
          {...fade(0)}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>India-first · DPDP Act 2023 compliant</span>
        </motion.div>

        <motion.h1
          {...fade(0.08)}
          className="mt-6 text-balance text-center text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Match into India&apos;s
          <br />
          <span className="bg-gradient-to-r from-primary via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">
            top product companies.
          </span>
        </motion.h1>

        <motion.p
          {...fade(0.16)}
          className="mx-auto mt-6 max-w-2xl text-center text-lg text-muted-foreground"
        >
          Upload your resume once. Get explainable, ranked matches to high-package roles —
          sourced only from official career pages of 18 global product companies.
        </motion.p>

        <motion.div
          {...fade(0.24)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/auth/login"
            className="group relative inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98]"
          >
            Get started — it&apos;s free
            <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
          </Link>
          <a href="#how-it-works" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/50 px-6 py-3 text-sm font-medium backdrop-blur transition hover:bg-card">
            How it works
          </a>
        </motion.div>

        <motion.div
          {...fade(0.32)}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Feature icon={<Building2 className="h-5 w-5" />} title="Official sources only" body="Jobs scraped daily from each company's own careers page. No aggregators." />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="Explainable matches" body="Every match shows your strengths and gaps. No opaque scores." />
          <Feature icon={<ShieldCheck className="h-5 w-5" />} title="Privacy-first" body="Granular consent, full export, and one-click erasure under DPDP Act 2023." />
        </motion.div>

        <motion.div {...fade(0.4)} className="mt-20">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            Tracking 18 product companies hiring in India
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground/80">
            {COMPANIES.map((c) => (
              <span key={c} className="transition hover:text-foreground">{c}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="group relative rounded-2xl border border-border bg-card/40 p-5 backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/60">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
