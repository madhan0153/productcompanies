"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";
import {
  Sparkles, ShieldCheck, Building2, ArrowRight,
  CheckCircle2, Zap, TrendingUp, Lock, Clock,
  Star, ChevronRight, Menu, X, IndianRupee, MapPin,
  BookOpen, Brain, Scale, Cpu, Layers,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

type Company = { name: string; slug: string; logoUrl: string | null };

type Props = {
  companies: Company[];
  liveStats: { activeJobs: number; newToday: number };
};

// Browse destinations shown both in the mobile drawer and as a desktop card grid.
// Each is a clickable surface that demos depth without forcing sign-up.
const BROWSE: Array<{
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}> = [
  { href: "/companies", label: "All 18 companies", desc: "Browse open roles by company", icon: <Building2 className="h-4 w-4" /> },
  { href: "/cities",    label: "By city",           desc: "Bengaluru, Hyderabad, Pune + 6", icon: <MapPin className="h-4 w-4" /> },
  { href: "/roles",     label: "By role function", desc: "Backend, ML, DevOps, mobile, design", icon: <Layers className="h-4 w-4" /> },
  { href: "/skills",    label: "By tech skill",     desc: "AWS, React, Java, Python, K8s + 27", icon: <Cpu className="h-4 w-4" /> },
  { href: "/salaries",  label: "Salary aggregates", desc: "Live JD-disclosed comp bands", icon: <IndianRupee className="h-4 w-4" /> },
  { href: "/dsa",       label: "DSA practice",      desc: "17 patterns · TS, Python, Java", icon: <Brain className="h-4 w-4" /> },
  { href: "/guides",    label: "Career guides",     desc: "Service-to-product switch & more", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/compare",   label: "vs Naukri / LinkedIn", desc: "Honest side-by-side comparisons", icon: <Scale className="h-4 w-4" /> },
];

export function Hero({ companies, liveStats }: Props) {
  const reduce = useReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock scroll while the drawer is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (menuOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [menuOpen]);

  const fade = (delay = 0) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const inView = (delay = 0) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  // Honest stat — when the crawler hasn't run yet we fall back to a constant
  // truth instead of showing "0 live roles" (which reads broken).
  const showLive = liveStats.activeJobs > 0;
  const liveLabel = showLive
    ? `${liveStats.activeJobs.toLocaleString("en-IN")} live roles · 18 product companies`
    : "Tracking 18 product companies · daily crawl";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient background — single restrained radial accent. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[640px] hero-gradient" />

      {/* ───────────────────────── Top nav ───────────────────────── */}
      <header className="relative z-30 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-md">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" aria-hidden strokeWidth={2.5} />
          </span>
          <span className="brand-mark text-base">ProdMatch</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
          <NavLink href="/companies">Companies</NavLink>
          <NavLink href="/salaries">Salaries</NavLink>
          <NavLink href="/guides">Guides</NavLink>
          <NavLink href="/compare">Compare</NavLink>
          <NavLink href="/dsa">DSA</NavLink>
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/auth/login"
            className="hidden h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            href="/auth/login"
            className="press inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring sm:px-4"
          >
            Get started
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          {/* Mobile menu trigger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring md:hidden"
          >
            <Menu className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <MobileDrawer onClose={() => setMenuOpen(false)} reduce={!!reduce} />
        )}
      </AnimatePresence>

      {/* ───────────────────────── Hero content ───────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:pt-12 sm:pb-20 lg:pt-16">
        {/* Live trust pill */}
        <motion.div {...fade(0)} className="flex justify-center">
          <div className="inline-flex max-w-[92vw] items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs text-muted-foreground shadow-elev1">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" aria-hidden />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" aria-hidden />
            </span>
            <span className="truncate">
              {showLive ? (
                <>
                  <strong className="font-semibold text-foreground tabular-nums">
                    <CountUp value={liveStats.activeJobs} />
                  </strong>{" "}live roles · 18 product companies
                  {liveStats.newToday > 0 && (
                    <span className="ml-2 text-success">+<CountUp value={liveStats.newToday} /> today</span>
                  )}
                </>
              ) : (
                liveLabel
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
          className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
        >
          <Link
            href="/auth/login"
            className="press group inline-flex h-12 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-elev2 transition hover:bg-primary/90 focus-ring"
          >
            Upload resume — free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          <Link
            href="/companies"
            className="press inline-flex h-12 items-center justify-center gap-2 rounded-md border border-border bg-card px-6 text-sm font-medium transition hover:bg-secondary focus-ring"
          >
            Browse 18 companies
          </Link>
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
            companiesCount={companies.length || 18}
          />
        </motion.div>

        {/* ───────────────── Browse section (new) ───────────────── */}
        <motion.section {...inView(0)} id="browse" className="mt-20 sm:mt-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Explore without signing up
          </p>
          <h2 className="mt-3 text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Browse the full inventory.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-balance text-center text-sm leading-relaxed text-muted-foreground">
            Every page is public. Companies, cities, roles, skills, salary
            bands, comparisons, career guides — all crawlable, no sign-up wall.
          </p>
          <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BROWSE.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  className="group flex min-h-20 items-start gap-3 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/30 hover:shadow-elev2 motion-reduce:hover:translate-y-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    {b.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{b.label}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
              </li>
            ))}
          </ul>
        </motion.section>

        {/* ───────────────── Explainability showcase ───────────────── */}
        <motion.section {...inView(0)} className="mt-20 sm:mt-24" id="how-it-works">
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
        </motion.section>

        {/* ───────────────── Feature triad ───────────────── */}
        <motion.div {...inView(0)} className="mx-auto mt-20 grid max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:mt-24">
          <Feature
            icon={<Building2 className="h-5 w-5" />}
            title="Official sources only"
            body="Daily crawler hits each company's own careers page. Zero aggregator noise, zero fake listings."
            stat="18 companies"
          />
          <Feature
            icon={<Sparkles className="h-5 w-5" />}
            title="Explainable AI matching"
            body="Every match shows your strengths and gaps. AI grades each role and writes a structured Fit Card."
            stat="100% transparent"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Privacy-first"
            body="Granular consent, full data export, one-click erasure under DPDP Act 2023. Your resume stays private."
            stat="Zero data selling"
          />
        </motion.div>

        {/* ───────────────── Featured guides ───────────────── */}
        <motion.section {...inView(0)} className="mt-20 sm:mt-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Field guides
          </p>
          <h2 className="mt-3 text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Built on real data.
          </h2>
          <ul className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { href: "/guides/services-to-product-switch", title: "Service to product company switch", read: "11 min" },
              { href: "/guides/how-to-get-product-company-jobs-india", title: "How to land jobs at India's top product companies", read: "9 min" },
              { href: "/guides/freshers-product-company-jobs-india", title: "Freshers playbook for product company jobs", read: "9 min" },
            ].map((g) => (
              <li key={g.href}>
                <Link
                  href={g.href}
                  className="group flex h-full flex-col gap-2 rounded-xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/30 hover:shadow-elev2 motion-reduce:hover:translate-y-0"
                >
                  <BookOpen className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold leading-snug">{g.title}</p>
                  <p className="mt-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {g.read} read
                    <ArrowRight className="ml-auto h-3 w-3 text-primary transition group-hover:translate-x-0.5" />
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-center">
            <Link href="/guides" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">
              All 5 career guides
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </motion.section>

        {/* ───────────────── Compare callout ───────────────── */}
        <motion.section {...inView(0)} className="mt-20 sm:mt-24">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-6 shadow-elev1 sm:p-8">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Scale className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Honest comparisons</p>
                <h2 className="mt-1 font-display text-xl font-semibold tracking-tight sm:text-2xl">
                  Already using Naukri or LinkedIn?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  We won&apos;t claim we&apos;re better at everything. Read side-by-side
                  what each platform is genuinely strong at and where ProdMatch
                  fits in the picture.
                </p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {["naukri", "linkedin", "indeed", "hirist", "instahyre", "cutshort", "glassdoor", "foundit"].map((slug) => (
                    <li key={slug}>
                      <Link
                        href={`/compare/${slug}`}
                        className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-3 text-xs font-medium capitalize transition hover:bg-secondary hover:border-primary/30"
                      >
                        vs {slug}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ───────────────── Logo cloud ───────────────── */}
        <motion.section {...inView(0)} className="mt-20 sm:mt-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Tracking live jobs from
          </p>
          <LogoCloud companies={companies} reduce={!!reduce} />
          <p className="mt-6 text-center">
            <Link href="/companies" className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">
              See open roles at each company
              <ArrowRight className="h-3 w-3" />
            </Link>
          </p>
        </motion.section>

        {/* ───────────────── Final CTA ───────────────── */}
        <motion.section {...inView(0)} className="mt-20 sm:mt-24">
          <div className="mx-auto max-w-2xl rounded-2xl border border-primary/20 bg-primary-soft p-8 text-center shadow-elev1">
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Ready to see your matches?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              Upload your resume. We&apos;ll rank every active role at the 18
              product companies in under 60 seconds, with strengths and gaps
              on every match. Free, no credit card, DPDP-compliant.
            </p>
            <Link
              href="/auth/login"
              className="press group mt-6 inline-flex h-12 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-elev2 transition hover:bg-primary/90 focus-ring"
            >
              Upload resume — free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </div>
        </motion.section>
      </div>

      {/* Mobile sticky bottom CTA — visible only on mobile, fades in on scroll */}
      <MobileStickyCta />

      {/* ───────────────────────── Footer ───────────────────────── */}
      <HomeFooter />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile drawer
// ─────────────────────────────────────────────────────────────────────────────

function MobileDrawer({ onClose, reduce }: { onClose: () => void; reduce: boolean }) {
  return (
    <>
      <motion.div
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden
      />
      <motion.aside
        initial={reduce ? { x: 0, opacity: 1 } : { x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        className="fixed inset-y-0 right-0 z-50 flex w-[88%] max-w-sm flex-col border-l border-border bg-card shadow-pop md:hidden"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <Link href="/" className="flex items-center gap-2 focus-ring rounded-md" onClick={onClose}>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
            </span>
            <span className="brand-mark text-base">ProdMatch</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Mobile menu">
          <ul className="space-y-0.5">
            {BROWSE.map((b) => (
              <li key={b.href}>
                <Link
                  href={b.href}
                  onClick={onClose}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    {b.icon}
                  </span>
                  {b.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border p-3 space-y-2">
          <Link
            href="/auth/login"
            onClick={onClose}
            className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Get started — free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/auth/login"
            onClick={onClose}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-border bg-background text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </motion.aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mobile sticky bottom CTA — fades in after the user scrolls past the hero
// ─────────────────────────────────────────────────────────────────────────────

function MobileStickyCta() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setVisible(y > 560);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md md:hidden"
        >
          <Link
            href="/auth/login"
            className="press flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-elev2 transition hover:bg-primary/90"
          >
            Upload resume — free
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Footer — mirrors PublicFooter structure but inline for the marketing page
// ─────────────────────────────────────────────────────────────────────────────

function HomeFooter() {
  return (
    <footer className="relative z-10 border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <FooterColumn title="Discover" items={[
            ["/companies", "All 18 companies"],
            ["/cities",    "By city"],
            ["/roles",     "By role"],
            ["/skills",    "By skill"],
          ]} />
          <FooterColumn title="Insights" items={[
            ["/salaries",  "Salary aggregates"],
            ["/guides",    "Career guides"],
            ["/compare",   "Compare"],
            ["/dsa/patterns", "DSA patterns"],
          ]} />
          <FooterColumn title="ProdMatch" items={[
            ["/about",     "About"],
            ["/privacy",   "Privacy"],
            ["/terms",     "Terms"],
            ["/auth/login", "Sign in"],
          ]} />
          <FooterColumn title="For AI agents" items={[
            ["/llms.txt",  "llms.txt"],
            ["/llms-full.txt", "llms-full.txt"],
            ["/api/feed/jobs.json", "Jobs JSON feed"],
            ["/sitemap.xml", "Sitemap"],
          ]} />
        </div>
        <p className="mt-8 border-t border-border pt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ProdMatch.ai · Built for India · DPDP Act 2023 compliant ·
          Job data sourced from official company career pages.
        </p>
      </div>
    </footer>
  );
}

function FooterColumn({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {items.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-xs text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
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
  const showLive = activeJobs > 0;
  const metrics = [
    { label: "Live roles",  value: activeJobs,     suffix: "",  desc: "actively hiring",     pendingDesc: "crawler running" },
    { label: "New today",   value: newToday,       suffix: "+", desc: "added in last 24h",   pendingDesc: "next refresh < 24h" },
    { label: "Companies",   value: companiesCount, suffix: "",  desc: "verified product cos", pendingDesc: "verified product cos" },
    { label: "Refresh",     value: 24,             suffix: "h", desc: "official-page crawl",  pendingDesc: "official-page crawl" },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-elev1">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-4 sm:divide-y-0">
        {metrics.map(({ label, value, suffix, desc, pendingDesc }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-4 py-5 text-center">
            <span className="font-display text-3xl font-semibold tabular-nums tracking-tight text-foreground">
              <CountUp value={value} />{suffix}
            </span>
            <span className="text-sm font-medium">{label}</span>
            <span className="text-xs text-muted-foreground">{showLive ? desc : pendingDesc}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 border-t border-border bg-secondary/40 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60 motion-reduce:animate-none" aria-hidden />
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
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-destructive/70" />
          <span className="h-2 w-2 rounded-full bg-warning/70" />
          <span className="h-2 w-2 rounded-full bg-success/70" />
          <span className="ml-2 font-mono text-[11px]">fit-card · sample</span>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary-soft px-2.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
          AI-generated
        </span>
      </div>

      <div className="grid grid-cols-1 gap-0 lg:grid-cols-5">
        <div className="col-span-2 border-b border-border p-5 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary text-lg font-semibold text-primary">R</div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{demoMatch.company}</p>
              <p className="text-sm font-medium leading-snug">{demoMatch.role}</p>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
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
// Feature card
// ─────────────────────────────────────────────────────────────────────────────

function Feature({
  icon, title, body, stat,
}: {
  icon: React.ReactNode; title: string; body: string; stat: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elev2 motion-reduce:hover:translate-y-0">
      <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground transition group-hover:scale-105 motion-reduce:group-hover:scale-100">
        {icon}
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <p className="mt-3 text-xs font-semibold text-primary">{stat}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo cloud — now clickable to /companies/[slug]
// ─────────────────────────────────────────────────────────────────────────────

function LogoCloud({ companies, reduce }: { companies: Company[]; reduce: boolean }) {
  // Fall back to the static 18-company name list if the DB returned nothing
  // (crawler hasn't run yet) so the visual section isn't empty.
  const FALLBACK = [
    "Google", "Microsoft", "Meta", "Amazon", "Apple", "Atlassian", "Nvidia",
    "Oracle", "Salesforce", "SAP Labs", "Razorpay", "PhonePe", "Zerodha",
    "CRED", "Groww", "Swiggy", "Zomato", "Flipkart",
  ];
  const list: Company[] = companies.length > 0
    ? companies
    : FALLBACK.map((name) => ({ name, slug: name.toLowerCase().replace(/\s+/g, "-"), logoUrl: null }));

  return (
    <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-6 lg:grid-cols-9">
      {list.map((c, i) => (
        <motion.div
          key={c.slug}
          initial={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: 0.025 * i, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link
            href={`/companies/${c.slug}`}
            title={`${c.name} careers in India`}
            className="group flex aspect-square items-center justify-center rounded-lg border border-border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-secondary/40 hover:shadow-elev2 motion-reduce:hover:translate-y-0"
          >
            <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={40} className="!border-0 !bg-transparent !rounded-md" />
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavLink — desktop primary nav
// ─────────────────────────────────────────────────────────────────────────────

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-ring"
    >
      {children}
    </Link>
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
