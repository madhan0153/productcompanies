import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { Eye, Activity, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import type { Verdict, Json } from "@/lib/supabase/types";
import { MatchFilters } from "./filters";
import { MatchCard, type MatchCardData } from "./match-card";
import { BandStrip } from "./band-strip";
import { classifyMatch, type MatchTab, type BandCounts } from "./match-types";
import { MatchesURLBeacon } from "./matches-url-beacon";
import { MatchNavProvider } from "./match-transition-context";
import { MatchCardArea } from "./match-card-area";
import { ComputingBanner } from "./computing-banner";
import { ComputeAutoRefresh } from "./compute-auto-refresh";
import { LockedMatchesPanel } from "./locked-card";
import { getEntitlements } from "@/lib/billing/entitlements";
import { PLAN_LIMITS } from "@/lib/billing/catalog";

export const metadata: Metadata = { title: "Matches" };
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

type MatchRow = MatchCardData & {
  verdict: Verdict | null;
  fit_card_at: string | null;
  computed_at: string;
  seen_at: string | null;
  /** Phase G derived field — kept for routing/cap reads. */
  hidden_reason: string | null;
};

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; h?: string; min_score?: string; show?: string; tab?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const selectedCompanies = (params.c ?? "").split(",").filter(Boolean);
  const selectedHubs = (params.h ?? "").split(",").filter(Boolean);
  const minScore = params.min_score ? parseInt(params.min_score, 10) : null;

  // Tabs spine. Only two visible tabs: Priority (shortlist) and Explore.
  const requestedTab = params.tab as MatchTab | undefined;
  const tab: MatchTab =
    requestedTab === "worth_a_look" ? "worth_a_look" : "shortlist";


  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_score, resume_score_at, last_match_compute_at, active_resume_version_id, matches_resume_version_id")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_score: number | null; resume_score_at: string | null; last_match_compute_at: string | null; active_resume_version_id: string | null; matches_resume_version_id: string | null } | null };

  const resumeScore = profile?.resume_score ?? null;
  const lastComputeAt = profile?.last_match_compute_at ?? null;
  const activeResumeVersionId = profile?.active_resume_version_id ?? null;
  const matchesResumeVersionId = profile?.matches_resume_version_id ?? null;
  const hasActiveResume = !!activeResumeVersionId;
  const needsFreshCompute = Boolean(
    activeResumeVersionId && activeResumeVersionId !== matchesResumeVersionId,
  );

  // Detect whether a match-compute job is actively running for this exact
  // resume version. A stale resume is not the same thing as an active compute:
  // if no job is queued/running, the page should prompt the user instead of
  // showing endless progress.
  let isComputing = false;
  if (hasActiveResume) {
    try {
      const { count } = await ((admin.from("background_jobs") as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("job_type", "match_compute")
        .eq("resume_version_id", activeResumeVersionId)
        .in("status", ["queued", "running"]) as any) as { count: number | null };
      isComputing = (count ?? 0) > 0;
    } catch {
      // background_jobs might not exist on fresh schemas — fail quietly.
    }
  }
  let latestComputeError: string | null = null;
  if (hasActiveResume && activeResumeVersionId) {
    try {
      const { data: latestCompute } = await ((admin.from("background_jobs") as any)
        .select("status, error_message")
        .eq("user_id", user.id)
        .eq("job_type", "match_compute")
        .eq("resume_version_id", activeResumeVersionId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any) as { data: { status: string; error_message: string | null } | null };
      if (latestCompute?.status === "failed") {
        latestComputeError = latestCompute.error_message ?? "Match computation failed. Your previous matches are still available.";
      }
    } catch {
      latestComputeError = null;
    }
  }

  // End-user fix (EU-2): show "Jobs updated Nh ago" so users can trust the
  // freshness of the underlying inventory. Reads the most-recent successful
  // crawl_run timestamp. Cheap: single indexed lookup.
  let lastCrawlAt: string | null = null;
  try {
    const { data: lastCrawl } = (await (admin
      .from("crawl_runs")
      .select("started_at")
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle() as unknown as Promise<{ data: { started_at: string } | null }>));
    lastCrawlAt = lastCrawl?.started_at ?? null;
  } catch {
    // crawl_runs may not exist on a brand-new schema — fail quietly.
  }

  // Accurate band counts via parallel head-count queries — each is a fast
  // indexed COUNT(*) that bypasses the PostgREST max_rows cap. Scope filters
  // (company, hub) apply server-side so the strip honours them.
  // Dismiss was removed — there is no longer a user_hidden filter.
  const baseCountQuery = () => {
    let q: any = supabase
      .from("matches")
      .select("user_id, jobs!inner(id, hubs, companies!inner(slug))", { count: "exact", head: true })
      .eq("user_id", user.id);
    if (selectedCompanies.length > 0) q = q.in("jobs.companies.slug", selectedCompanies);
    if (selectedHubs.length > 0)      q = q.overlaps("jobs.hubs", selectedHubs);
    // Apply minScore to counts so the strip numbers match the card list.
    if (minScore !== null)            q = q.gte("score", minScore);
    return q;
  };

  const [cShortlist, cWorthALook] = await Promise.all([
    baseCountQuery().gte("score", 60).is("hidden_reason", null),
    baseCountQuery().gte("score", 40).lt("score", 60).is("hidden_reason", null),
  ]);

  const bandCounts: BandCounts = {
    shortlist:  cShortlist.count ?? 0,
    worthALook: cWorthALook.count ?? 0,
  };

  // Single read for the tab's visible cards — capped at 500 so SSR stays
  // fast. The band-strip counts above are accurate beyond the cap, so the
  // user always sees the truthful number even if the list is paginated.

  // QA fix (B10): bump the hard cap to 1000 and surface a "showing N of M"
  // indicator further down if the visible tab is truncated. The accurate
  // band counts above already report the true total — this just ensures
  // the card list doesn't silently lose rows for power users.
  const MATCH_LIST_CAP = 1000;
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
    .limit(MATCH_LIST_CAP);

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
  const tabRowsAll = scopedRows.filter((m) => classifyMatch(m) === tab);

  // ── Free-tier gating ────────────────────────────────────────────────────
  // Free users see 6 priority matches (from DIFFERENT companies, highest
  // score per company) + 14 explore matches. Anything beyond renders as
  // blurred locked cards with emotional copy. Paid users see everything.
  const entitlements = await getEntitlements(user.id).catch(() => null);
  const isFreePlan   = !entitlements || entitlements.plan === "free";
  const PRIORITY_FREE = PLAN_LIMITS.free.priorityMatchesShown;  // 6
  const EXPLORE_FREE  = PLAN_LIMITS.free.matchesViewLimit - PRIORITY_FREE; // 14

  let tabRows = tabRowsAll;
  let lockedRows: typeof tabRowsAll = [];

  if (isFreePlan) {
    if (tab === "shortlist") {
      // Priority: dedupe by company_id, keep highest-scoring role per company,
      // take top 6 across companies, lock the rest.
      const seenCompanies = new Set<string>();
      const uniqueByCompany: typeof tabRowsAll = [];
      const overflow: typeof tabRowsAll = [];
      for (const row of tabRowsAll) {
        const slug = row.jobs.companies?.slug ?? row.jobs.id;
        if (!seenCompanies.has(slug) && uniqueByCompany.length < PRIORITY_FREE) {
          seenCompanies.add(slug);
          uniqueByCompany.push(row);
        } else {
          overflow.push(row);
        }
      }
      tabRows    = uniqueByCompany;
      lockedRows = overflow;
    } else {
      // Explore: simple top-N by existing sort, lock the rest.
      tabRows    = tabRowsAll.slice(0, EXPLORE_FREE);
      lockedRows = tabRowsAll.slice(EXPLORE_FREE);
    }
  }
  const lockedCount = lockedRows.length;

  // Sprint 6 — fold in application status for the cards in view.
  const visibleJobIds = tabRows.map((m) => m.jobs.id);
  const applicationStatus = new Map<string, string>();
  if (visibleJobIds.length > 0) {

    const { data: apps } = await (supabase
      .from("applications")
      .select("job_id, status")
      .eq("user_id", user.id)
      .in("job_id", visibleJobIds) as any) as { data: Array<{ job_id: string; status: string }> | null };
    for (const a of apps ?? []) applicationStatus.set(a.job_id, a.status);
  }

  // QA fix (B11): the seen-mark used to run inline as a fire-and-forget
  // void during RSC render. That kept the Supabase call on the response-
  // critical path even though we didn't await it. Move it into after() so
  // the response streams to the client first, then the mark happens.
  const unseenInTab = tabRows.filter((m) => m.seen_at === null).map((m) => m.jobs.id);
  if (unseenInTab.length > 0) {
    const userId = user.id;
    const jobIds = unseenInTab;
    after(async () => {
      try {
        await (supabase.from("matches") as any)
          .update({ seen_at: new Date().toISOString() })
          .eq("user_id", userId)
          .in("job_id", jobIds)
          .is("seen_at", null);
      } catch {
        // Silently swallow — next page load will pick up the unseen rows.
      }
    });
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
  const crawlAgo = lastCrawlAt ? humanAgo(lastCrawlAt) : null;

  return (
    <MatchNavProvider>
    <div className="space-y-4 pb-6">

      {/* Session-history beacon */}
      <MatchesURLBeacon />

      {/* Live-refresh while a compute is in flight — covers BOTH the first
          compute (no rows yet) and the replace flow (old rows visible). The
          page re-renders with isComputing=false the moment the background job
          stamps matches_resume_version_id, and this poller unmounts itself. */}
      {isComputing && <ComputeAutoRefresh />}

      {/* Header — freshness pills only. User-triggered computes run after the
          reviewed resume is submitted; daily crawl recompute still refreshes
          already-active resumes. */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Matches</h1>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            {computeAgo ? (
              <span className="inline-flex items-center gap-1">
                <Activity className="h-3 w-3 text-success" />
                Computed {computeAgo}
              </span>
            ) : null}
            {crawlAgo && (
              <span
                title="When the daily crawler last completed a successful run."
                className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2 py-0.5 text-[10px] font-medium"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
                Jobs updated {crawlAgo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Single progress card whenever a compute is in flight — covers both
          the first-time (no rows yet) and replace (old rows visible) flows.
          The ComputeAutoRefresh poller above swaps in fresh matches the moment
          the background job finishes, so this is the only status the user
          needs to see. */}
      {isComputing && <ComputingBanner hasExisting={allRows.length > 0} />}

      {!isComputing && latestComputeError && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <p className="font-semibold">Could not refresh matches for the latest resume</p>
          <p className="mt-1 text-xs text-warning/85">
            {latestComputeError} Previous matches remain visible so you do not lose your shortlist.
          </p>
        </div>
      )}

      {!isComputing && needsFreshCompute && allRows.length > 0 && (
        <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
          These matches are from your previous resume. Use the Compute Matches button after submitting your reviewed resume to refresh rankings.
        </div>
      )}

      {/* Band strip — sticky tab spine, right under title */}
      {allRows.length > 0 && (
        <BandStrip
          counts={bandCounts}
          active={tab}
          selectedCompanies={selectedCompanies}
          selectedHubs={selectedHubs}
          minScore={minScore}
        />
      )}

      {/* Filters (company/hub/min-score) */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
        />
      )}

      {/* Resume score strip — only when score < 60 (where the
          weak-resume -†’ weak-matches connection actually matters).
          Strong/Application-ready scores hide entirely. */}
      {hasActiveResume && resumeScore !== null && resumeScore < 60 && (
        <ResumeScoreStrip score={resumeScore} />
      )}

      {/* Card list */}
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

            {/* Locked premium panel for free users — single beautiful card
                with rotating quotes (replaces the clumsy 8-card grid). */}
            {isFreePlan && lockedCount > 0 && (
              <LockedMatchesPanel count={lockedCount} tab={tab} />
            )}

            {(() => {
              // Paid users: show "showing N of M" if the visible list is
              // truncated below the true band count. Free users: hide this
              // (the locked-cards strip above already conveys the count).
              if (isFreePlan) return null;
              const tabExpected =
                tab === "shortlist" ? bandCounts.shortlist : bandCounts.worthALook;
              if (tabExpected > tabRows.length) {
                return (
                  <p className="rounded-md border border-dashed border-border bg-secondary/30 px-4 py-2.5 text-center text-xs text-muted-foreground">
                    Showing top <span className="font-semibold tabular-nums text-foreground">{tabRows.length}</span> of <span className="font-semibold tabular-nums text-foreground">{tabExpected}</span> — apply a company or hub filter to narrow results.
                  </p>
                );
              }
              return null;
            })()}
          </>
        ) : allRows.length > 0 ? (
          emptyStateForTab(tab, selectedCompanies.length + selectedHubs.length + (minScore !== null ? 1 : 0))
        ) : hasActiveResume ? (
          isComputing ? null : (
            needsFreshCompute ? (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="Ready to compute matches"
                body="Your reviewed resume is saved. Start Compute Matches from the resume editor to rank active jobs against it."
                actions={[{ label: "Back to resume editor", href: "/profile/resume", variant: "primary" }]}
              />
            ) : (
              <EmptyState
                icon={<Activity className="h-5 w-5" />}
                title="No matches computed yet"
                body="Submit your reviewed resume, then use Compute Matches to rank active jobs against it."
                actions={[{ label: "Open resume editor", href: "/profile/resume", variant: "primary" }]}
              />
            )
          )
        ) : null}
      </MatchCardArea>
    </div>
    </MatchNavProvider>
  );
}

// ----------------------------------------------------------------------
// Empty states per tab — keeps the user oriented when a slice is empty.
// ----------------------------------------------------------------------

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
        body="Nothing scored ≥60 yet. Check Explore for partial fits, or strengthen your resume to lift more roles."
        actions={[
          { label: "See Explore matches", href: "/matches?tab=worth_a_look", variant: "primary" },
          { label: "Edit profile", href: "/profile", variant: "ghost" },
        ]}
      />
    );
  }
  return (
    <EmptyState
      icon={<Eye className="h-5 w-5" />}
      title="Nothing in Explore"
      body="No matches between 40 and 60. Check Priority for your strongest fits."
      actions={[{ label: "See Priority matches", href: "/matches", variant: "primary" }]}
    />
  );
}

// ----------------------------------------------------------------------
// Resume Score Strip — compact 1-line alert. Only renders for score < 60.
// Above 60 the resume isn't the bottleneck, so the strip stays hidden and
// the matches page is purely about matches.
// ----------------------------------------------------------------------

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

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

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
