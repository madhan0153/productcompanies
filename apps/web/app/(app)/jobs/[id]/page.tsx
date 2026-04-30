import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, ExternalLink, MapPin, Briefcase, Calendar,
  TrendingUp, AlertTriangle, Zap, Sparkles,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { JobActions } from "./job-actions";

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
      .select("score, strengths, gaps, reasoning, computed_at")
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
  const match = matchRaw as { score: number; strengths: string[] | null; gaps: string[] | null; reasoning: string | null; computed_at: string } | null;
  const application = appRaw as { id: string; status: string; applied_at: string | null; notes: string | null } | null;
  const compRange = formatComp(job.comp_lpa_min, job.comp_lpa_max);
  const expRange = formatExp(job.min_experience_years, job.max_experience_years);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/matches"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to matches
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
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

          {match && <MatchScoreBadge score={match.score} />}
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

      {/* Match explanation */}
      {match && (match.strengths?.length || match.gaps?.length || match.reasoning) && (
        <div className="rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-primary" /> Why we matched you
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {match.strengths && match.strengths.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <TrendingUp className="h-3.5 w-3.5" /> Your strengths
                </p>
                <ul className="mt-2 space-y-1.5">
                  {match.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground">· {s}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.gaps && match.gaps.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" /> Areas to address
                </p>
                <ul className="mt-2 space-y-1.5">
                  {match.gaps.map((g, i) => (
                    <li key={i} className="text-sm text-muted-foreground">· {g}</li>
                  ))}
                </ul>
              </div>
            )}
            {match.reasoning && (
              <div className="sm:col-span-2">
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Zap className="h-3.5 w-3.5 text-primary" /> AI reasoning
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{match.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Description */}
        <div className="rounded-2xl border border-border bg-card/40 p-6 lg:col-span-2">
          <h2 className="mb-3 text-sm font-medium">Job description</h2>
          {job.description ? (
            <div className="prose prose-sm prose-invert max-w-none whitespace-pre-wrap text-sm text-muted-foreground">
              {job.description}
            </div>
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

function MatchScoreBadge({ score }: { score: number }) {
  const tone = score >= 75 ? "from-emerald-500/30 to-emerald-500/10 text-emerald-300 border-emerald-500/30"
    : score >= 55 ? "from-amber-500/30 to-amber-500/10 text-amber-300 border-amber-500/30"
    : "from-secondary to-secondary text-muted-foreground border-border";
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border bg-gradient-to-br px-5 py-3 ${tone}`}>
      <span className="text-2xl font-bold tabular-nums">{Math.round(score)}</span>
      <span className="text-[10px] uppercase tracking-wider">Match score</span>
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
