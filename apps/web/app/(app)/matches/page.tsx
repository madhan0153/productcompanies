import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { after } from "next/server";
import {
  Eye,
  ArrowUpRight, Activity,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getResumeMatchStatus } from "@/lib/resume/readiness";
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Types
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type MatchRow = MatchCardData & {
  verdict: Verdict | null;
  fit_card_at: string | null;
  computed_at: string;
  seen_at: string | null;
  /** Phase G derived field â€” kept for routing/cap reads. */
  hidden_reason: string | null;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Page
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // Tabs spine. Back-compat with the legacy ?show= param.
  const legacyShow = params.show;
  const requestedTab = (params.tab as MatchTab | undefined) ??
    (legacyShow === "all" ? "filtered" : undefined);
  const tab: MatchTab =
    requestedTab === "filtered" || requestedTab === "worth_a_look" || requestedTab === "shortlist"
      ? requestedTab
      : "shortlist";


  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_score, resume_score_at, last_match_compute_at")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_storage_path: string | null; resume_score: number | null; last_match_compute_at: string | null } | null };

  const hasResume = !!profile?.resume_storage_path;
  const status = await getResumeMatchStatus(admin, user.id);
  const canCompute = status.canCompute;
  const resumeScore = profile?.resume_score ?? null;
  const lastComputeAt = profile?.last_match_compute_at ?? null;

  // Accurate band counts via parallel head-count queries â€” each is a fast
  // indexed COUNT(*) that bypasses the PostgREST max_rows cap. Scope filters
  // (company, hub) apply server-side so the strip honours them.
  // Dismiss was removed â€” there is no longer a user_hidden filter.
  const baseCountQuery = () => {

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

  // Single read for the tab's visible cards â€” capped at 500 so SSR stays
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

  // Scope filter â€” applied in-memory to the 500-row list. The band counts
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

  // Tab slicing â€” single source of truth.
  const tabRows = scopedRows.filter((m) => {
    const cls = classifyMatch(m);
    if (tab === "shortlist")    return cls === "shortlist";
    if (tab === "worth_a_look") return cls === "worth_a_look";
    if (tab === "filtered")     return cls === "filtered";
    return false;
  });

  // Sprint 6 â€” fold in application status for the cards in view.
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

  // Filter chip data â€” companies/hubs derived from the full scope, not the
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
    <ComputeProvider hasResume={canCompute} disabledReason={status.matches.message}>
    <div className="space-y-4 pb-6">

      {/* Session-history beacon */}
      <MatchesURLBeacon />

      {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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

      {/* â”€â”€ Compute status banner â€” full-width, only when running/error â”€ */}
      <ComputeStatusBanner />
      <MatchStatusPanel status={status} />


      {/* â”€â”€ Band strip â€” sticky tab spine, right under title â”€â”€â”€â”€â”€â”€â”€ */}
      {allRows.length > 0 && (
        <BandStrip
          counts={bandCounts}
          active={tab}
          selectedCompanies={selectedCompanies}
          selectedHubs={selectedHubs}
          minScore={minScore}
        />
      )}

      {/* â”€â”€ Filters (company/hub/min-score) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {allRows.length > 0 && (
        <MatchFilters
          allCompanies={companies}
          allHubs={allHubs}
        />
      )}

      {/* â”€â”€ Resume score strip â€” only when score < 60 (where the
          weak-resume â†’ weak-matches connection actually matters).
          Strong/Application-ready scores hide entirely. */}
      {hasResume && resumeScore !== null && resumeScore < 60 && (
        <ResumeScoreStrip score={resumeScore} />
      )}

      {/* â”€â”€ Filtered tab inline note â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {tab === "filtered" && tabRows.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-md border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            These roles scored below 40, hit a hard cap, or were classified as a mismatch. Most users skip them â€” but if you want to see why each was filtered, open the Fit Card on any row.
          </p>
        </div>
      )}

      {/* â”€â”€ Card list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                    Showing top <span className="font-semibold tabular-nums text-foreground">{tabRows.length}</span> of <span className="font-semibold tabular-nums text-foreground">{tabExpected}</span> — apply a company or hub filter to narrow results.
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Empty states per tab â€” keeps the user oriented when a slice is empty.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MatchStatusPanel({
  status,
}: {
  status: Awaited<ReturnType<typeof getResumeMatchStatus>>;
}) {
  const matchTone = {
    blocked: "border-border bg-secondary/40",
    computing: "border-primary/25 bg-primary-soft",
    failed: "border-destructive/30 bg-destructive/5",
    stale: "border-warning/30 bg-warning/5",
    up_to_date: "border-success/25 bg-success/5",
    not_computed: "border-primary/25 bg-primary-soft",
  }[status.matches.kind];
  const icon = (() => {
    if (status.matches.kind === "up_to_date") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />;
    if (status.matches.kind === "failed") return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />;
    if (status.matches.kind === "stale") return <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />;
    return <Activity className="mt-0.5 h-4 w-4 shrink-0 text-primary" />;
  })();

  return (
    <section
      aria-live="polite"
      className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-start sm:justify-between ${matchTone}`}
    >
      <div className="flex min-w-0 gap-3">
        {icon}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{status.matches.title}</p>
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {status.resume.title}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{status.matches.message}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{status.resume.message}</p>
        </div>
      </div>
      <div className="flex shrink-0 gap-2 sm:justify-end">
        {status.resume.kind === "missing" || status.resume.kind === "failed" ? (
          <Link
            href="/profile"
            className="tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            {status.resume.kind === "missing" ? "Upload resume" : "Retry upload"}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : status.canCompute && status.matches.kind !== "up_to_date" && status.matches.kind !== "computing" ? (
          <ComputeTrigger />
        ) : status.matches.kind === "computing" ? (
          <span className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-primary/20 bg-card px-3 text-xs font-medium text-primary">
            <Activity className="h-3 w-3" /> Running
          </span>
        ) : (
          <Link
            href="/profile"
            className="tap-target-sm inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition hover:bg-secondary focus-ring"
          >
            View resume
          </Link>
        )}
      </div>
    </section>
  );
}

function emptyStateForTab(tab: MatchTab, activeFilterCount: number): React.ReactNode {
  if (activeFilterCount > 0) {
    return (
      <EmptyState
        icon={<Eye className="h-5 w-5" />}
        title="No matches in this slice"
        body="Try clearing or widening a filter â€” there may be roles you'd qualify for hiding behind the current selection."
        actions={[{ label: "Clear filters", href: `/matches?tab=${tab}`, variant: "primary" }]}
      />
    );
  }
  if (tab === "shortlist") {
    return (
      <EmptyState
        icon={<Activity className="h-5 w-5" />}
        title="No priority matches yet"
        body="Nothing scored â‰¥60 yet. Check Explore for partial fits, or set your preferred hubs / strengthen your resume to lift more roles."
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Resume Score Strip â€” compact 1-line alert. Only renders for score < 60.
// Above 60 the resume isn't the bottleneck, so the strip stays hidden and
// the matches page is purely about matches.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
          <span className="text-muted-foreground">â€” this is capping your matches</span>
        </span>
      </div>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
    </Link>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Helpers
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
