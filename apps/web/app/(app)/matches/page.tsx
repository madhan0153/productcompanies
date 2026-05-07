import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ExternalLink, ChevronRight, ShieldCheck, AlertTriangle, Eye, EyeOff,
  Sparkles, Target, ArrowUpRight, Activity, Ghost,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import type { Verdict, Json } from "@/lib/supabase/types";
import { ComputeButton } from "./compute-button";
import { MatchFilters } from "./filters";

export const metadata: Metadata = { title: "Matches" };
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Verdict design system — single source of truth for colour/label/order.
// ─────────────────────────────────────────────────────────────────────────────

type VerdictMeta = {
  label: string;
  short: string;
  tone: string;       // tailwind text/border tone for the badge
  bgTone: string;     // soft fill tone
  description: string;
  rank: number;       // ordering for verdict bands (low = top of page)
};

const VERDICT_META: Record<Verdict, VerdictMeta> = {
  strong_fit: {
    label: "Strong fit",
    short: "Strong",
    tone: "text-emerald-400 border-emerald-400/30",
    bgTone: "bg-emerald-400/5",
    description: "You hit the must-haves and the level. Worth a tailored application.",
    rank: 1,
  },
  stretch: {
    label: "Stretch",
    short: "Stretch",
    tone: "text-amber-400 border-amber-400/30",
    bgTone: "bg-amber-400/5",
    description: "Most must-haves covered with a gap or two. Apply if the role excites you.",
    rank: 2,
  },
  off_target: {
    label: "Off-target",
    short: "Off-target",
    tone: "text-violet-400 border-violet-400/30",
    bgTone: "bg-violet-400/5",
    description: "Adjacent to your stated targets — a pivot, not a natural next step.",
    rank: 3,
  },
  underqualified: {
    label: "Underqualified",
    short: "Under",
    tone: "text-sky-400 border-sky-400/30",
    bgTone: "bg-sky-400/5",
    description: "JD asks for more years or skills than your resume shows today.",
    rank: 4,
  },
  mismatch: {
    label: "Mismatch",
    short: "Mismatch",
    tone: "text-rose-400 border-rose-400/30",
    bgTone: "bg-rose-400/5",
    description: "Wrong function. Hidden by default to keep your list focused.",
    rank: 5,
  },
};

const DEFAULT_VISIBLE: Verdict[] = ["strong_fit", "stretch", "off_target", "underqualified"];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MatchRow = {
  score: number;
  verdict: Verdict | null;
  fit_card: Json | null;
  fit_card_at: string | null;
  hidden_reason: string | null;
  reasoning: string | null;
  computed_at: string;
  jobs: {
    id: string; title: string; location: string | null;
    hubs: string[] | null; tech_stack: string[] | null;
    comp_lpa_min: number | null; comp_lpa_max: number | null;
    seniority: string | null; apply_url: string | null;
    posted_at: string | null; is_likely_ghost: boolean | null;
    jd_summary: string | null;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
};

type FitCardLite = {
  one_liner?: string;
  resume_tweaks?: Array<{ priority?: number; suggestion?: string; why?: string }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; h?: string; min_score?: string; show?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const selectedCompanies = (params.c ?? "").split(",").filter(Boolean);
  const selectedHubs = (params.h ?? "").split(",").filter(Boolean);
  const minScore = params.min_score ? parseInt(params.min_score, 10) : null;
  const showHidden = params.show === "all";

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_storage_path, resume_score, resume_score_at")
    .eq("id", user.id)
    .maybeSingle();

  const hasResume = !!profile?.resume_storage_path;
  const resumeScore = (profile as { resume_score?: number | null } | null)?.resume_score ?? null;

  let query = supabase
    .from("matches")
    .select(`
      score, verdict, fit_card, fit_card_at, hidden_reason, reasoning, computed_at,
      jobs (
        id, title, location, hubs, tech_stack,
        comp_lpa_min, comp_lpa_max, seniority,
        apply_url, posted_at, is_likely_ghost, jd_summary,
        companies ( name, slug, logo_url )
      )
    `)
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(500);

  if (minScore !== null) query = query.gte("score", minScore);

  const { data: rawData } = await query;
  const matchRows = rawData as unknown as MatchRow[] | null;
  const allRows = (matchRows ?? []).filter((m): m is MatchRow & { jobs: NonNullable<MatchRow["jobs"]> } => !!m.jobs);

  // Apply user filters (company / hub)
  const filtered = allRows.filter((m) => {
    const slug = m.jobs.companies?.slug ?? "";
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(slug)) return false;
    const hubs = m.jobs.hubs ?? [];
    if (selectedHubs.length > 0 && !hubs.some((h) => selectedHubs.includes(h))) return false;
    return true;
  });

  // Group by verdict
  const groups = new Map<Verdict, typeof filtered>();
  for (const m of filtered) {
    const v: Verdict = (m.verdict ?? "stretch") as Verdict;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v)!.push(m);
  }

  // Visible bands respect show=all toggle
  const visibleVerdicts: Verdict[] = showHidden
    ? (Object.keys(VERDICT_META) as Verdict[])
    : DEFAULT_VISIBLE;

  const visibleCount = visibleVerdicts.reduce((acc, v) => acc + (groups.get(v)?.length ?? 0), 0);
  const hiddenCount = filtered.length - visibleCount;

  // Build full filter universes from the unfiltered set
  const companies = [...new Map(
    allRows
      .map((m) => m.jobs.companies)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => [c.slug, { slug: c.slug, name: c.name }]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const allHubs = [...new Set(allRows.flatMap((m) => m.jobs.hubs ?? []))].sort();

  // Verdict counts (for header summary)
  const counts = {
    strong_fit:     groups.get("strong_fit")?.length ?? 0,
    stretch:        groups.get("stretch")?.length ?? 0,
    off_target:     groups.get("off_target")?.length ?? 0,
    underqualified: groups.get("underqualified")?.length ?? 0,
    mismatch:       groups.get("mismatch")?.length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allRows.length > 0
              ? `${counts.strong_fit} strong · ${counts.stretch} stretch · ${counts.underqualified} under · ${counts.mismatch} hidden mismatch`
              : "Compute your first matches below"}
          </p>
        </div>
        <ComputeButton hasResume={hasResume} />
      </div>

      {/* Resume Score banner — only when computed */}
      {hasResume && resumeScore !== null && (
        <ResumeScoreBanner score={resumeScore} />
      )}

      {/* No-resume prompt */}
      {!hasResume && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-medium">Start with your resume</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your PDF and we&apos;ll parse it, score your resume against live demand from 18 product companies, and rank every active role with a structured Fit Card.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Go to Profile →
          </Link>
        </div>
      )}

      {/* Filters */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
          totalCount={allRows.length}
          filteredCount={filtered.length}
        />
      )}

      {/* Show/hide gate for mismatches */}
      {allRows.length > 0 && hiddenCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-border bg-card/30 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {showHidden
              ? `Showing ${hiddenCount} mismatch / underqualified roles too. Most users keep these hidden.`
              : `Hiding ${hiddenCount} role${hiddenCount === 1 ? "" : "s"} we don't think are worth your time.`}
          </span>
          <Link
            href={showHidden ? "/matches" : "/matches?show=all"}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {showHidden ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show all</>}
          </Link>
        </div>
      )}

      {/* Verdict bands */}
      {visibleCount > 0 ? (
        <div className="space-y-8">
          {visibleVerdicts.map((v) => {
            const items = groups.get(v) ?? [];
            if (items.length === 0) return null;
            const meta = VERDICT_META[v];
            return (
              <section key={v} className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${meta.tone}`}>
                      {meta.label}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
                  </div>
                  <span className="hidden text-xs text-muted-foreground sm:inline">{meta.description}</span>
                </div>

                <StaggerList className="space-y-3">
                  {items.map((m) => (
                    <MatchCard key={m.jobs.id} match={m} verdict={v} />
                  ))}
                </StaggerList>
              </section>
            );
          })}
        </div>
      ) : allRows.length > 0 ? (
        <EmptyState
          icon={<ChevronRight className="h-5 w-5" />}
          title="No matches with these filters"
          body="Widen the selection — clear a company filter, lower the minimum score, or toggle 'Show all'."
          actions={[{ label: "Clear filters", href: "/matches", variant: "primary" }]}
        />
      ) : hasResume ? (
        <EmptyState
          icon={<Activity className="h-5 w-5" />}
          title="No matches computed yet"
          body="Click 'Compute matches' above. We rank every active role across 18 product companies, drop hard mismatches, and write a Fit Card for the top 25."
        />
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume Score banner
// ─────────────────────────────────────────────────────────────────────────────

function ResumeScoreBanner({ score }: { score: number }) {
  const tone =
    score >= 80 ? "from-emerald-500/20 via-emerald-500/5 to-transparent border-emerald-500/30 text-emerald-400" :
    score >= 60 ? "from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 text-amber-400" :
                  "from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/30 text-rose-400";
  const grade =
    score >= 85 ? "Application-ready" :
    score >= 70 ? "Strong" :
    score >= 55 ? "Solid baseline" :
                  "Needs work";

  return (
    <Link
      href="/profile#resume-score"
      className={`group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br ${tone} px-5 py-4 transition hover:border-current`}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-current/30 bg-card/40 backdrop-blur">
            <span className="text-xl font-bold tabular-nums">{score}</span>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resume strength</p>
          <p className="font-display text-base font-semibold">{grade}</p>
          <p className="text-xs text-muted-foreground">Grounded in live demand from your 18 target companies</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Match card — verdict-first, no opaque score, top tweak teaser
// ─────────────────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  verdict,
}: {
  match: Pick<MatchRow, "score" | "fit_card" | "reasoning" | "hidden_reason"> & {
    jobs: NonNullable<MatchRow["jobs"]>;
  };
  verdict: Verdict;
}) {
  const job = match.jobs;
  const company = job.companies;
  const meta = VERDICT_META[verdict];
  const card = (match.fit_card as FitCardLite | null) ?? null;
  const oneLiner = card?.one_liner ?? match.reasoning ?? job.jd_summary ?? "";
  const topTweak = card?.resume_tweaks?.find((t) => t.priority === 1) ?? card?.resume_tweaks?.[0];
  const isGhost = job.is_likely_ghost === true;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`group block rounded-2xl border border-border bg-card/40 p-5 transition lift hover:border-primary/30 hover:bg-card/70 ${meta.bgTone}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={44} />
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>
                {meta.short}
              </span>
              {isGhost && (
                <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 px-2 py-0.5 text-[11px] text-zinc-400">
                  <Ghost className="h-3 w-3" /> Older listing
                </span>
              )}
              <span className="ml-auto rounded-md bg-secondary/60 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                {Math.round(match.score)}
              </span>
            </div>

            <h3 className="font-medium leading-snug group-hover:text-primary transition">
              {job.title}
            </h3>

            {oneLiner && (
              <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{oneLiner}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 text-xs text-muted-foreground">
              {(job.hubs ?? []).slice(0, 3).map((h) => (<span key={h}>{h}</span>))}
              {job.comp_lpa_max != null && (
                <span className="text-primary/80">Up to ₹{job.comp_lpa_max} LPA</span>
              )}
              {job.seniority && (
                <span className="capitalize">{job.seniority}</span>
              )}
            </div>

            {topTweak?.suggestion && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-primary">Top resume tweak</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{topTweak.suggestion}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-primary" /> Open Fit Card
        </span>
        {job.apply_url && (
          <span className="inline-flex items-center gap-1 group-hover:text-primary transition">
            Apply on official site <ExternalLink className="h-3 w-3" />
          </span>
        )}
      </div>
    </Link>
  );
}
