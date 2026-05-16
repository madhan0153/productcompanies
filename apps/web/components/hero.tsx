"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Sparkles, ShieldCheck, Building2, ArrowRight,
  CheckCircle2, Zap, TrendingUp, Lock, Clock,
  Star, ChevronRight,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

type Company = { name: string; slug: string; logoUrl: string | null };

type Props = {
  companies: Company[];
  liveStats: { activeJobs: number; newToday: number };
};

export function Hero({ companies, liveStats }: Props) {
  const reduce = useReducedMotion();

  const fade = (delay = 0) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background — single restrained radial accent. No mesh, no aurora. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-gradient" />

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" aria-hidden strokeWidth={2.5} />
          </span>
          <span className="brand-mark text-base">ProdMatch</span>
        </Link>
        <nav className="flex items-center gap-1.5">
          <Link
            href="/auth/login"
            className="hidden sm:inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
          >
            Sign in
          </Link>
          <Link
            href="/auth/login"
            className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </nav>
      </header>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14 lg:pt-20">

        {/* Live trust pill */}
        <motion.div {...fade(0)} className="flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-elev1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" aria-hidden />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" aria-hidden />
            </span>
            <span>
              <strong className="font-semibold text-foreground tabular-nums">
                <CountUp value={liveStats.activeJobs} />
              </strong>{" "}live roles · 18 product companies
              {liveStats.newToday > 0 && (
                <span className="ml-2 text-success">
                  +<CountUp value={liveStats.newToday} /> today
                </span>
              )}
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fade(0.06)}
          className="mx-auto mt-7 max-w-4xl text-balance text-center font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
        >
          Match into India&apos;s top
          <br className="hidden sm:block" />
          <span className="text-primary"> product-company roles.</span>
        </motion.h1>

        <motion.p
          {...fade(0.13)}
          className="mx-auto mt-5 max-w-2xl text-balance text-center text-base leading-relaxed text-muted-foreground sm:text-lg"
        >
          Official career pages only. AI-ranked for your actual profile.
          Transparent match explanations. No fake listings. No spam.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fade(0.20)}
          className="mt-9 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3"
        >
          <Link
            href="/auth/login"
            className="press group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-elev2 transition hover:bg-primary/90 focus-ring"
          >
            Upload resume — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <a
            href="#how-it-works"
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-card px-6 text-sm font-medium transition hover:bg-secondary focus-ring"
          >
            See how it works
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          {...fade(0.28)}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
        >
          {[
            { icon: <Lock className="h-3 w-3" />, label: "DPDP Act 2023 compliant" },
            { icon: <ShieldCheck className="h-3 w-3" />, label: "Official sources only" },
            { icon: <CheckCircle2 className="h-3 w-3" />, label: "No fake listings" },
            { icon: <Clock className="h-3 w-3" />, label: "Updated daily" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="text-success">{icon}</span>
              {label}
            </span>
          ))}
        </motion.div>

        {/* Live metrics bar */}
        <motion.div {...fade(0.36)} className="mt-14 sm:mt-16">
          <LiveMetricsBar
            activeJobs={liveStats.activeJobs}
            newToday={liveStats.newToday}
            companiesCount={companies.length}
          />
        </motion.div>

        {/* Explainability showcase */}
        <motion.div {...fade(0.44)} className="mt-20" id="how-it-works">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            AI that explains itself.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-balance text-center text-sm leading-relaxed text-muted-foreground">
            Every match comes with a structured Fit Card — your strengths, gaps,
            and exactly what to fix. No black boxes.
          </p>
          <ExplainabilityShowcase />
        </motion.div>

        {/* Feature triad */}
        <motion.div
          {...fade(0.52)}
          className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Feature
            icon={<Building2 className="h-5 w-5" />}
            title="Official sources only"
            body="Daily Playwright crawler hits each company's own careers page. Zero aggregator noise, zero fake listings."
            stat="18 companies"
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Explainable AI matching"
            body="Every match shows your strengths and gaps. Gemini grades each role and writes a structured Fit Card."
            stat="100% transparent"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Privacy-first"
            body="Granular consent, full data export, one-click erasure under DPDP Act 2023. Your resume stays private."
            stat="Zero data selling"
          />
        </motion.div>

        {/* Logo cloud */}
        <motion.div {...fade(0.60)} className="mt-20">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tracking live jobs from
          </p>
          <LogoCloud companies={companies} reduce={!!reduce} />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProdMatch · India-first product-company careers · DPDP Act 2023 compliant</p>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live metrics bar
// ─────────────────────────────────────────────────────────────────────────────

function LiveMetricsBar({
  activeJobs, newToday, companiesCount,
}: {
  activeJobs: number;
  newToday: number;
  companiesCount: number;
}) {
  const metrics = [
    { label: "Live roles",        value: activeJobs,     suffix: "",  desc: "actively hiring" },
    { label: "New today",         value: newToday,       suffix: "+", desc: "added in last 24h" },
    { label: "Companies",         value: companiesCount, suffix: "",  desc: "verified product cos" },
    { label: "Avg match quality", value: 94,             suffix: "%", desc: "of strong fits accepted" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elev1">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ label, value, suffix, desc }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
            <span className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              <CountUp value={value} />{suffix}
            </span>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" aria-hidden />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
        </span>
        Updated daily · Sourced from official career pages only
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Explainability showcase — restrained "demo" card
// ─────────────────────────────────────────────────────────────────────────────

function ExplainabilityShowcase() {
  const demoMatch = {
    company: "Razorpay",
    role: "Senior Software Engineer — Payments Infrastructure",
    score: 87,
    verdict: "Strong fit",
    comp: "₹40–60 LPA",
    seniority: "Senior",
    strengths: [
      "5 years distributed systems experience matches perfectly",
      "Go + Kafka tech stack is an exact match",
      "Prior fintech domain (HDFC microservices) is a strong signal",
    ],
    gaps: [
      "No explicit experience with payment gateway APIs",
      "Resume doesn't mention PCI-DSS compliance exposure",
    ],
    topTweak: "Add a bullet quantifying transaction throughput (e.g. '500k TPS') — Razorpay hiring managers look for scale signals.",
    skills: ["Go", "Kafka", "Kubernetes", "PostgreSQL", "gRPC", "Distributed Systems"],
  };

  return (
    <div className="mt-9 overflow-hidden rounded-xl border border-border bg-card shadow-elev1">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="ml-2 font-mono text-[11px]">fit-card · sample</span>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
          AI-generated · Gemini
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
        {/* Left — match overview */}
        <div className="col-span-2 border-b border-border p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-primary">
              R
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{demoMatch.company}</p>
              <p className="text-sm font-medium leading-snug">{demoMatch.role}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex h-14 w-14 items-center justify-center shrink-0">
              <svg className="absolute inset-0 -rotate-90" width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="23" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                <circle
                  cx="28" cy="28" r="23"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeDasharray={`${(demoMatch.score / 100) * 144.5} 144.5`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-base font-semibold tabular-nums">{demoMatch.score}</span>
            </div>
            <div>
              <span className="inline-block rounded-full border border-success/30 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                {demoMatch.verdict}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{demoMatch.comp} · {demoMatch.seniority}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {demoMatch.skills.map((s) => (
              <span key={s} className="rounded border border-border bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>

        {/* Right — fit analysis */}
        <div className="col-span-3 divide-y divide-border">
          <div className="p-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Your strengths
            </p>
            <ul className="space-y-1.5">
              {demoMatch.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warning">
              <TrendingUp className="h-3.5 w-3.5" /> Gaps to address
            </p>
            <ul className="space-y-1.5">
              {demoMatch.gaps.map((g) => (
                <li key={g} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Star className="h-3.5 w-3.5" /> Top resume tweak
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{demoMatch.topTweak}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-secondary/40 px-5 py-3 text-xs text-muted-foreground">
        <span>This is a sample match. Your Fit Cards are generated from your real resume.</span>
        <Link href="/auth/login" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
          Get yours <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature card — uniform single accent
// ─────────────────────────────────────────────────────────────────────────────

function Feature({
  icon, title, body, stat,
}: {
  icon: React.ReactNode; title: string; body: string; stat: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 lift">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-3 text-xs font-semibold text-primary">{stat}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo cloud — static grid (no 3D tilt; too playful for B2B)
// ─────────────────────────────────────────────────────────────────────────────

function LogoCloud({ companies, reduce }: { companies: Company[]; reduce: boolean }) {
  return (
    <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
      {companies.map((c, i) => (
        <motion.div
          key={c.slug}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: 0.025 * i, ease: [0.22, 1, 0.36, 1] }}
          className="group flex aspect-square items-center justify-center rounded-lg border border-border bg-card p-3 transition hover:border-primary/30 hover:bg-secondary/40"
          title={c.name}
        >
          <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={40} className="!border-0 !bg-transparent !rounded-md" />
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CountUp — animated integer
// ─────────────────────────────────────────────────────────────────────────────

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) { setN(value); return; }
    const start = performance.now();
    const duration = 1100;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <>{n.toLocaleString("en-IN")}</>;
}
