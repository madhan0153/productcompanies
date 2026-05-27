"use client";

/**
 * Admin dashboard — overview only.
 * Receives pre-fetched, serialisable data from the server component.
 * Each section (users, resumes, jobs …) now lives on its own route.
 */

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  BrainCircuit,
  CreditCard,
  FileText,
  Gauge,
  Gift,
  LibraryBig,
  Radar,
  Settings,
  ShieldAlert,
  Terminal,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Badge,
  MiniMetric,
  Sparkline,
  STATE_CLS,
  TONE_CLS,
  timeAgo,
  type State,
  type Tone,
} from "./admin-ui";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminDashboardData = {
  generatedAt: string;
  fleetGrade: string;
  fleetScore: number;
  activeQueue: number;
  atRiskCompanies: number;

  metrics: Array<{
    id: "users" | "resumes" | "jobs" | "llm";
    label: string;
    value: string;
    detail: string;
    trend: string;
    tone: Tone;
  }>;

  health: Array<{
    label: string;
    value: string;
    detail: string;
    state: "ok" | "warn";
  }>;

  attention: Array<{
    id: string;
    title: string;
    detail: string;
    tone: State;
    /** href can be a real route or a hash anchor */
    href: string;
  }>;

  jobQualityPulse: number[];

  quickStats: {
    totalUsers: number;
    liveJobs: number;
    aiArtifacts: number;
    crawlerRuns: number;
  };
};

// ─── Icon maps (client-only — not serialisable) ───────────────────────────────

const METRIC_ICONS = {
  users:   Users,
  resumes: FileText,
  jobs:    Briefcase,
  llm:     BrainCircuit,
} as const;

const ATTENTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "resume-failures":  FileText,
  "job-enrichment":   Briefcase,
  "crawler-risk":     Radar,
  "llm-dead-keys":    BrainCircuit,
  "security-jobs":    ShieldAlert,
  "settings-health":  Settings,
};

// Action-oriented quick access — operations admins do daily
const QUICK_LINKS = [
  { href: "/admin/billing/grants",  label: "Grant access",  desc: "Pro/Sprint by email",    icon: Users },
  { href: "/admin/billing/promos",  label: "Promo codes",   desc: "Create access codes",    icon: Gift },
  { href: "/admin/billing",         label: "Billing",       desc: "Subs · invoices",        icon: CreditCard },
  { href: "/admin/ops",             label: "Ops Console",   desc: "Triggers · queue · keys",icon: Terminal },
  { href: "/admin/users",           label: "Users",         desc: "Search, suspend, delete",icon: Users },
  { href: "/admin/jobs",            label: "Jobs & Matches",desc: "Quality, enrichment",    icon: Briefcase },
  { href: "/admin/crawler-intel",   label: "Crawler Intel", desc: "Fleet drift & health",   icon: Radar },
  { href: "/admin/ai-ops",          label: "AI Ops",        desc: "Providers & routing",    icon: BrainCircuit },
] as const;

// ─── Root component ───────────────────────────────────────────────────────────

export function AdminControlRoom({ data }: { data: AdminDashboardData }) {
  const reduce = useReducedMotion();

  const appear = reduce ? {} : {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] as const },
  };

  return (
    <div className="min-h-screen bg-background pb-28 text-foreground">
      {/* Mobile sticky bar */}
      <MobileCommandBar data={data} />

      <div className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <motion.header
          {...appear}
          className="overflow-hidden rounded-xl border border-border bg-card shadow-elev1"
        >
          <div className="grid gap-0 lg:grid-cols-[1fr_22rem]">
            {/* Left: title + links */}
            <div className="p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={data.atRiskCompanies > 0 ? "warn" : "ok"}>
                  {data.atRiskCompanies > 0
                    ? `${data.atRiskCompanies} companies at risk`
                    : "Fleet healthy"}
                </Badge>
                <Badge tone="muted">Updated {timeAgo(data.generatedAt)}</Badge>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
                Command Center
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Monitor users, resumes, jobs, crawler reliability, AI routing, and DPDP compliance from one unified surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <HeroLink href="/admin/crawler-intel" icon={Radar}>Crawler Intel</HeroLink>
                <HeroLink href="/admin/ai-ops"        icon={BrainCircuit}>AI Ops</HeroLink>
                <HeroLink href="/admin/health"        icon={Activity}>Operations</HeroLink>
              </div>
            </div>

            {/* Right: live stats */}
            <div className="border-t border-border bg-secondary/20 p-5 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <LiveDot reduce={reduce ?? false} />
                Live operations
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                {[
                  { label: "Fleet",   value: `${data.fleetGrade}${data.fleetScore}`, warn: data.atRiskCompanies > 0 },
                  { label: "Queue",   value: String(data.activeQueue),               warn: data.activeQueue > 0 },
                  { label: "At risk", value: String(data.atRiskCompanies),           warn: data.atRiskCompanies > 0 },
                ].map((s) => (
                  <div key={s.label} className="bg-card p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", s.warn && "text-amber-500 dark:text-amber-400")}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {data.health.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className={cn(
                      "inline-flex w-fit shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      item.state === "ok" ? STATE_CLS.ok : STATE_CLS.warn,
                    )}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.header>

        {/* ── KPI tiles ──────────────────────────────────────────────── */}
        <motion.section {...appear} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => {
            const Icon = METRIC_ICONS[metric.id];
            const toneCls = TONE_CLS[metric.tone];
            return (
              <Link
                key={metric.id}
                href={`/admin/${metric.id === "llm" ? "ai-ops" : metric.id === "resumes" ? "resumes" : metric.id}`}
                className="lift rounded-xl border border-border bg-card p-4 shadow-elev1 focus-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border", toneCls)}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="max-w-[9rem] text-right text-[11px] leading-tight text-muted-foreground">
                    {metric.trend}
                  </span>
                </div>
                <p className="mt-4 text-3xl font-semibold tabular-nums">{metric.value}</p>
                <p className="mt-0.5 text-sm font-medium">{metric.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{metric.detail}</p>
              </Link>
            );
          })}
        </motion.section>

        {/* ── Attention + posture ─────────────────────────────────────── */}
        <motion.section {...appear} className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          {/* Attention panel */}
          <section className="rounded-xl border border-border bg-card shadow-elev1">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-semibold">Needs attention</h2>
              <span className="ml-auto inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                {data.attention.length} checks
              </span>
            </header>
            <div className="divide-y divide-border">
              {data.attention.map((item) => {
                const Icon = ATTENTION_ICONS[item.id] ?? AlertTriangle;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-secondary/30 motion-reduce:transition-none"
                  >
                    <span className={cn(
                      "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                      STATE_CLS[item.tone],
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </a>
                );
              })}
            </div>
          </section>

          {/* Posture panel */}
          <section className="rounded-xl border border-border bg-card shadow-elev1">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Gauge className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Operational posture</h2>
            </header>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                <MiniMetric label="Total users"  value={data.quickStats.totalUsers} />
                <MiniMetric label="Live jobs"    value={data.quickStats.liveJobs} />
                <MiniMetric label="AI artifacts" value={data.quickStats.aiArtifacts} />
                <MiniMetric label="Crawl runs"   value={data.quickStats.crawlerRuns} />
              </div>
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Job quality trend (visible rows)</p>
                <Sparkline values={data.jobQualityPulse} />
              </div>
            </div>
          </section>
        </motion.section>

        {/* ── Quick access grid ───────────────────────────────────────── */}
        <motion.section {...appear} className="mt-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Quick access
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {QUICK_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="lift flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-elev1 transition-colors hover:border-primary/30 focus-ring motion-reduce:transition-none"
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{link.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{link.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MobileCommandBar({ data }: { data: AdminDashboardData }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/94 backdrop-blur-xl md:hidden">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">Admin</p>
            <h1 className="text-lg font-semibold leading-tight">Command Center</h1>
          </div>
          <Link
            href="/admin/health"
            aria-label="Operations"
            className="press inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground focus-ring"
          >
            <Activity className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {[
            { label: "Fleet",   value: `${data.fleetGrade}${data.fleetScore}` },
            { label: "Queue",   value: String(data.activeQueue) },
            { label: "At risk", value: String(data.atRiskCompanies) },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-border bg-card px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">{s.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LiveDot({ reduce }: { reduce: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className={cn(
        "absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70",
        !reduce && "animate-ping",
      )} />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}

function HeroLink({
  href, icon: Icon, children,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="press inline-flex h-9 items-center gap-2 rounded-lg border border-primary/25 bg-primary/8 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/15 focus-ring motion-reduce:transition-none"
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}
