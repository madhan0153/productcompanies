// /admin — landing dashboard.
//
// At-a-glance enterprise overview: fleet score, catalog, user growth,
// resume intelligence throughput, recent crawl activity. Each card is a
// portal to the focused subpage (Crawler Intel, Operations).
//
// Mobile-first: cards stack on phones, 2-col on tablets, 4-col on desktop.
// Reduced-motion-safe; no opaque animations.
//
// Auth: handled by the parent /admin/layout.tsx — non-admins get 404.

import type { Metadata } from "next";
import Link from "next/link";
import {
  Radar, Activity, Briefcase, Users, Sparkles, ArrowRight,
  CheckCircle2, AlertCircle, XCircle, Clock,
} from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { scoreFleet, type CrawlRunRow, type CompanyRow } from "@/lib/admin/crawler-resilience";

export const metadata: Metadata = { title: "Admin · Overview" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RunRow = {
  id: string;
  company_id: string;
  status: "running" | "success" | "partial" | "failed";
  started_at: string;
  finished_at: string | null;
  jobs_new: number | null;
};

export default async function AdminOverviewPage() {
  const admin = createSupabaseAdminClient();
  const since14d = new Date(Date.now() - 14 * 24 * 3_600_000).toISOString();
  const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

  const [
    { data: companies },
    { data: recentRuns },
    { count: activeJobCount },
    { count: parsedJobCount },
    { count: userCount },
    { count: usersWithResume },
    { count: matchesUnseen },
    { count: enhancedFinalised },
    { count: tailoredFinalised },
    { count: computedLast24h },
    { data: latestRuns },
  ] = await Promise.all([
    admin.from("companies").select("id, name, slug, logo_url").order("name") as any,
    admin
      .from("crawl_runs")
      .select("company_id, status, finished_at, started_at, jobs_new, jobs_updated, jobs_marked_stale, error")
      .gte("started_at", since14d)
      .order("started_at", { ascending: false }) as any,
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("is_active", true).not("jd_parsed_at", "is", null),
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).not("resume_storage_path", "is", null),
    admin.from("matches").select("user_id", { count: "exact", head: true }).is("seen_at", null),
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }).eq("status", "finalised"),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_match_compute_at", since24h),
    admin
      .from("crawl_runs")
      .select("id, company_id, status, started_at, finished_at, jobs_new")
      .order("started_at", { ascending: false })
      .limit(8) as any,
  ]);

  const companiesTyped = (companies ?? []) as Array<CompanyRow & { logo_url: string | null }>;
  const runsByCompany = new Map<string, CrawlRunRow[]>();
  for (const r of (recentRuns ?? []) as CrawlRunRow[]) {
    if (!runsByCompany.has(r.company_id)) runsByCompany.set(r.company_id, []);
    runsByCompany.get(r.company_id)!.push(r);
  }
  const { overall, perCompany } = scoreFleet(companiesTyped, runsByCompany);

  const companiesById = new Map(companiesTyped.map((c) => [c.id, c]));
  const latestRunsRows = ((latestRuns ?? []) as RunRow[]).slice(0, 8);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      {/* Hero */}
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Overview</h1>
        <p className="text-sm text-muted-foreground">
          One-tap visibility into the things that matter — fleet health, catalog,
          users, resume intelligence pipeline.
        </p>
      </header>

      {/* Fleet hero card + headline stats */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FleetHero
          score={overall.fleetScore}
          grade={overall.fleetGrade}
          atRisk={overall.companiesAtRisk}
        />
        <HeadlineStat
          icon={<Briefcase className="h-4 w-4" />}
          label="Active jobs"
          value={String(activeJobCount ?? 0)}
          sub={`${parsedJobCount ?? 0} parsed · ${(activeJobCount ?? 0) - (parsedJobCount ?? 0)} pending`}
        />
        <HeadlineStat
          icon={<Users className="h-4 w-4" />}
          label="Users"
          value={String(userCount ?? 0)}
          sub={`${usersWithResume ?? 0} with resume · ${computedLast24h ?? 0} computed 24h`}
        />
        <HeadlineStat
          icon={<Sparkles className="h-4 w-4" />}
          label="Resume Intel"
          value={String((enhancedFinalised ?? 0) + (tailoredFinalised ?? 0))}
          sub={`${enhancedFinalised ?? 0} enhanced · ${tailoredFinalised ?? 0} tailored`}
        />
      </section>

      {/* Action portals */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <PortalCard
          href="/admin/crawler-intel"
          icon={<Radar className="h-4 w-4 text-primary" />}
          title="Crawler Intelligence"
          subtitle="Adaptive resilience, drift watchlist, per-company grades."
          stats={[
            { label: "Fleet", value: `${overall.fleetGrade}` },
            { label: "Adaptive", value: `${Math.round(overall.adaptiveCoverage * 100)}%` },
            { label: "At risk", value: String(overall.companiesAtRisk) },
          ]}
        />
        <PortalCard
          href="/admin/health"
          icon={<Activity className="h-4 w-4 text-primary" />}
          title="Operations"
          subtitle="Catalog volume, user engagement, resume intel pipeline latency."
          stats={[
            { label: "Unseen", value: String(matchesUnseen ?? 0) },
            { label: "24h compute", value: String(computedLast24h ?? 0) },
          ]}
        />
      </section>

      {/* Drift watchlist (mirrored from crawler-intel for at-a-glance) */}
      <section>
        <SectionHeader title="Watchlist" subtitle="Crawlers with drift or staleness in the last 14 days" />
        <DriftWatchlist
          items={perCompany
            .filter((c) => c.driftFlag || c.staleFlag)
            .slice(0, 5)}
        />
      </section>

      {/* Recent crawler activity */}
      <section>
        <SectionHeader title="Recent crawler runs" subtitle="Last 8, newest first" />
        <RecentRunsList
          rows={latestRunsRows}
          companiesById={companiesById}
        />
      </section>
    </div>
  );
}

// ── Cards ──────────────────────────────────────────────────────────────────

function FleetHero({ score, grade, atRisk }: { score: number; grade: string; atRisk: number }) {
  const tone = grade.startsWith("A") ? "emerald" :
               grade === "B" ? "sky" :
               grade === "C" ? "amber" : "rose";
  const ring = {
    emerald: "from-emerald-500/30 to-emerald-500/0",
    sky:     "from-sky-500/30 to-sky-500/0",
    amber:   "from-amber-500/30 to-amber-500/0",
    rose:    "from-rose-500/30 to-rose-500/0",
  }[tone];
  const grad = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    sky:     "bg-sky-500/10 text-sky-400 border-sky-500/30",
    amber:   "bg-amber-500/10 text-amber-400 border-amber-500/30",
    rose:    "bg-rose-500/10 text-rose-400 border-rose-500/30",
  }[tone];

  return (
    <Link
      href="/admin/crawler-intel"
      className="group relative overflow-hidden rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40"
    >
      <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${ring}`} />
      <div className="relative flex items-center gap-3">
        <div className={`flex h-14 w-14 items-center justify-center rounded-xl border text-2xl font-bold ${grad}`}>
          {grade}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Fleet score</p>
          <p className="text-2xl font-bold tabular-nums">{score}</p>
          <p className="text-[10px] text-muted-foreground/80">
            {atRisk} at risk · adaptive crawler engine
          </p>
        </div>
      </div>
      <div className="relative mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none">
        View details <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

function HeadlineStat({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <div className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-[10px] text-muted-foreground/70">{sub}</p>
    </div>
  );
}

function PortalCard({ href, icon, title, subtitle, stats }: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  stats: Array<{ label: string; value: string }>;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-border bg-card/40 p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold tabular-nums">{s.value}</p>
          </div>
        ))}
      </div>
    </Link>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2">
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-[11px] text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function DriftWatchlist({ items }: {
  items: Array<{
    company: CompanyRow;
    driftFlag: boolean;
    staleFlag: boolean;
    score: number;
    grade: string;
  }>;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Everything healthy — no active drift or staleness.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5">
      {items.map((c) => (
        <li key={c.company.id} className="flex items-center gap-2 px-4 py-3 text-sm">
          <span className="font-medium">{c.company.name}</span>
          {c.driftFlag && (
            <span className="rounded-full border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
              DRIFT
            </span>
          )}
          {c.staleFlag && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
              STALE
            </span>
          )}
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            grade {c.grade} · score {c.score}
          </span>
        </li>
      ))}
    </ul>
  );
}

function RecentRunsList({
  rows,
  companiesById,
}: {
  rows: RunRow[];
  companiesById: Map<string, CompanyRow & { logo_url: string | null }>;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
        No crawler runs in the last 14 days.
      </p>
    );
  }
  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-2xl border border-border bg-card/40">
      {rows.map((r) => {
        const company = companiesById.get(r.company_id);
        const at = r.finished_at ?? r.started_at;
        return (
          <li key={r.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
            <StatusDot status={r.status} />
            <span className="min-w-0 flex-1 truncate font-medium">
              {company?.name ?? "Unknown"}
            </span>
            <span className="hidden text-[11px] text-muted-foreground sm:inline">
              {r.jobs_new != null ? `+${r.jobs_new}` : "—"}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {timeAgo(at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function StatusDot({ status }: { status: RunRow["status"] }) {
  const Icon =
    status === "success" ? CheckCircle2 :
    status === "partial" ? AlertCircle :
    status === "failed"  ? XCircle :
                           Clock;
  const tone =
    status === "success" ? "text-emerald-400" :
    status === "partial" ? "text-amber-400" :
    status === "failed"  ? "text-rose-400" :
                           "text-sky-400";
  return <Icon className={`h-3.5 w-3.5 shrink-0 ${tone}`} />;
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
