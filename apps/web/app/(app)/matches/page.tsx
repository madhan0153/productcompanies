import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ChevronRight, Eye,
  ArrowUpRight, Activity,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import type { Verdict, Json } from "@/lib/supabase/types";
import { ComputeButton } from "./compute-button";
import { MatchFilters } from "./filters";
import { MatchCard, type MatchCardData } from "./match-card";
import { BandStrip, classifyMatch, type MatchTab, type BandCounts } from "./band-strip";
import { MissingSkillsBanner, aggregateMissingSkills } from "./missing-skills-banner";

export const metadata: Metadata = { title: "Matches" };
export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MatchRow = MatchCardData & {
  verdict: Verdict | null;
  fit_card_at: string | null;
  computed_at: string;
  seen_at: string | null;
  user_hidden: boolean;
  /** Phase G derived field — kept for routing/cap reads. */
  hidden_reason: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; h?: string; min_score?: string; show?: string; tab?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const selectedCompanies = (params.c ?? "").split(",").filter(Boolean);
  const selectedHubs = (params.h ?? "").split(",").filter(Boolean);
  const minScore = params.min_score ? parseInt(params.min_score, 10) : null;

  // Sprint 6 — Tab is the spine. Back-compat with the legacy ?show= param:
  //   ?show=new     → tab=new
  //   ?show=hidden  → tab=dismissed
  //   ?show=all     → tab=filtered (lets users see capped/mismatched)
  // Default tab is "shortlist" so the user lands on actionable rows.
  const legacyShow = params.show;
  const tab: MatchTab =
    (params.tab as MatchTab) ??
    (legacyShow === "new"    ? "new"
    : legacyShow === "hidden" ? "dismissed"
    : legacyShow === "all"    ? "filtered"
    : "shortlist");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_score, resume_score_at, last_match_compute_at")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_storage_path: string | null; resume_score: number | null; last_match_compute_at: string | null } | null };

  const hasResume = !!profile?.resume_storage_path;
  const resumeScore = profile?.resume_score ?? null;
  const lastComputeAt = profile?.last_match_compute_at ?? null;

  // Single read, all visible+hidden+dismissed. We slice in-memory by tab —
  // 500-row cap holds for our 18-company catalog (~1000 active matches per
  // user max, but most are already capped/hidden so ≤500 visible).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("matches")
    .select(`
      score, verdict, fit_card, fit_card_at, hidden_reason, reasoning, computed_at, seen_at,
      score_breakdown, user_hidden,
      confidence, hard_cap_reason, tech_coverage, feedback_adjustment,
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
  const allScores = allRows.map(m => m.score).sort((a, b) => a - b);

  // Counts for the band strip — pre-filter by company/hub but NOT by tab,
  // so the strip always shows the same numbers regardless of which tab the
  // user is on.
  const passesScopeFilters = (m: MatchRow) => {
    const slug = m.jobs.companies?.slug ?? "";
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(slug)) return false;
    const hubs = m.jobs.hubs ?? [];
    if (selectedHubs.length > 0 && !hubs.some((h) => selectedHubs.includes(h))) return false;
    return true;
  };
  const scopedRows = allRows.filter(passesScopeFilters);

  const bandCounts: BandCounts = scopedRows.reduce<BandCounts>(
    (acc, m) => {
      const cls = classifyMatch(m);
      if (cls === "shortlist")    acc.shortlist++;
      if (cls === "worth_a_look") acc.worthALook++;
      if (cls === "filtered")     acc.filtered++;
      if (cls === "dismissed")    acc.dismissed++;
      if (m.seen_at === null && !m.user_hidden) acc.newCount++;
      return acc;
    },
    { shortlist: 0, worthALook: 0, filtered: 0, newCount: 0, dismissed: 0 },
  );

  // Tab slicing — single source of truth.
  const tabRows = scopedRows.filter((m) => {
    const cls = classifyMatch(m);
    if (tab === "shortlist")    return cls === "shortlist";
    if (tab === "worth_a_look") return cls === "worth_a_look";
    if (tab === "filtered")     return cls === "filtered";
    if (tab === "dismissed")    return cls === "dismissed";
    if (tab === "new")          return m.seen_at === null && !m.user_hidden;
    return true;
  });

  // Sprint 6 — fold in application status for the cards in view.
  const visibleJobIds = tabRows.map((m) => m.jobs.id);
  const applicationStatus = new Map<string, string>();
  if (visibleJobIds.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: apps } = await (supabase
      .from("applications")
      .select("job_id, status")
      .eq("user_id", user.id)
      .in("job_id", visibleJobIds) as any) as { data: Array<{ job_id: string; status: string }> | null };
    for (const a of apps ?? []) applicationStatus.set(a.job_id, a.status);
  }

  // Mark unseen items in this tab as seen (fire-and-forget — same as before).
  const unseenInTab = tabRows.filter((m) => m.seen_at === null).map((m) => m.jobs.id);
  if (unseenInTab.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase.from("matches") as any)
      .update({ seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("job_id", unseenInTab)
      .is("seen_at", null);
  }

  // Filter chip data — companies/hubs derived from the full scope, not the
  // tab slice, so users can switch companies even while in "Filtered".
  const companies = [...new Map(
    allRows
      .map((m) => m.jobs.companies)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => [c.slug, { slug: c.slug, name: c.name }]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));
  const allHubs = [...new Set(allRows.flatMap((m) => m.jobs.hubs ?? []))].sort();

  // Missing-skills aggregation — across the CURRENT tab + scope, not the
  // whole catalog. Updates dynamically as the user filters.
  const missingSkills = aggregateMissingSkills({
    rows: tabRows.map((m) => ({ score: m.score, tech_coverage: m.tech_coverage })),
  });

  const newCount       = scopedRows.filter((m) => m.seen_at === null && !m.user_hidden).length;
  const computeAgo     = lastComputeAt ? humanAgo(lastComputeAt) : null;

  // URL builder for the band strip — preserves company/hub/min_score filters
  // across tab changes so a user filtered by Apple+Hyderabad doesn't lose
  // them when they hop to "Worth a look".
  const buildHref = (nextTab: MatchTab): string => {
    const sp = new URLSearchParams();
    if (selectedCompanies.length > 0) sp.set("c", selectedCompanies.join(","));
    if (selectedHubs.length > 0)      sp.set("h", selectedHubs.join(","));
    if (minScore !== null)            sp.set("min_score", String(minScore));
    if (nextTab !== "shortlist")      sp.set("tab", nextTab);
    const qs = sp.toString();
    return qs ? `/matches?${qs}` : "/matches";
  };

  const scopeLabel = (() => {
    const parts: string[] = [];
    if (tab === "shortlist")    parts.push("your shortlist");
    if (tab === "worth_a_look") parts.push("worth-a-look matches");
    if (tab === "filtered")     parts.push("filtered roles");
    if (tab === "new")          parts.push("new since last visit");
    if (tab === "dismissed")    parts.push("dismissed roles");
    if (selectedCompanies.length > 0) parts.push(`${selectedCompanies.length} compan${selectedCompanies.length === 1 ? "y" : "ies"}`);
    if (selectedHubs.length > 0)      parts.push(`${selectedHubs.length} hub${selectedHubs.length === 1 ? "" : "s"}`);
    return parts.join(" · ");
  })();

  return (
    <div className="space-y-6 pb-6">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Matches</h1>
          {allRows.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-success tabular-nums">{bandCounts.shortlist}</span> shortlist
              {" · "}<span className="tabular-nums">{bandCounts.worthALook}</span> worth a look
              {" · "}<span className="opacity-60 tabular-nums">{bandCounts.filtered}</span> filtered
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">Compute your first matches below</p>
          )}
          {computeAgo && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-3 w-3 text-success" />
              <span>
                Last refreshed {computeAgo}
                {newCount > 0 && tab !== "new" && (
                  <> · <Link href={buildHref("new")} className="font-medium text-success hover:underline focus-ring rounded">{newCount} new</Link></>
                )}
              </span>
            </div>
          )}
        </div>
        <ComputeButton hasResume={hasResume} />
      </div>

      {/* ── Resume score banner ────────────────────────────────── */}
      {hasResume && resumeScore !== null && (
        <ResumeScoreBanner score={resumeScore} />
      )}

      {/* ── No-resume prompt ───────────────────────────────────── */}
      {!hasResume && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
          <h2 className="font-semibold">Start with your resume</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Upload your PDF — we&apos;ll parse it, score your resume against live demand from 18 product companies, and rank every active role with a structured Fit Card.
          </p>
          <Link
            href="/profile"
            className="press mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Upload resume <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* ── Band strip — sticky tab spine ───────────────────────── */}
      {allRows.length > 0 && (
        <BandStrip counts={bandCounts} active={tab} buildHref={buildHref} />
      )}

      {/* ── Filters (company/hub/min-score) ─────────────────────── */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
          totalCount={allRows.length}
          filteredCount={scopedRows.length}
        />
      )}

      {/* ── Missing-skills banner — scoped to current tab ──────── */}
      {tabRows.length > 0 && (tab === "shortlist" || tab === "worth_a_look") && (
        <MissingSkillsBanner data={missingSkills} scopeLabel={scopeLabel} />
      )}

      {/* ── Filtered tab inline note ────────────────────────────── */}
      {tab === "filtered" && tabRows.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-md border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            These roles scored below 40, hit a hard cap, or were classified as a mismatch. Most users skip them — but if you want to see why each was filtered, open the Fit Card on any row.
          </p>
        </div>
      )}

      {/* ── Card list ───────────────────────────────────────────── */}
      {tabRows.length > 0 ? (
        <StaggerList className="space-y-3">
          {tabRows.map((m) => (
            <MatchCard
              key={m.jobs.id}
              match={m}
              verdict={(m.verdict ?? "stretch") as Verdict}
              isNew={m.seen_at === null && !m.user_hidden}
              allScores={allScores}
              applicationStatus={applicationStatus.get(m.jobs.id) ?? null}
              hiddenView={tab === "dismissed"}
            />
          ))}
        </StaggerList>
      ) : allRows.length > 0 ? (
        emptyStateForTab(tab, selectedCompanies.length + selectedHubs.length + (minScore !== null ? 1 : 0))
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
// Empty states per tab — keeps the user oriented when a slice is empty.
// ─────────────────────────────────────────────────────────────────────────────

function emptyStateForTab(tab: MatchTab, activeFilterCount: number): React.ReactNode {
  if (activeFilterCount > 0) {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" />}
        title="No matches in this slice"
        body="Try clearing or widening a filter — there may be roles you'd qualify for hiding behind the current selection."
        actions={[{ label: "Clear filters", href: `/matches?tab=${tab}`, variant: "primary" }]}
      />
    );
  }
  if (tab === "shortlist") {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="Your shortlist is empty"
        body="Nothing scored ≥60 yet. Check 'Worth a look' for partial fits, or set your preferred hubs / strengthen your resume to lift more roles."
        actions={[
          { label: "Worth a look", href: "/matches?tab=worth_a_look", variant: "primary" },
          { label: "Edit profile", href: "/profile", variant: "ghost" },
        ]}
      />
    );
  }
  if (tab === "worth_a_look") {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" />}
        title="Nothing in this range"
        body="No matches between 40 and 60. Likely most of your matches are either strong fits or capped."
      />
    );
  }
  if (tab === "new") {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="No new matches yet"
        body="The catalog refreshes daily. Anything new since your last visit will surface here."
      />
    );
  }
  if (tab === "dismissed") {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" />}
        title="No dismissed roles"
        body="Roles you dismiss from the main list will show up here so you can restore them anytime."
      />
    );
  }
  return (
    <EmptyState
      icon={<Eye className="h-5 w-5" />}
      title="Nothing here"
      body="Switch tabs above to see your shortlist or worth-a-look roles."
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume Score Banner — unchanged from previous version.
// ─────────────────────────────────────────────────────────────────────────────

function ResumeScoreBanner({ score }: { score: number }) {
  const { tone, ringTone, grade, desc } =
    score >= 80
      ? { tone: "text-success",   ringTone: "stroke-success",     grade: score >= 85 ? "Application-ready" : "Strong",
          desc: "Your resume is highly competitive for top product companies" }
      : score >= 60
        ? { tone: "text-warning", ringTone: "stroke-warning",     grade: "Solid baseline",
            desc: "Minor improvements will significantly boost match quality" }
        : { tone: "text-destructive", ringTone: "stroke-destructive", grade: "Needs work",
            desc: "Review the tips on your profile to improve match quality" };

  const circ = 2 * Math.PI * 22;
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ;

  return (
    <Link
      href="/profile#resume-score"
      className="group flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring"
    >
      <div className="flex items-center gap-4">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
            <circle
              cx="28" cy="28" r="22"
              fill="none"
              strokeWidth="4"
              strokeLinecap="round"
              className={ringTone}
              strokeDasharray={circ}
              strokeDashoffset={offset}
            />
          </svg>
          <span className={`text-base font-semibold tabular-nums ${tone}`}>{score}</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resume strength</p>
          <p className={`text-base font-semibold ${tone}`}>{grade}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{desc}</p>
        </div>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
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

// Suppress unused-Json complaint at the type-level (referenced by MatchCardData).
export type { Json };
