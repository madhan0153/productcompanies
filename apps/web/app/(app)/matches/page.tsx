import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ExternalLink, ChevronRight, ShieldCheck, Eye, EyeOff,
  Sparkles, Target, ArrowUpRight, Activity, Ghost,
  CheckCircle2, AlertCircle, Zap, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import type { Verdict, Json } from "@/lib/supabase/types";
import { ComputeButton } from "./compute-button";
import { MatchFilters } from "./filters";
import { asRulesScoreBreakdown } from "@/components/score-breakdown";
import { WhyScoreToggle } from "./why-score-toggle";
import { DismissButton, RestoreButton } from "./dismiss-button";
import { ApplyButton } from "@/components/apply-button";

export const metadata: Metadata = { title: "Matches" };
// Sprint 2 Item 5 — page is read-only now (no synchronous compute), so the
// default 60s ceiling is plenty. Background compute runs via after() in
// matches/actions.ts and revalidates this path when done.
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Verdict design system
// ─────────────────────────────────────────────────────────────────────────────

type VerdictMeta = {
  label: string;
  short: string;
  tone: string;
  bgTone: string;
  borderTone: string;
  scoreTone: string;
  description: string;
  rank: number;
  icon: React.ReactNode;
};

const VERDICT_META: Record<Verdict, VerdictMeta> = {
  strong_fit: {
    label: "Strong fit",
    short: "Strong",
    tone: "text-emerald-400",
    bgTone: "bg-emerald-400/5",
    borderTone: "border-emerald-400/20",
    scoreTone: "text-emerald-400 bg-emerald-400/10",
    description: "You hit the must-haves and the level. Worth a tailored application.",
    rank: 1,
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  stretch: {
    label: "Stretch",
    short: "Stretch",
    tone: "text-amber-400",
    bgTone: "bg-amber-400/5",
    borderTone: "border-amber-400/20",
    scoreTone: "text-amber-400 bg-amber-400/10",
    description: "Most must-haves covered with a gap or two. Apply if the role excites you.",
    rank: 2,
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  off_target: {
    label: "Off-target",
    short: "Off-target",
    tone: "text-violet-400",
    bgTone: "bg-violet-400/5",
    borderTone: "border-violet-400/20",
    scoreTone: "text-violet-400 bg-violet-400/10",
    description: "Adjacent to your stated targets — a pivot, not a natural next step.",
    rank: 3,
    icon: <Target className="h-3.5 w-3.5" />,
  },
  underqualified: {
    label: "Underqualified",
    short: "Under",
    tone: "text-sky-400",
    bgTone: "bg-sky-400/5",
    borderTone: "border-sky-400/20",
    scoreTone: "text-sky-400 bg-sky-400/10",
    description: "JD asks for more years or skills than your resume shows today.",
    rank: 4,
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  mismatch: {
    label: "Mismatch",
    short: "Mismatch",
    tone: "text-rose-400",
    bgTone: "bg-rose-400/5",
    borderTone: "border-rose-400/20",
    scoreTone: "text-rose-400 bg-rose-400/10",
    description: "Wrong function. Hidden by default to keep your list focused.",
    rank: 5,
    icon: <ShieldCheck className="h-3.5 w-3.5" />,
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
  seen_at: string | null;
  score_breakdown: Json | null;
  user_hidden: boolean;
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
  strengths?: string[];
  gaps?: string[];
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
  const showOnlyNew = params.show === "new";
  // Sprint 1 Item 4 — dedicated "Hidden" tab for user-dismissed roles.
  const showOnlyHidden = params.show === "hidden";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_score, resume_score_at, last_match_compute_at")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_storage_path: string | null; resume_score: number | null; last_match_compute_at: string | null } | null };

  const hasResume = !!profile?.resume_storage_path;
  const resumeScore = profile?.resume_score ?? null;
  const lastComputeAt = profile?.last_match_compute_at ?? null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("matches")
    .select(`
      score, verdict, fit_card, fit_card_at, hidden_reason, reasoning, computed_at, seen_at,
      score_breakdown, user_hidden,
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
  if (showOnlyNew) query = query.is("seen_at", null);
  // Hidden tab: only user-dismissed rows. Default + new / all: only visible.
  if (showOnlyHidden) query = query.eq("user_hidden", true);
  else                 query = query.eq("user_hidden", false);

  const { data: rawData } = await query;
  const matchRows = rawData as unknown as MatchRow[] | null;
  const allRows = (matchRows ?? []).filter((m): m is MatchRow & { jobs: NonNullable<MatchRow["jobs"]> } => !!m.jobs);
  const allScores = allRows.map(m => m.score).sort((a, b) => a - b);

  // Count of user-hidden rows — drives the "N dismissed" link in the header.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: dismissedCount } = await (supabase
    .from("matches") as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("user_hidden", true) as { count: number | null };

  const unseenIds = allRows.filter((m) => m.seen_at === null).map((m) => m.jobs.id);
  if (unseenIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("matches") as any)
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("seen_at", null);
  }

  const filtered = allRows.filter((m) => {
    const slug = m.jobs.companies?.slug ?? "";
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(slug)) return false;
    const hubs = m.jobs.hubs ?? [];
    if (selectedHubs.length > 0 && !hubs.some((h) => selectedHubs.includes(h))) return false;
    return true;
  });

  const groups = new Map<Verdict, typeof filtered>();
  for (const m of filtered) {
    const v: Verdict = (m.verdict ?? "stretch") as Verdict;
    if (!groups.has(v)) groups.set(v, []);
    groups.get(v)!.push(m);
  }

  const visibleVerdicts: Verdict[] = showHidden
    ? (Object.keys(VERDICT_META) as Verdict[])
    : DEFAULT_VISIBLE;

  const visibleCount = visibleVerdicts.reduce((acc, v) => acc + (groups.get(v)?.length ?? 0), 0);
  const hiddenCount = filtered.length - visibleCount;

  const companies = [...new Map(
    allRows
      .map((m) => m.jobs.companies)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => [c.slug, { slug: c.slug, name: c.name }]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const allHubs = [...new Set(allRows.flatMap((m) => m.jobs.hubs ?? []))].sort();

  const counts = {
    strong_fit:     groups.get("strong_fit")?.length ?? 0,
    stretch:        groups.get("stretch")?.length ?? 0,
    off_target:     groups.get("off_target")?.length ?? 0,
    underqualified: groups.get("underqualified")?.length ?? 0,
    mismatch:       groups.get("mismatch")?.length ?? 0,
  };

  const newCount       = unseenIds.length;
  const newStrongCount = allRows.filter((m) => m.seen_at === null && m.verdict === "strong_fit").length;
  const computeAgo     = lastComputeAt ? humanAgo(lastComputeAt) : null;

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
          {allRows.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="text-emerald-400 font-medium">{counts.strong_fit} strong</span>
              {" · "}{counts.stretch} stretch
              {" · "}{counts.off_target} off-target
              {" · "}{counts.underqualified} under
              {" · "}<span className="opacity-60">{counts.mismatch} hidden</span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Compute your first matches below</p>
          )}
          {computeAgo && (
            <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground/80">
              <Activity className="h-3 w-3 text-emerald-400" />
              <span>
                Last refreshed {computeAgo}
                {newCount > 0 && (
                  <> · <Link href="/matches?show=new" className="text-emerald-400 hover:underline">{newCount} new</Link></>
                )}
                {(dismissedCount ?? 0) > 0 && (
                  <> · <Link href="/matches?show=hidden" className="text-muted-foreground hover:text-foreground hover:underline">{dismissedCount} dismissed</Link></>
                )}
              </span>
            </div>
          )}
        </div>
        <ComputeButton hasResume={hasResume} />
      </div>

      {/* ── Verdict summary strip ──────────────────────────────── */}
      {allRows.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.entries(counts) as [Verdict, number][]).map(([verdict, count]) => {
            const meta = VERDICT_META[verdict];
            return (
              <div
                key={verdict}
                className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 ${meta.bgTone} ${meta.borderTone}`}
              >
                <span className={`text-xl font-bold tabular-nums ${meta.tone}`}>{count}</span>
                <span className="text-[11px] text-muted-foreground">{meta.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── New strong fits banner ─────────────────────────────── */}
      {newStrongCount > 0 && !showOnlyNew && (
        <Link
          href="/matches?show=new"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent px-5 py-4 transition hover:border-emerald-400/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-400/30 bg-emerald-400/10">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                {newStrongCount} new strong {newStrongCount === 1 ? "fit" : "fits"} since your last visit
              </p>
              <p className="text-xs text-muted-foreground">Tap to filter to just the new ones.</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-emerald-400 transition group-hover:translate-x-0.5" />
        </Link>
      )}

      {showOnlyNew && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm">
          <span className="text-emerald-300">Showing {allRows.length} new match{allRows.length === 1 ? "" : "es"} since your last visit.</span>
          <Link href="/matches" className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            Show all
          </Link>
        </div>
      )}

      {showOnlyHidden && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/30 px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Showing {allRows.length} dismissed {allRows.length === 1 ? "role" : "roles"} — hidden from your default list.
          </span>
          <Link href="/matches" className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
            Back to matches
          </Link>
        </div>
      )}

      {/* ── Resume score banner ────────────────────────────────── */}
      {hasResume && resumeScore !== null && (
        <ResumeScoreBanner score={resumeScore} />
      )}

      {/* ── No-resume prompt ───────────────────────────────────── */}
      {!hasResume && (
        <div className="rounded-2xl border border-primary/25 bg-primary/5 p-6">
          <h2 className="font-semibold">Start with your resume</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your PDF — we&apos;ll parse it, score your resume against live demand from 18 product companies, and rank every active role with a structured Fit Card.
          </p>
          <Link
            href="/profile"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90"
          >
            Upload resume <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────── */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
          totalCount={allRows.length}
          filteredCount={filtered.length}
        />
      )}

      {/* ── Show/hide mismatches gate ──────────────────────────── */}
      {allRows.length > 0 && hiddenCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-border/60 bg-card/20 px-4 py-2.5 text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            {showHidden
              ? `Showing ${hiddenCount} mismatch / underqualified roles. Most users keep these hidden.`
              : `Hiding ${hiddenCount} role${hiddenCount === 1 ? "" : "s"} not worth your time right now.`}
          </span>
          <Link
            href={showHidden ? "/matches" : "/matches?show=all"}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          >
            {showHidden ? <><EyeOff className="h-3 w-3" /> Hide</> : <><Eye className="h-3 w-3" /> Show all</>}
          </Link>
        </div>
      )}

      {/* ── Verdict bands (hidden view bypasses grouping) ─────── */}
      {showOnlyHidden ? (
        allRows.length > 0 ? (
          <StaggerList className="space-y-3">
            {filtered.map((m) => (
              <MatchCard
                key={m.jobs.id}
                match={m}
                verdict={(m.verdict ?? "stretch") as Verdict}
                isNew={false}
                allScores={allScores}
                hiddenView
              />
            ))}
          </StaggerList>
        ) : (
          <EmptyState
            icon={<EyeOff className="h-5 w-5" />}
            title="No dismissed roles"
            body="Roles you dismiss from the main list will show up here so you can restore them anytime."
          />
        )
      ) : visibleCount > 0 ? (
        <div className="space-y-10">
          {visibleVerdicts.map((v) => {
            const items = groups.get(v) ?? [];
            if (items.length === 0) return null;
            const meta = VERDICT_META[v];
            return (
              <section key={v} aria-label={`${meta.label} matches`}>
                {/* Section header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${meta.tone} ${meta.borderTone} ${meta.bgTone}`}>
                    <span className={meta.tone}>{meta.icon}</span>
                    {meta.label}
                    <span className="rounded-full bg-current/10 px-1.5 py-0.5 text-[10px] tabular-nums">{items.length}</span>
                  </div>
                  <span className="hidden flex-1 border-t border-dashed border-border/40 sm:block" />
                  <span className="hidden text-xs text-muted-foreground sm:inline">{meta.description}</span>
                </div>

                <StaggerList className="space-y-3">
                  {items.map((m) => (
                    <MatchCard key={m.jobs.id} match={m} verdict={v} isNew={m.seen_at === null} allScores={allScores} />
                  ))}
                </StaggerList>
              </section>
            );
          })}
        </div>
      ) : allRows.length > 0 ? (
        // Sprint 2 Item 18 — clear empty-state when filters slice to zero.
        <EmptyState
          icon={<Eye className="h-5 w-5" />}
          title="No matches in this slice"
          body={
            (selectedCompanies.length > 0 || selectedHubs.length > 0 || minScore !== null)
              ? "Try clearing or widening a filter. There may be roles you'd qualify for hiding behind the current selection."
              : "You may have hidden mismatches. Toggle 'Show all' below to see the full list."
          }
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
// Resume Score Banner
// ─────────────────────────────────────────────────────────────────────────────

function ResumeScoreBanner({ score }: { score: number }) {
  const { gradients, text, grade, desc } =
    score >= 80
      ? { gradients: "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/25", text: "text-emerald-400", grade: score >= 85 ? "Application-ready" : "Strong", desc: "Your resume is highly competitive for top product companies" }
      : score >= 60
        ? { gradients: "from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/25", text: "text-amber-400", grade: "Solid baseline", desc: "Minor improvements will significantly boost match quality" }
        : { gradients: "from-rose-500/15 via-rose-500/5 to-transparent border-rose-500/25", text: "text-rose-400", grade: "Needs work", desc: "Review the tips on your profile to improve match quality" };

  return (
    <Link
      href="/profile#resume-score"
      className={`group relative flex items-center justify-between gap-4 overflow-hidden rounded-2xl border bg-gradient-to-r ${gradients} px-5 py-4 transition hover:border-current/50`}
    >
      <div className="flex items-center gap-4">
        <div className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-current/25 bg-card/40 ${text}`}>
          <div className="absolute inset-0 rounded-2xl" style={{
            background: `conic-gradient(currentColor ${score}%, transparent 0)`,
            opacity: 0.15,
          }} />
          <span className={`text-xl font-bold tabular-nums ${text}`}>{score}</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resume strength</p>
          <p className={`font-display text-base font-bold ${text}`}>{grade}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 opacity-40 transition group-hover:opacity-100" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Match card — premium enterprise SaaS feel
// ─────────────────────────────────────────────────────────────────────────────

function rankingNarrative(verdict: Verdict, topPct: number): string {
  if (verdict === "strong_fit" && topPct <= 15)
    return "Strong must-have alignment — seniority, stack, and domain all signal high recruiter confidence.";
  if (verdict === "strong_fit")
    return `You're in the top ${topPct}% of your matches. Core requirements align — a targeted application is worth the effort.`;
  if (verdict === "stretch" && topPct <= 35)
    return "You meet most of the bar. A focused cover letter on the 1–2 gaps could carry you through initial screening.";
  if (verdict === "stretch")
    return "Major requirements covered with notable gaps. Strengthen the weaknesses flagged above before applying.";
  if (verdict === "underqualified")
    return "This role expects more seniority than your resume currently demonstrates. A realistic target for 12–18 months out.";
  if (verdict === "off_target")
    return "A lateral pivot from your primary domain. Possible, but address the function shift directly in your application.";
  return `Limited alignment with this role's requirements. Focus on closing the gaps above before applying.`;
}

function recruiterConfidence(score: number, verdict: Verdict): { label: string; tone: string } {
  if (verdict === "strong_fit" && score >= 82)
    return { label: "High recruiter confidence", tone: "text-emerald-400" };
  if (verdict === "strong_fit" || (verdict === "stretch" && score >= 68))
    return { label: "Moderate recruiter confidence", tone: "text-amber-400" };
  if (verdict === "underqualified")
    return { label: "Low recruiter confidence", tone: "text-sky-400" };
  if (verdict === "mismatch")
    return { label: "Role mismatch", tone: "text-rose-400" };
  return { label: "Low–moderate confidence", tone: "text-muted-foreground" };
}

function MatchCard({
  match,
  verdict,
  isNew,
  allScores,
  hiddenView = false,
}: {
  match: Pick<MatchRow, "score" | "fit_card" | "reasoning" | "hidden_reason" | "score_breakdown"> & {
    jobs: NonNullable<MatchRow["jobs"]>;
  };
  verdict: Verdict;
  isNew: boolean;
  allScores: number[];
  /** When true: greyed-out card with Restore button instead of Dismiss. */
  hiddenView?: boolean;
}) {
  const job = match.jobs;
  const company = job.companies;
  const meta = VERDICT_META[verdict];
  const card = (match.fit_card as FitCardLite | null) ?? null;
  const oneLiner = card?.one_liner ?? match.reasoning ?? job.jd_summary ?? "";
  const topTweak = card?.resume_tweaks?.find((t) => t.priority === 1) ?? card?.resume_tweaks?.[0];
  const strengths = card?.strengths?.slice(0, 2) ?? [];
  const gaps = card?.gaps?.slice(0, 1) ?? [];
  const scoreBreakdown = asRulesScoreBreakdown(match.score_breakdown);
  const isGhost = job.is_likely_ghost === true;
  const confidence = recruiterConfidence(match.score, verdict);

  const below = allScores.filter(s => s < match.score).length;
  const rankFromTop = allScores.length - below;
  const topPct = allScores.length >= 5 ? Math.round((rankFromTop / allScores.length) * 100) : 0;
  const showRanking = allScores.length >= 5;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`group relative block rounded-2xl border bg-card/40 p-5 transition hover:bg-card/70 ${
        hiddenView
          ? "border-border/40 opacity-60 hover:opacity-100"
          : isNew
            ? "border-emerald-500/30 hover:border-emerald-400/50"
            : "border-border hover:border-primary/25"
      }`}
    >
      {/* New indicator stripe */}
      {isNew && !hiddenView && (
        <div className="absolute left-0 top-0 h-full w-0.5 rounded-l-2xl bg-emerald-400" />
      )}

      {/* Sprint 1 Item 4 — corner dismiss / restore action */}
      <div className="absolute right-3 top-3 z-10">
        {hiddenView
          ? <RestoreButton jobId={job.id} />
          : <DismissButton jobId={job.id} />}
      </div>

      <div className="flex flex-wrap items-start gap-4">

        {/* Company logo + score chip — Sprint 2 Item 20: icon + color, not color alone. */}
        <div className="flex flex-col items-center gap-2">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={48} />
          <div
            className={`flex min-w-[3rem] items-center justify-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold tabular-nums ${meta.scoreTone}`}
            aria-label={`${meta.label} — ${Math.round(match.score)} of 100`}
          >
            <span aria-hidden>{meta.icon}</span>
            {Math.round(match.score)}
          </div>
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
            <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.tone} ${meta.borderTone} ${meta.bgTone}`}>
              {meta.icon}
              {meta.short}
            </div>
            {isNew && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                New
              </span>
            )}
            {isGhost && (
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-500/30 bg-zinc-500/5 px-2 py-0.5 text-[11px] text-zinc-400">
                <Ghost className="h-3 w-3" /> Older listing
              </span>
            )}
            <span className={`ml-auto text-[10px] font-medium ${confidence.tone}`}>
              {confidence.label}
            </span>
          </div>

          {/* Job title */}
          <h3 className="mt-1.5 font-semibold leading-snug group-hover:text-primary transition">
            {job.title}
          </h3>

          {/* One-liner */}
          {oneLiner && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">{oneLiner}</p>
          )}

          {/* Meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(job.hubs ?? []).slice(0, 3).map((h) => (<span key={h}>{h}</span>))}
            {job.comp_lpa_max != null && (
              <span className="font-medium text-primary/80">Up to ₹{job.comp_lpa_max} LPA</span>
            )}
            {job.seniority && (
              <span className="capitalize">{job.seniority}</span>
            )}
            {(job.tech_stack ?? []).slice(0, 3).map((t) => (
              <span key={t} className="rounded bg-secondary/50 px-1.5 py-0.5 font-mono text-[10px]">{t}</span>
            ))}
          </div>

          {/* Inline fit signals — show when Fit Card exists */}
          {(strengths.length > 0 || gaps.length > 0) && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {strengths.length > 0 && (
                <div className="rounded-lg border border-emerald-500/15 bg-emerald-500/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Strength</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{strengths[0]}</p>
                </div>
              )}
              {gaps.length > 0 && (
                <div className="rounded-lg border border-amber-500/15 bg-amber-500/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">Gap</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{gaps[0]}</p>
                </div>
              )}
            </div>
          )}

          {/* Why this score — interactive disclosure */}
          {scoreBreakdown && (
            <WhyScoreToggle breakdown={scoreBreakdown} total={match.score} />
          )}

          {/* Top resume tweak */}
          {topTweak?.suggestion && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Top resume tweak</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{topTweak.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 space-y-2.5 border-t border-border/50 pt-3 text-xs text-muted-foreground">
        {showRanking && (
          <div className="flex items-start gap-3 rounded-lg border border-border/30 bg-secondary/15 px-3 py-2">
            <div className="shrink-0 text-center min-w-[2.75rem]">
              <p className={`text-xs font-bold tabular-nums ${meta.tone}`}>Top {topPct}%</p>
              <p className="text-[9px] text-muted-foreground/70">{allScores.length} matches</p>
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Why you rank here</p>
              <p className="leading-relaxed text-muted-foreground">{rankingNarrative(verdict, topPct)}</p>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="font-medium text-foreground/70 group-hover:text-primary transition">Open Fit Card</span>
            <ChevronRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
          </span>
          {job.apply_url && (
            <ApplyButton jobId={job.id} applyUrl={job.apply_url} variant="compact" />
          )}
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Relative-time helper
// ─────────────────────────────────────────────────────────────────────────────

function humanAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just now";
  const min = 60_000, hr = 3_600_000, day = 86_400_000;
  if (diff < min)     return "just now";
  if (diff < hr)      return `${Math.round(diff / min)}m ago`;
  if (diff < day)     return `${Math.round(diff / hr)}h ago`;
  if (diff < 7 * day) return `${Math.round(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString();
}
