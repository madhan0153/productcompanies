import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, MapPin, Briefcase, Calendar,
  Sparkles,
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

  // Similar roles: top matches at the same company (excluding this one)
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

  return (
    <div className="space-y-6">
      {/* Sticky apply bar — appears once user scrolls past the hero */}
      <StickyApplyBar
        companyName={company?.name ?? ""}
        companyLogoUrl={company?.logo_url ?? null}
        title={job.title}
        applyUrl={job.apply_url}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <Link href="/matches" className="inline-flex items-center gap-1 transition hover:text-foreground focus-ring rounded">
          <ArrowLeft className="h-3 w-3" /> Matches
        </Link>
        <span aria-hidden>/</span>
        {company?.name && <span className="text-foreground/80">{company.name}</span>}
        <span aria-hidden>/</span>
        <span className="truncate max-w-xs">{job.title}</span>
      </nav>

      {/* Header */}
      <div id="job-hero" className="rounded-2xl border border-border bg-card/50 p-6 elev-1 backdrop-blur">
        <div className="flex flex-wrap items-start gap-5">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={64} />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted-foreground">{company?.name ?? ""}</p>
            <h1 className="text-2xl font-semibold leading-tight">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {(job.hubs ?? []).slice(0, 3).map((h) => (
                <span key={h} className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{h}</span>
              ))}
              {expRange && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{expRange}</span>}
              {job.posted_at && <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Posted {formatDate(job.posted_at)}</span>}
              {!job.is_active && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">Stale — may be closed</span>}
            </div>
            {compRange && (
              <p className="mt-3 text-lg font-semibold text-primary">{compRange}</p>
            )}
          </div>

          {match && (
            <Tooltip label="Score combines a rules engine (experience, location, comp, tech overlap) with a model-graded fit assessment. 75+ is a strong fit.">
              <div className="flex cursor-help flex-col items-center gap-1.5">
                <ScoreRing score={match.score} size="lg" showLabel={false} />
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Match</span>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-5">
          {job.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/25 transition hover:opacity-90 active:scale-[0.98]"
            >
              Apply on {company?.name ?? "official site"} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <JobActions jobId={job.id} existingApp={application} />
        </div>
      </div>

      {/* Fit Card — primary match analysis */}
      {match && match.fit_card ? (
        <FitCardPanel data={match.fit_card} score={match.score} />
      ) : match && match.reasoning ? (
        // Pre-Gemini baseline: show one-liner from rules engine until Fit Card lands
        <div className="rounded-2xl border border-border bg-card/50 p-6 elev-1 backdrop-blur">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Match snapshot
          </h2>
          <p className="text-sm text-muted-foreground">{match.reasoning}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            Score {Math.round(match.score)}. The detailed Fit Card lands shortly after the next match compute.
          </p>
        </div>
      ) : null}

      {/* Interview prep brief — pure heuristic, instantly available */}
      <PrepBrief
        title={job.title}
        companyName={company?.name ?? "this company"}
        companySlug={company?.slug ?? null}
        seniority={job.seniority}
        techStack={job.tech_stack ?? []}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Description */}
        <div className="rounded-2xl border border-border bg-card/40 p-6 lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium">Job description</h2>
          {job.description ? (
            <JobDescription text={job.description} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Full description not captured. View on the official site for the latest details.
            </p>
          )}

          {(job.tech_stack ?? []).length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tech stack</h3>
              <div className="flex flex-wrap gap-1.5">
                {(job.tech_stack ?? []).map((t) => (
                  <span key={t} className="rounded-md bg-secondary px-2 py-1 text-xs text-foreground">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Side: similar roles + meta */}
        <div className="space-y-6">
          {similar.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <h3 className="mb-3 text-sm font-medium">More at {company?.name}</h3>
              <div className="space-y-2">
                {similar.map((s) => (
                  <Link
                    key={s.job_id}
                    href={`/jobs/${s.job_id}`}
                    className="flex items-center gap-3 rounded-xl bg-secondary/40 px-3 py-2 transition hover:bg-secondary/70"
                  >
                    <CompanyLogo name={s.jobs?.companies?.name ?? "?"} logoUrl={s.jobs?.companies?.logo_url ?? null} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{s.jobs?.title ?? "Role"}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{Math.round(s.score)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {company?.careers_url && (
            <div className="rounded-2xl border border-border bg-card/40 p-5">
              <h3 className="mb-3 text-sm font-medium">Source</h3>
              <a
                href={company.careers_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <ExternalLink className="h-3 w-3" /> {company.name} careers page
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Sourced directly from official career page. No aggregators.
              </p>
            </div>
          )}
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
