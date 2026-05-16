import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, MapPin, Briefcase, Calendar,
  Sparkles, CheckCircle2, AlertCircle, TrendingUp,
  ChevronRight, Zap,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { Tooltip } from "@/components/tooltip";
import { JobActions } from "./job-actions";
import { StickyApplyBar } from "./sticky-apply-bar";
import { JobDescription } from "./job-description";
import { PrepBrief } from "./prep-brief";
import { FitCardPanel, type FitCardData } from "./fit-card";
import { ApplyButton } from "@/components/apply-button";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string; title: string; description: string | null; location: string | null;
  hubs: string[] | null; tech_stack: string[] | null;
  min_experience_years: number | null; max_experience_years: number | null;
  comp_lpa_min: number | null; comp_lpa_max: number | null;
  seniority: string | null; apply_url: string | null;
  posted_at: string | null; last_seen_at: string | null;
  is_active: boolean; company_id: string;
  companies: { id: string; name: string; slug: string; logo_url: string | null; careers_url: string | null } | null;
};

type SimilarRow = {
  job_id: string;
  score: number;
  jobs: {
    id: string; title: string;
    companies: { name: string; logo_url: string | null } | null;
  } | null;
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("jobs")
    .select("title, companies(name)")
    .eq("id", id)
    .maybeSingle();
  const row = data as { title?: string; companies?: { name?: string } | null } | null;
  if (!row?.title) return { title: "Job" };
  return { title: `${row.title} · ${row.companies?.name ?? ""}` };
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: jobRaw }, { data: matchRaw }, { data: appRaw }] = await Promise.all([
    supabase
      .from("jobs")
      .select(`
        id, title, description, location, hubs, tech_stack,
        min_experience_years, max_experience_years,
        comp_lpa_min, comp_lpa_max, seniority,
        apply_url, posted_at, last_seen_at, is_active, company_id,
        companies (id, name, slug, logo_url, careers_url)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("matches")
      .select("score, strengths, gaps, reasoning, computed_at, verdict, fit_card, fit_card_at")
      .eq("user_id", user.id)
      .eq("job_id", id)
      .maybeSingle(),
    supabase.from("applications")
      .select("id, status, applied_at, notes")
      .eq("user_id", user.id)
      .eq("job_id", id)
      .maybeSingle(),
  ]);

  const job = jobRaw as unknown as JobRow | null;
  if (!job) notFound();

  const { data: similarRaw } = await supabase
    .from("matches")
    .select("job_id, score, jobs(id, title, companies(name, logo_url), company_id)")
    .eq("user_id", user.id)
    .neq("job_id", id)
    .order("score", { ascending: false })
    .limit(50);

  const similar = ((similarRaw as unknown as SimilarRow[]) ?? [])
    .filter((s) => s.jobs && (s.jobs as unknown as { company_id?: string }).company_id === job.company_id)
    .slice(0, 4);

  const company = job.companies;
  const match = matchRaw as {
    score: number;
    strengths: string[] | null;
    gaps: string[] | null;
    reasoning: string | null;
    computed_at: string;
    verdict?: string | null;
    fit_card?: FitCardData | null;
    fit_card_at?: string | null;
  } | null;
  const application = appRaw as { id: string; status: string; applied_at: string | null; notes: string | null } | null;
  const compRange = formatComp(job.comp_lpa_min, job.comp_lpa_max);
  const expRange = formatExp(job.min_experience_years, job.max_experience_years);

  const verdictColor = match?.verdict === "strong_fit" ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/8"
    : match?.verdict === "stretch" ? "text-amber-400 border-amber-400/30 bg-amber-400/8"
    : match?.verdict === "off_target" ? "text-violet-400 border-violet-400/30 bg-violet-400/8"
    : "text-sky-400 border-sky-400/30 bg-sky-400/8";

  const verdictLabel = match?.verdict === "strong_fit" ? "Strong fit"
    : match?.verdict === "stretch" ? "Stretch"
    : match?.verdict === "off_target" ? "Off-target"
    : match?.verdict === "underqualified" ? "Underqualified"
    : match?.verdict === "mismatch" ? "Mismatch" : null;

  return (
    <div className="space-y-5 pb-6">
      {/* Sticky apply bar */}
      <StickyApplyBar
        companyName={company?.name ?? ""}
        companyLogoUrl={company?.logo_url ?? null}
        title={job.title}
        applyUrl={job.apply_url}
        jobId={job.id}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/matches" className="inline-flex items-center gap-1 rounded-lg transition hover:text-foreground focus-ring">
          <ArrowLeft className="h-3 w-3" /> Matches
        </Link>
        <ChevronRight className="h-3 w-3 opacity-40" />
        {company?.name && <span className="text-foreground/70">{company.name}</span>}
        <ChevronRight className="h-3 w-3 opacity-40" />
        <span className="truncate max-w-xs text-foreground/50">{job.title}</span>
      </nav>

      {/* ── Job hero card ─────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 p-6 backdrop-blur">
        <div aria-hidden className="absolute right-0 top-0 h-40 w-60 rounded-full bg-primary/5 blur-3xl" />

        <div className="relative flex flex-wrap items-start gap-5">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={72} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{company?.name ?? ""}</p>
              {verdictLabel && match && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictColor}`}>
                  {match.verdict === "strong_fit" && <CheckCircle2 className="h-3 w-3" />}
                  {match.verdict === "stretch" && <TrendingUp className="h-3 w-3" />}
                  {match.verdict === "underqualified" && <AlertCircle className="h-3 w-3" />}
                  {verdictLabel}
                </span>
              )}
              {!job.is_active && (
                <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-xs text-rose-400">
                  Stale — may be closed
                </span>
              )}
            </div>

            <h1 className="mt-1.5 text-2xl font-bold leading-tight">{job.title}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {(job.hubs ?? []).slice(0, 3).map((h) => (
                <span key={h} className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />{h}
                </span>
              ))}
              {expRange && (
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />{expRange}
                </span>
              )}
              {job.posted_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Posted {formatDate(job.posted_at)}
                </span>
              )}
            </div>

            {compRange && (
              <p className="mt-3 text-xl font-bold text-primary">{compRange}</p>
            )}
          </div>

          {match && (
            <Tooltip label="Score combines a rules engine (experience, location, comp, tech overlap) with Gemini-graded fit. 75+ is a strong fit.">
              <div className="flex cursor-help flex-col items-center gap-1.5">
                <ScoreRing score={match.score} size="lg" showLabel={false} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Match</span>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Action bar — Sprint 2 Items 9 + 10: ApplyButton tracks the click
            and auto-creates the application row instead of forcing the user
            to track it manually after returning from the careers page. */}
        <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-border/50 pt-5">
          {job.apply_url && (
            <ApplyButton jobId={job.id} applyUrl={job.apply_url} variant="default" />
          )}
          <JobActions jobId={job.id} existingApp={application} />
          {company?.careers_url && (
            <a
              href={company.careers_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            >
              <ExternalLink className="h-3 w-3" /> Official careers page
            </a>
          )}
        </div>
      </div>

      {/* ── Fit Card ──────────────────────────────────────────── */}
      {match && match.fit_card ? (
        <FitCardPanel data={match.fit_card} score={match.score} />
      ) : match && match.reasoning ? (
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" /> Match snapshot
          </h2>
          <p className="text-sm text-muted-foreground">{match.reasoning}</p>
          <p className="mt-3 text-xs text-muted-foreground/70">
            Score {Math.round(match.score)}. The detailed Fit Card lands after the next match compute.
          </p>
        </div>
      ) : null}

      {/* ── Quick strengths + gaps (pre-Fit Card) ─────────────── */}
      {match && !match.fit_card && match.strengths && match.gaps && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {match.strengths && match.strengths.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Your strengths
              </p>
              <ul className="space-y-2">
                {match.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.gaps && match.gaps.length > 0 && (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                <TrendingUp className="h-3.5 w-3.5" /> Gaps to address
              </p>
              <ul className="space-y-2">
                {match.gaps.slice(0, 3).map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Interview prep brief ──────────────────────────────── */}
      <PrepBrief
        title={job.title}
        companyName={company?.name ?? "this company"}
        companySlug={company?.slug ?? null}
        seniority={job.seniority}
        techStack={job.tech_stack ?? []}
      />

      {/* ── Description + sidebar ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/40 p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold">Job description</h2>
          {job.description ? (
            <JobDescription text={job.description} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Full description not captured. View on the official site for the latest details.
            </p>
          )}

          {(job.tech_stack ?? []).length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tech stack</h3>
              <div className="flex flex-wrap gap-2">
                {(job.tech_stack ?? []).map((t) => (
                  <span key={t} className="rounded-lg border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {similar.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <h3 className="mb-3 text-sm font-semibold">More at {company?.name}</h3>
              <div className="space-y-2">
                {similar.map((s) => (
                  <Link
                    key={s.job_id}
                    href={`/jobs/${s.job_id}`}
                    className="group flex items-center gap-3 rounded-xl border border-transparent bg-secondary/30 px-3 py-2.5 transition hover:border-primary/20 hover:bg-secondary/60"
                  >
                    <CompanyLogo name={s.jobs?.companies?.name ?? "?"} logoUrl={s.jobs?.companies?.logo_url ?? null} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm group-hover:text-primary transition">{s.jobs?.title ?? "Role"}</p>
                    </div>
                    <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-bold tabular-nums">{Math.round(s.score)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Trust badge */}
          <div className="rounded-2xl border border-border bg-card/30 p-5">
            <h3 className="mb-2 text-sm font-semibold">Source</h3>
            {company?.careers_url && (
              <a
                href={company.careers_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {company.name} official careers page
              </a>
            )}
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                Sourced from official career page only
              </p>
              <p className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                No aggregators or third-party boards
              </p>
              <p className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                Updated daily via automated crawler
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatComp(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `₹${min}–${max} LPA`;
  const v = max ?? min;
  return v != null ? `Up to ₹${v} LPA` : null;
}

function formatExp(min: number | null, max: number | null) {
  if (min == null && max == null) return null;
  if (min != null && max != null && min !== max) return `${min}–${max} yrs`;
  const v = min ?? max;
  return v != null ? `${v}+ yrs` : null;
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch { return ""; }
}
