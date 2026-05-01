import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, TrendingUp, AlertTriangle, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import { Tooltip } from "@/components/tooltip";
import { ComputeButton } from "./compute-button";
import { MatchFilters } from "./filters";

export const metadata: Metadata = { title: "Matches" };

const SENIORITY_COLORS: Record<string, string> = {
  intern: "text-sky-400 bg-sky-400/10",
  junior: "text-emerald-400 bg-emerald-400/10",
  mid: "text-violet-400 bg-violet-400/10",
  senior: "text-amber-400 bg-amber-400/10",
  staff: "text-rose-400 bg-rose-400/10",
  principal: "text-rose-400 bg-rose-400/10",
  manager: "text-fuchsia-400 bg-fuchsia-400/10",
  director: "text-fuchsia-400 bg-fuchsia-400/10",
};

type MatchData = {
  score: number;
  strengths: string[] | null;
  gaps: string[] | null;
  reasoning: string | null;
  computed_at: string;
  jobs: {
    id: string; title: string; location: string | null;
    hubs: string[] | null; tech_stack: string[] | null;
    min_experience_years: number | null; max_experience_years: number | null;
    comp_lpa_min: number | null; comp_lpa_max: number | null;
    seniority: string | null; apply_url: string | null; posted_at: string | null;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
};

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; h?: string; min_score?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const selectedCompanies = (params.c ?? "").split(",").filter(Boolean);
  const selectedHubs = (params.h ?? "").split(",").filter(Boolean);
  const minScore = params.min_score ? parseInt(params.min_score, 10) : null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_storage_path, product_dna_score, years_experience")
    .eq("id", user.id)
    .maybeSingle();

  const hasResume = !!profile?.resume_storage_path;

  let query = supabase
    .from("matches")
    .select(`
      score, strengths, gaps, reasoning, computed_at,
      jobs (
        id, title, location, hubs, tech_stack,
        min_experience_years, max_experience_years,
        comp_lpa_min, comp_lpa_max, seniority,
        apply_url, posted_at,
        companies ( name, slug, logo_url )
      )
    `)
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(500);

  if (minScore !== null) query = query.gte("score", minScore);

  const { data: rawData } = await query;
  const matchRows = rawData as unknown as MatchData[] | null;
  const allRows = (matchRows ?? []).filter((m): m is MatchData & { jobs: NonNullable<MatchData["jobs"]> } => !!m.jobs);

  const matches = allRows.filter((m) => {
    const slug = m.jobs.companies?.slug ?? "";
    if (selectedCompanies.length > 0 && !selectedCompanies.includes(slug)) return false;
    const hubs = m.jobs.hubs ?? [];
    if (selectedHubs.length > 0 && !hubs.some((h) => selectedHubs.includes(h))) return false;
    return true;
  });

  // Build full filter universes from the unfiltered set
  const companies = [...new Map(
    allRows
      .map((m) => m.jobs.companies)
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => [c.slug, { slug: c.slug, name: c.name }]),
  ).values()].sort((a, b) => a.name.localeCompare(b.name));

  const hubs = [...new Set(allRows.flatMap((m) => m.jobs.hubs ?? []))].sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Matches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {allRows.length > 0
              ? `${allRows.length} matched roles from 18 product companies`
              : "Compute your first matches below"}
          </p>
        </div>
        <ComputeButton hasResume={hasResume} />
      </div>

      {/* No-resume prompt */}
      {!hasResume && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
          <h2 className="font-medium">Start with your resume</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your PDF resume and we&apos;ll parse it with AI, compute your Product DNA score, and rank every active role across 18 product companies against your profile.
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
          allHubs={hubs}
          totalCount={allRows.length}
          filteredCount={matches.length}
        />
      )}

      {/* Match cards */}
      {matches.length > 0 ? (
        <StaggerList className="space-y-3">
          {matches.map((m) => {
            const job = m.jobs;
            const company = job.companies;
            const hubs = job.hubs ?? [];
            const tech = job.tech_stack ?? [];
            const strengths = m.strengths ?? [];
            const gaps = m.gaps ?? [];
            const score = m.score;
            const seniority = job.seniority;

            return (
              <div
                key={`${user.id}-${job.id}`}
                className="group rounded-2xl border border-border bg-card/40 p-5 lift hover:border-primary/30 hover:bg-card/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={44} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
                        {seniority && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SENIORITY_COLORS[seniority] ?? "bg-secondary text-foreground"}`}>
                            {seniority}
                          </span>
                        )}
                      </div>
                      <Link href={`/jobs/${job.id}`} className="block">
                        <h3 className="font-medium leading-snug group-hover:text-primary transition">{job.title}</h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {hubs.slice(0, 3).map((h) => (<span key={h}>{h}</span>))}
                        {job.comp_lpa_max != null && (
                          <span className="text-primary/80">Up to {job.comp_lpa_max} LPA</span>
                        )}
                        {job.min_experience_years != null && (<span>{job.min_experience_years}+ yrs</span>)}
                      </div>

                      {tech.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tech.slice(0, 8).map((t) => (
                            <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">{t}</span>
                          ))}
                          {tech.length > 8 && (
                            <span className="text-xs text-muted-foreground">+{tech.length - 8}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <Tooltip label="Match score: rules-based (experience, hubs, comp, tech) + model-graded fit. 75+ strong, 55+ good.">
                    <div className="cursor-help">
                      <ScoreRing score={score} size="md" />
                    </div>
                  </Tooltip>
                </div>

                {(strengths.length > 0 || gaps.length > 0 || m.reasoning) && (
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 sm:grid-cols-2">
                    {strengths.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                          <TrendingUp className="h-3.5 w-3.5" /> Strengths
                        </p>
                        <ul className="space-y-0.5">
                          {strengths.map((s, i) => (
                            <li key={i} className="text-xs text-muted-foreground">· {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {gaps.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                          <AlertTriangle className="h-3.5 w-3.5" /> Gaps
                        </p>
                        <ul className="space-y-0.5">
                          {gaps.map((g, i) => (
                            <li key={i} className="text-xs text-muted-foreground">· {g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {m.reasoning && (
                      <div className="sm:col-span-2">
                        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <Zap className="h-3.5 w-3.5 text-primary" /> AI reasoning
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{String(m.reasoning)}</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {job.posted_at ? `Posted ${formatDate(job.posted_at)}` : "Active role"}
                  </span>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-secondary"
                    >
                      View details <ChevronRight className="h-3 w-3" />
                    </Link>
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary"
                      >
                        Apply on official site <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </StaggerList>
      ) : allRows.length > 0 ? (
        <EmptyState
          icon={<ChevronRight className="h-5 w-5" />}
          title="No matches with these filters"
          body="Try widening your selection — clear a company filter or lower the minimum score."
          actions={[{ label: "Clear filters", href: "/matches", variant: "primary" }]}
        />
      ) : hasResume ? (
        <EmptyState
          icon={<ChevronRight className="h-5 w-5" />}
          title="No matches computed yet"
          body="Click 'Compute my matches' above and we'll score every active role across 18 product companies against your profile."
        />
      ) : null}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return `${Math.floor(diff / 30)}mo ago`;
  } catch { return ""; }
}
