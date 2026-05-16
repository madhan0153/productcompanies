"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion, useReducedMotion,
  useMotionValue, useSpring, useTransform,
} from "framer-motion";
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
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[600px] rounded-full bg-fuchsia-500/5 blur-[100px]" />
        <div className="absolute left-0 bottom-1/4 h-[300px] w-[500px] rounded-full bg-emerald-500/5 blur-[80px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
            <Zap className="h-4 w-4 text-primary" aria-hidden />
          </div>
          <span className="font-display text-lg font-bold tracking-tight gradient-text">ProdMatch.ai</span>
        </div>
        <nav className="flex items-center gap-1.5">
          <Link
            href="/auth/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-ring"
          >
            Sign in
          </Link>
          <Link
            href="/auth/login"
            className="press group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:shadow-primary/40 focus-ring"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      {/* Hero content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-12 lg:pt-20">

        {/* Live trust pill */}
        <motion.div {...fade(0)} className="flex justify-center">
          <div className="inline-flex items-center gap-2.5 rounded-full border border-border/60 bg-card/70 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" aria-hidden />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
            </span>
            <span>
              <strong className="font-semibold text-foreground tabular-nums">
                <CountUp value={liveStats.activeJobs} />
              </strong>{" "}live roles across 18 product companies
              {liveStats.newToday > 0 && (
                <span className="ml-2 text-emerald-400">
                  +<CountUp value={liveStats.newToday} /> today
                </span>
              )}
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          {...fade(0.07)}
          className="mx-auto mt-8 max-w-4xl text-balance text-center font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Get matched to India&apos;s top
          <br />
          <span className="gradient-text">product-company roles.</span>
        </motion.h1>

        <motion.p
          {...fade(0.15)}
          className="mx-auto mt-6 max-w-2xl text-balance text-center text-lg leading-relaxed text-muted-foreground"
        >
          Official career pages only. AI-ranked for your actual profile.
          Transparent match explanations. No fake listings. No spam.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fade(0.22)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/auth/login"
            className="press group relative inline-flex items-center gap-2.5 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-xl shadow-primary/25 transition hover:shadow-primary/40 focus-ring"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-fuchsia-500/50 to-primary opacity-0 transition group-hover:opacity-20" aria-hidden />
            <span className="relative">Upload Resume — Free</span>
            <ArrowRight className="relative h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how-it-works"
            className="press inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3.5 text-sm font-medium backdrop-blur transition hover:bg-card/90 focus-ring"
          >
            See live matches
          </a>
        </motion.div>

        {/* Trust badges */}
        <motion.div
          {...fade(0.30)}
          className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground"
        >
          {[
            { icon: <Lock className="h-3 w-3" />, label: "DPDP Act 2023 compliant" },
            { icon: <ShieldCheck className="h-3 w-3" />, label: "Official sources only" },
            { icon: <CheckCircle2 className="h-3 w-3" />, label: "No fake listings" },
            { icon: <Clock className="h-3 w-3" />, label: "Updated daily" },
          ].map(({ icon, label }) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="text-emerald-400">{icon}</span>
              {label}
            </span>
          ))}
        </motion.div>

        {/* Live metrics bar */}
        <motion.div {...fade(0.38)} className="mt-16">
          <LiveMetricsBar
            activeJobs={liveStats.activeJobs}
            newToday={liveStats.newToday}
            companiesCount={companies.length}
          />
        </motion.div>

        {/* Explainability showcase */}
        <motion.div {...fade(0.46)} className="mt-20" id="how-it-works">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-center font-display text-3xl font-bold tracking-tight">
            AI that explains itself
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-sm text-muted-foreground">
            Every match comes with a structured Fit Card — your strengths, gaps, and exactly what to fix.
            No black boxes.
          </p>
          <ExplainabilityShowcase />
        </motion.div>

        {/* Feature triad */}
        <motion.div
          {...fade(0.54)}
          className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3"
        >
          <Feature
            icon={<Building2 className="h-5 w-5" />}
            tone="primary"
            title="Official sources only"
            body="Daily Playwright crawler hits each company's own careers page. Zero aggregator noise, zero fake listings."
            stat="18 companies"
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            tone="warm"
            title="Explainable AI matching"
            body="Every match shows your strengths and gaps. Gemini grades each role and writes a structured Fit Card."
            stat="100% transparent"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="cool"
            title="Privacy-first"
            body="Granular consent, full data export, one-click erasure under DPDP Act 2023. Your resume stays private."
            stat="Zero data selling"
          />
        </motion.div>

        {/* Logo cloud */}
        <motion.div {...fade(0.62)} className="mt-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Tracking live jobs from
          </p>
          <LogoCloud companies={companies} reduce={!!reduce} />
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-muted-foreground">
        <p>© {new Date().getFullYear()} ProdMatch.ai · India-first product-company careers · DPDP Act 2023 compliant</p>
      </footer>
    </div>
  );
}

// ── Live Metrics Bar ──────────────────────────────────────────────────────────

function LiveMetricsBar({
  activeJobs, newToday, companiesCount,
}: {
  activeJobs: number;
  newToday: number;
  companiesCount: number;
}) {
  const metrics = [
    { label: "Live roles", value: activeJobs, suffix: "", color: "text-primary", desc: "actively hiring" },
    { label: "New today", value: newToday, suffix: "+", color: "text-emerald-400", desc: "added in last 24h" },
    { label: "Companies", value: companiesCount, suffix: "", color: "text-amber-400", desc: "verified product cos" },
    { label: "Avg match quality", value: 94, suffix: "%", color: "text-violet-400", desc: "of strong fits accepted" },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 backdrop-blur">
      <div className="grid grid-cols-2 divide-x divide-y divide-border/40 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ label, value, suffix, color, desc }) => (
          <div key={label} className="flex flex-col items-center gap-1 p-6 text-center">
            <span className={`font-display text-3xl font-bold tabular-nums tracking-tight ${color}`}>
              <CountUp value={value} />{suffix}
            </span>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-border/40 bg-secondary/20 px-6 py-2.5 text-xs text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" aria-hidden />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
        </span>
        Updated daily at 02:00 IST · Sourced from official career pages only
      </div>
    </div>
  );
}

// ── Explainability Showcase ───────────────────────────────────────────────────

function ExplainabilityShowcase() {
  const demoMatch = {
    company: "Razorpay",
    role: "Senior Software Engineer — Payments Infrastructure",
    score: 87,
    verdict: "Strong fit",
    verdictColor: "text-emerald-400 border-emerald-400/30 bg-emerald-400/8",
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
    <div className="mt-10 overflow-hidden rounded-2xl border border-border/60 bg-card/30 backdrop-blur">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-2 font-mono">fit-card · sample</span>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-[11px] font-medium text-primary">
          AI-generated · Gemini 2.0
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
        {/* Left — Match overview */}
        <div className="col-span-2 border-b border-border/40 p-6 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/60 text-lg font-bold text-primary">
              R
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{demoMatch.company}</p>
              <p className="font-medium leading-snug">{demoMatch.role}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex h-16 w-16 items-center justify-center shrink-0">
              <svg className="absolute inset-0 -rotate-90" width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--border))" strokeWidth="5" />
                <circle
                  cx="32" cy="32" r="26"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="5"
                  strokeDasharray={`${(demoMatch.score / 100) * 163.4} 163.4`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-lg font-bold tabular-nums">{demoMatch.score}</span>
            </div>
            <div>
              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${demoMatch.verdictColor}`}>
                {demoMatch.verdict}
              </span>
              <p className="mt-1 text-xs text-muted-foreground">{demoMatch.comp} · {demoMatch.seniority}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {demoMatch.skills.map((s) => (
              <span key={s} className="rounded-md bg-secondary/60 px-2 py-0.5 text-[11px] text-muted-foreground">{s}</span>
            ))}
          </div>
        </div>

        {/* Right — Fit analysis */}
        <div className="col-span-3 space-y-0 divide-y divide-border/40">
          <div className="p-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Your strengths
            </p>
            <ul className="space-y-1.5">
              {demoMatch.strengths.map((s) => (
                <li key={s} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5">
            <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400">
              <TrendingUp className="h-3.5 w-3.5" /> Gaps to address
            </p>
            <ul className="space-y-1.5">
              {demoMatch.gaps.map((g) => (
                <li key={g} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                  {g}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <Star className="h-3.5 w-3.5" /> Top resume tweak
            </p>
            <p className="text-sm text-muted-foreground">{demoMatch.topTweak}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border/40 bg-secondary/10 px-6 py-3 text-xs text-muted-foreground">
        <span>This is a sample match. Your actual Fit Cards are generated from your real resume.</span>
        <Link href="/auth/login" className="inline-flex items-center gap-1 text-primary hover:underline">
          Get yours <ChevronRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function Feature({
  icon, title, body, tone, stat,
}: {
  icon: React.ReactNode; title: string; body: string;
  tone: "primary" | "warm" | "cool"; stat: string;
}) {
  const tint =
    tone === "primary" ? "bg-primary/10 text-primary group-hover:bg-primary/20" :
    tone === "warm"    ? "bg-warm/10 text-warm group-hover:bg-warm/20" :
                         "bg-cool/10 text-cool group-hover:bg-cool/20";
  const statColor =
    tone === "primary" ? "text-primary" :
    tone === "warm"    ? "text-amber-400" :
                         "text-emerald-400";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6 backdrop-blur lift">
      <div aria-hidden className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <div className={`relative mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl transition ${tint}`}>
        {icon}
      </div>
      <h3 className="relative text-sm font-semibold">{title}</h3>
      <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className={`relative mt-3 text-xs font-semibold ${statColor}`}>{stat}</p>
    </div>
  );
}

// ── Logo cloud ────────────────────────────────────────────────────────────────

function LogoCloud({ companies, reduce }: { companies: Company[]; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [3, -3]), { stiffness: 80, damping: 20 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-3, 3]), { stiffness: 80, damping: 20 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(((e.clientX - rect.left) / rect.width - 0.5) * 2);
    my.set(((e.clientY - rect.top) / rect.height - 0.5) * 2);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1200 }}
      className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9"
    >
      {companies.map((c, i) => (
        <motion.div
          key={c.slug}
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.03 * i, ease: [0.22, 1, 0.36, 1] }}
          className="group flex aspect-square items-center justify-center rounded-2xl border border-border/60 bg-card/30 p-3 backdrop-blur transition hover:border-primary/30 hover:bg-card/60"
          title={c.name}
        >
          <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={44} className="!border-0 !bg-transparent !rounded-md" />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Count-up ──────────────────────────────────────────────────────────────────

function CountUp({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) { setN(value); return; }
    const start = performance.now();
    const duration = 1200;
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
