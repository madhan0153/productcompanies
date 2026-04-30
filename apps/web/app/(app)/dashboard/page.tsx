import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  Briefcase, Target, TrendingUp, Building2,
  ChevronRight, CheckCircle2, Circle, ArrowUpRight,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_COLORS: Record<string, string> = {
  saved: "bg-sky-400/10 text-sky-400",
  applied: "bg-violet-400/10 text-violet-400",
  interviewing: "bg-amber-400/10 text-amber-400",
  offer: "bg-emerald-400/10 text-emerald-400",
  rejected: "bg-rose-400/10 text-rose-400",
  withdrawn: "bg-zinc-400/10 text-zinc-400",
};

type RecentMatch = {
  score: number;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
};

type RecentApp = {
  id: string;
  status: string;
  applied_at: string | null;
  job_id: string;
  jobs: {
    title: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
};

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [
    { data: profile },
    { count: matchCount },
    { count: appCount },
    { data: recentMatchesRaw },
    { data: appsByStatus },
    { data: recentAppsRaw },
  ] = await Promise.all([
    supabase.from("profiles")
      .select("display_name, resume_storage_path, product_dna_score, years_experience, current_role")
      .eq("id", user.id).maybeSingle(),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("matches")
      .select("score, job_id, jobs(id, title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(5),
    supabase.from("applications")
      .select("status")
      .eq("user_id", user.id),
    supabase.from("applications")
      .select("id, status, applied_at, job_id, jobs(title, companies(name, logo_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const recentMatches = (recentMatchesRaw as unknown as RecentMatch[] | null) ?? [];
  const recentApps = (recentAppsRaw as unknown as RecentApp[] | null) ?? [];

  const hasResume = !!profile?.resume_storage_path;
  const dnaScore = profile?.product_dna_score ?? null;
  const displayName = profile?.display_name ?? null;

  const pipeline = (appsByStatus ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const steps = [
    { done: hasResume, label: "Upload your resume", href: "/profile" },
    { done: (matchCount ?? 0) > 0, label: "Compute your first matches", href: "/matches" },
    { done: (appCount ?? 0) > 0, label: "Track your first application", href: "/applications" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-8">
      {/* Hero greeting */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{displayName ? `, ${displayName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.current_role
              ? `${profile.current_role} · ${profile.years_experience ?? "?"} yrs exp`
              : "Your personalised PM job matching dashboard."}
          </p>
        </div>

        {/* DNA score ring */}
        {dnaScore !== null && (
          <DnaRing score={dnaScore} />
        )}
      </div>

      {/* Resume prompt */}
      {!hasResume && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-transparent p-6">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <h2 className="font-semibold">Start with your resume</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Upload your PDF resume — we&apos;ll compute your Product DNA score and rank every active role across 18 product companies.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90"
          >
            Upload resume <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="DNA Score"
          value={dnaScore !== null ? dnaScore : "—"}
          sub="/ 100"
          href="/profile"
          color="text-primary"
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5" />}
          label="Matches"
          value={matchCount ?? 0}
          sub="active roles"
          href="/matches"
          color="text-violet-400"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Applications"
          value={appCount ?? 0}
          sub="tracked"
          href="/applications"
          color="text-emerald-400"
        />
        <StatCard
          icon={<Building2 className="h-5 w-5" />}
          label="Companies"
          value={18}
          sub="product cos"
          href="/matches"
          color="text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Application pipeline */}
        {(appCount ?? 0) > 0 ? (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Application pipeline</h2>
              <Link href="/applications" className="text-xs text-muted-foreground hover:text-foreground transition">
                View all →
              </Link>
            </div>
            <div className="space-y-2.5">
              {Object.entries(pipeline).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${STATUS_COLORS[status] ?? "bg-secondary text-foreground"}`}>
                    {status}
                  </span>
                  <div className="flex-1 rounded-full bg-secondary">
                    <div
                      className="h-1.5 rounded-full bg-current opacity-60 transition-all"
                      style={{ width: `${Math.min((count / (appCount ?? 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="w-5 text-right text-xs tabular-nums text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Getting started checklist */
          !allDone && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <h2 className="mb-4 text-sm font-medium">Get started</h2>
              <ol className="space-y-3">
                {steps.map(({ done, label, href }) => (
                  <li key={label} className="flex items-center gap-3">
                    {done
                      ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                      : <Circle className="h-5 w-5 shrink-0 text-border" />
                    }
                    {done
                      ? <span className="text-sm text-muted-foreground line-through">{label}</span>
                      : (
                        <Link href={href} className="group flex items-center gap-1 text-sm hover:text-primary transition">
                          {label}
                          <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
                        </Link>
                      )
                    }
                  </li>
                ))}
              </ol>
            </div>
          )
        )}

        {/* Recent matches */}
        {recentMatches.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Top matches</h2>
              <Link href="/matches" className="text-xs text-muted-foreground hover:text-foreground transition">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {recentMatches.map((m) => {
                const job = m.jobs;
                const company = job?.companies;
                return (
                  <Link
                    key={m.job_id}
                    href={`/jobs/${m.job_id}`}
                    className="flex items-center gap-3 rounded-xl border border-transparent bg-secondary/40 px-3 py-2 transition hover:border-primary/30 hover:bg-secondary/70"
                  >
                    <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{job?.title ?? "Role"}</p>
                      <p className="truncate text-xs text-muted-foreground">{company?.name ?? "—"}</p>
                    </div>
                    <ScorePill score={m.score} />
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent activity */}
        {recentApps.length > 0 && (
          <div className="rounded-2xl border border-border bg-card/40 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium">Recent activity</h2>
              <Link href="/applications" className="text-xs text-muted-foreground hover:text-foreground transition">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {recentApps.map((a) => (
                <Link
                  key={a.id}
                  href={`/applications/${a.id}`}
                  className="flex items-center gap-3 rounded-xl border border-transparent bg-secondary/40 px-3 py-2 transition hover:border-primary/30 hover:bg-secondary/70"
                >
                  <CompanyLogo name={a.jobs?.companies?.name ?? "?"} logoUrl={a.jobs?.companies?.logo_url ?? null} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.jobs?.title ?? "Application"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.jobs?.companies?.name ?? ""} · {a.applied_at ? formatDate(a.applied_at) : "no date"}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[a.status] ?? ""}`}>
                    {a.status}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All done card */}
        {allDone && (appCount ?? 0) === 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <h2 className="mt-2 font-medium">You&apos;re set up!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Start tracking your applications and interview progress.
            </p>
            <Link
              href="/applications"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:underline"
            >
              Track an application →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function DnaRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (Math.min(score, 100) / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <circle
          cx="36" cy="36" r={r}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="6"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
        />
        <text
          x="36" y="36"
          dominantBaseline="middle"
          textAnchor="middle"
          style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontSize: "16px", fontWeight: 700, fill: "hsl(var(--foreground))" }}
        >
          {score}
        </text>
      </svg>
      <span className="text-xs font-medium text-muted-foreground">DNA score</span>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, href, color,
}: {
  icon: React.ReactNode; label: string; value: number | string;
  sub: string; href: string; color: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-border bg-card/40 p-5 transition hover:border-primary/30 hover:bg-card/70"
    >
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-current/10 ${color}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">
        {label} <span className="opacity-60">· {sub}</span>
      </p>
    </Link>
  );
}

function ScorePill({ score }: { score: number }) {
  const cls = score >= 75 ? "bg-emerald-400/10 text-emerald-400"
    : score >= 55 ? "bg-amber-400/10 text-amber-400"
    : "bg-secondary text-muted-foreground";
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${cls}`}>
      {score}
    </span>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}
