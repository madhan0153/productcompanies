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
import { ComputeProvider, ComputeTrigger, ComputeStatusBanner } from "./compute-button";
import { MatchFilters } from "./filters";
import { MatchCard, type MatchCardData } from "./match-card";
import { BandStrip } from "./band-strip";
import { classifyMatch, type MatchTab, type BandCounts } from "./match-types";
import { MatchesURLBeacon } from "./matches-url-beacon";
import { MatchNavProvider } from "./match-transition-context";
import { MatchCardArea } from "./match-card-area";

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

  // Tabs spine. Back-compat with the legacy ?show= param.
  const legacyShow = params.show;
  const requestedTab = (params.tab as MatchTab | undefined) ??
    (legacyShow === "all" ? "filtered" : undefined);
  const tab: MatchTab =
    requestedTab === "filtered" || requestedTab === "worth_a_look" || requestedTab === "shortlist"
      ? requestedTab
      : "shortlist";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_score, resume_score_at, last_match_compute_at")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_storage_path: string | null; resume_score: number | null; last_match_compute_at: string | null } | null };

  const hasResume = !!profile?.resume_storage_path;
  const resumeScore = profile?.resume_score ?? null;
  const lastComputeAt = profile?.last_match_compute_at ?? null;

  // Accurate band counts via parallel head-count queries — each is a fast
  // indexed COUNT(*) that bypasses the PostgREST max_rows cap. Scope filters
  // (company, hub) apply server-side so the strip honours them.
  // Dismiss was removed — there is no longer a user_hidden filter.
  const baseCountQuery = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let q: any = supabase
      .from("matches")
      .select("user_id, jobs!inner(id, hubs, companies!inner(slug))", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (selectedCompanies.length > 0) q = q.in("jobs.companies.slug", selectedCompanies);
    if (selectedHubs.length > 0)      q = q.overlaps("jobs.hubs", selectedHubs);
    return q;
  };

  const [
    cShortlist, cWorthALook, cFilteredLow, cFilteredHidden,
  ] = await Promise.all([
    baseCountQuery().gte("score", 60).is("hidden_reason", null),
    baseCountQuery().gte("score", 40).lt("score", 60).is("hidden_reason", null),
    baseCountQuery().lt("score", 40).is("hidden_reason", null),
    baseCountQuery().not("hidden_reason", "is", null),
  ]);

  const bandCounts: BandCounts = {
    shortlist:  cShortlist.count ?? 0,
    worthALook: cWorthALook.count ?? 0,
    filtered:   (cFilteredLow.count ?? 0) + (cFilteredHidden.count ?? 0),
  };

  // Single read for the tab's visible cards — capped at 500 so SSR stays
  // fast. The band-strip counts above are accurate beyond the cap, so the
  // user always sees the truthful number even if the list is paginated.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from("matches")
    .select(`
      score, verdict, fit_card, fit_card_at, hidden_reason, reasoning, computed_at, seen_at,
      score_breakdown,
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

  // Scope filter — applied in-memory to the 500-row list. The band counts
  // above already applied the same predicates server-side, so the strip
  // numbers are unaffected by this client-side narrowing.
  const passesScopeFilters = (m: MatchRow) => {
    const slug = m.jobs.companies?.slug ?? "";
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(slug)) return false;
    const hubs = m.jobs.hubs ?? [];
    if (selectedHubs.length > 0 && !hubs.some((h) => selectedHubs.includes(h))) return false;
    return true;
  };
  const scopedRows = allRows.filter(passesScopeFilters);

  // Tab slicing — single source of truth.
  const tabRows = scopedRows.filter((m) => {
    const cls = classifyMatch(m);
    if (tab === "shortlist")    return cls === "shortlist";
    if (tab === "worth_a_look") return cls === "worth_a_look";
    if (tab === "filtered")     return cls === "filtered";
    return false;
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

  const computeAgo = lastComputeAt ? humanAgo(lastComputeAt) : null;

  return (
    <MatchNavProvider>
    <ComputeProvider hasResume={hasResume}>
    <div className="space-y-4 pb-6">

      {/* Session-history beacon */}
      <MatchesURLBeacon />

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Matches</h1>
          {computeAgo ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Activity className="h-3 w-3 text-success" />
              <span>Computed {computeAgo}</span>
            </div>
          ) : allRows.length === 0 ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground">Compute your first matches</p>
          ) : null}
        </div>
        <ComputeTrigger />
      </div>

      {/* ── Compute status banner — full-width, only when running/error ─ */}
      <ComputeStatusBanner />

      {/* ── No-resume prompt — only when there's actually no resume ─ */}
      {!hasResume && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
          <h2 className="text-sm font-semibold">Start with your resume</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Upload your PDF — we&apos;ll parse it, score your resume against live demand from 18 product companies, and rank every active role with a structured Fit Card.
          </p>
          <Link
            href="/profile"
            className="press mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Upload resume <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}

      {/* ── Band strip — sticky tab spine, right under title ─────── */}
      {allRows.length > 0 && (
        <BandStrip
          counts={bandCounts}
          active={tab}
          selectedCompanies={selectedCompanies}
          selectedHubs={selectedHubs}
          minScore={minScore}
        />
      )}

      {/* ── Filters (company/hub/min-score) ─────────────────────── */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
        />
      )}

      {/* ── Resume score strip — only when score < 60 (where the
          weak-resume → weak-matches connection actually matters).
          Strong/Application-ready scores hide entirely. */}
      {hasResume && resumeScore !== null && resumeScore < 60 && (
        <ResumeScoreStrip score={resumeScore} />
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
      <MatchCardArea>
        {tabRows.length > 0 ? (
          <>
            <StaggerList key={tab} className="space-y-3">
              {tabRows.map((m) => (
                <MatchCard
                  key={m.jobs.id}
                  match={m}
                  verdict={(m.verdict ?? "stretch") as Verdict}
                  isNew={m.seen_at === null}
                  allScores={allScores}
                  applicationStatus={applicationStatus.get(m.jobs.id) ?? null}
                />
              ))}
            </StaggerList>
            {(() => {
              const tabExpected =
                tab === "shortlist"    ? bandCounts.shortlist
                : tab === "worth_a_look" ? bandCounts.worthALook
                : bandCounts.filtered;
              if (tabExpected > tabRows.length) {
                return (
                  <p className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-2.5 text-center text-xs text-muted-foreground">
                    Showing top <span className="font-semibold tabular-nums text-foreground">{tabRows.length}</span> — apply a company or hub filter to narrow results.
                  </p>
                );
              }
              return null;
            })()}
          </>
        ) : allRows.length > 0 ? (
          emptyStateForTab(tab, selectedCompanies.length + selectedHubs.length + (minScore !== null ? 1 : 0))
        ) : hasResume ? (
          <EmptyState
            icon={<Activity className="h-5 w-5" />}
            title="No matches computed yet"
            body="Click 'Compute matches' above. We rank every active role across 18 product companies, drop hard mismatches, and write a Fit Card for the top 25."
          />
        ) : null}
      </MatchCardArea>
    </div>
    </ComputeProvider>
    </MatchNavProvider>
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
        title="No priority matches yet"
        body="Nothing scored ≥60 yet. Check Explore for partial fits, or set your preferred hubs / strengthen your resume to lift more roles."
        actions={[
          { label: "See Explore matches", href: "/matches?tab=worth_a_look", variant: "primary" },
          { label: "Edit profile", href: "/profile", variant: "ghost" },
        ]}
      />
    );
  }
  if (tab === "worth_a_look") {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" />}
        title="Nothing in Explore"
        body="No matches between 40 and 60. Most roles are likely either priority candidates or filtered out."
      />
    );
  }
  return (
    <EmptyState
      icon={<Eye className="h-5 w-5" />}
      title="No filtered roles"
      body="Switch to Priority or Explore to see your matched roles."
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Resume Score Strip — compact 1-line alert. Only renders for score < 60.
// Above 60 the resume isn't the bottleneck, so the strip stays hidden and
// the matches page is purely about matches.
// ─────────────────────────────────────────────────────────────────────────────

function ResumeScoreStrip({ score }: { score: number }) {
  const tone = score < 40 ? "destructive" : "warning";
  const grade = score < 40 ? "Needs work" : "Could be stronger";
  const tones = {
    destructive: { border: "border-destructive/30", bg: "bg-destructive/5",  pill: "bg-destructive text-destructive-foreground", text: "text-destructive" },
    warning:     { border: "border-warning/30",     bg: "bg-warning/5",      pill: "bg-warning text-warning-foreground",         text: "text-warning"     },
  }[tone];

  return (
    <Link
      href="/profile#resume-score"
      className={`group flex items-center justify-between gap-2 rounded-lg border ${tones.border} ${tones.bg} px-3 py-2 text-xs transition hover:border-foreground/30 focus-ring`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${tones.pill}`}>
          {score}
        </span>
        <span className="truncate">
          Resume score: <strong className={tones.text}>{grade}</strong>{" "}
          <span className="text-muted-foreground">— this is capping your matches</span>
        </span>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
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
