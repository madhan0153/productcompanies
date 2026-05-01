"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  motion, useReducedMotion,
  useMotionValue, useSpring, useTransform,
} from "framer-motion";
import { Sparkles, ShieldCheck, Building2, ArrowRight } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

type Company = { name: string; slug: string; logoUrl: string | null };

type Props = {
  companies: Company[];
  liveStats: { activeJobs: number; newToday: number };
};

export function Hero({ companies, liveStats }: Props) {
  const reduce = useReducedMotion();

  const fade = (delay = 0) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Layered background — drifting mesh + soft vignette */}
      <div aria-hidden className="absolute inset-0 gradient-mesh gradient-mesh-anim" />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background pointer-events-none" />

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <span className="font-display text-lg font-bold gradient-text">ProdMatch.ai</span>
        <nav className="flex items-center gap-1">
          <Link
            href="/auth/login"
            className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition hover:text-foreground focus-ring"
          >
            Sign in
          </Link>
          <Link
            href="/auth/login"
            className="press group inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/30 transition hover:shadow-primary/50 focus-ring"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      <div className="container relative z-10 mx-auto px-4 pb-24 pt-12 lg:pt-20">
        {/* Live signal pill */}
        <motion.div
          {...fade(0)}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" aria-hidden />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
          </span>
          <span>
            <strong className="font-semibold text-foreground tabular-nums">
              <CountUp value={liveStats.activeJobs} />
            </strong>{" "}
            live roles
            {liveStats.newToday > 0 && (
              <>
                {" · "}
                <span className="text-emerald-400">+<CountUp value={liveStats.newToday} /> today</span>
              </>
            )}
          </span>
        </motion.div>

        <motion.h1
          {...fade(0.06)}
          className="mt-6 text-balance text-center font-display text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl"
        >
          Match into India&apos;s
          <br />
          <span className="gradient-text">top product companies.</span>
        </motion.h1>

        <motion.p
          {...fade(0.14)}
          className="mx-auto mt-6 max-w-2xl text-balance text-center text-lg text-muted-foreground"
        >
          Upload your resume once. Get explainable, ranked matches to high-package roles —
          sourced only from official career pages of 18 global product companies.
        </motion.p>

        <motion.div
          {...fade(0.22)}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/auth/login"
            className="press group relative inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-primary/50 focus-ring"
          >
            <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary via-glow to-primary opacity-0 transition group-hover:opacity-30" aria-hidden />
            <span className="relative">Get started — it&apos;s free</span>
            <ArrowRight className="relative h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#how-it-works"
            className="press inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-6 py-3.5 text-sm font-medium backdrop-blur transition hover:bg-card focus-ring"
          >
            How it works
          </a>
        </motion.div>

        {/* Feature triad */}
        <motion.div
          {...fade(0.30)}
          className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3"
          id="how-it-works"
        >
          <Feature
            icon={<Building2 className="h-5 w-5" />}
            tone="primary"
            title="Official sources only"
            body="Daily crawl of each company's own careers page. Zero aggregator noise."
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            tone="warm"
            title="Explainable matches"
            body="Every match shows your strengths and gaps. Never an opaque score."
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="cool"
            title="Privacy-first"
            body="Granular consent, full export, one-click erasure under DPDP Act 2023."
          />
        </motion.div>

        {/* Logo cloud */}
        <motion.div {...fade(0.42)} className="mt-24">
          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Tracking these companies live
          </p>
          <LogoCloud companies={companies} reduce={!!reduce} />
        </motion.div>
      </div>
    </section>
  );
}

function Feature({
  icon, title, body, tone,
}: {
  icon: React.ReactNode; title: string; body: string;
  tone: "primary" | "warm" | "cool";
}) {
  const tint =
    tone === "primary" ? "bg-primary/10 text-primary group-hover:bg-primary/20" :
    tone === "warm"    ? "bg-warm/10 text-warm group-hover:bg-warm/20" :
                         "bg-cool/10 text-cool group-hover:bg-cool/20";
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card/50 p-5 backdrop-blur lift">
      <div aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/10" />
      <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-lg transition ${tint}`}>
        {icon}
      </div>
      <h3 className="relative mt-3 text-sm font-semibold">{title}</h3>
      <p className="relative mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

// ── Logo cloud with mouse-parallax tilt ──────────────────────────────────────

function LogoCloud({ companies, reduce }: { companies: Company[]; reduce: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-1, 1], [4, -4]), { stiffness: 80, damping: 18 });
  const ry = useSpring(useTransform(mx, [-1, 1], [-4, 4]), { stiffness: 80, damping: 18 });

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reduce) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(x * 2);
    my.set(y * 2);
  }

  function onLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1200 }}
      className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9"
    >
      {companies.map((c, i) => (
        <motion.div
          key={c.slug}
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.4, delay: 0.02 * i, ease: [0.22, 1, 0.36, 1] }}
          className="group flex aspect-square items-center justify-center rounded-2xl border border-border bg-card/40 p-3 backdrop-blur lift"
          title={c.name}
        >
          <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={48} className="!border-0 !bg-transparent !rounded-md" />
        </motion.div>
      ))}
    </motion.div>
  );
}

// ── Count-up — animates a number on mount, respects reduced motion ───────────

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
      const eased = 1 - Math.pow(1 - t, 3);
      setN(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <>{n.toLocaleString("en-IN")}</>;
}
