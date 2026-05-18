import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ExternalLink, MapPin, Briefcase, Calendar,
  Sparkles, CheckCircle2, AlertCircle, TrendingUp, Target,
  ChevronRight, ShieldCheck,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { Tooltip } from "@/components/tooltip";
import { SectionCard } from "@/components/section-card";
import { JobActions } from "./job-actions";
import { StickyApplyBar } from "./sticky-apply-bar";
import { JobDescription } from "./job-description";
import { PrepBrief } from "./prep-brief";
import { FitCardPanel, type FitCardData } from "./fit-card";
import { ScoreEvidence } from "./score-evidence";
import { SmartMatchesBackLink } from "./smart-back";
import { ApplyButton } from "@/components/apply-button";
import { ApplyToolkit } from "./apply-toolkit";
import { RecruiterView } from "@/components/recruiter-view";
import { computeAtsView } from "@/lib/matching/ats-view";
import { getUserConsents } from "@/lib/dpdp/consent";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";
import type { NegotiationMemoContent } from "@/lib/llm/prompts/negotiation-memo";
import type { CompBracket } from "@/lib/insights/comp-percentiles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string; title: string; description: string | null; location: string | null;
  hubs: string[] | null; tech_stack: string[] | null;
  min_experience_years: number | null; max_experience_years: number | null;
  comp_lpa_min: number | null; comp_lpa_max: number | null;
  seniority: string | null; apply_url: string | null;
  posted_at: string | null; last_seen_at: string | null;
  is_active: boolean; company_id: string;
  must_have_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  role_function: string | null;
  jd_summary: string | null;
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

// Verdict styling — semantic tokens only, mirrors /matches.
type Verdict = "strong_fit" | "stretch" | "off_target" | "underqualified" | "mismatch";
const VERDICT_META: Record<Verdict, { label: string; tone: string; bg: string; border: string; icon: React.ReactNode }> = {
  strong_fit:     { label: "Strong fit",     tone: "text-success",     bg: "bg-success/10",     border: "border-success/30",     icon: <CheckCircle2 className="h-3 w-3" /> },
  stretch:        { label: "Stretch",        tone: "text-warning",     bg: "bg-warning/10",     border: "border-warning/30",     icon: <TrendingUp className="h-3 w-3" /> },
  off_target:     { label: "Off-target",     tone: "text-primary",     bg: "bg-primary-soft",   border: "border-primary/30",     icon: <Target className="h-3 w-3" /> },
  underqualified: { label: "Underqualified", tone: "text-primary",     bg: "bg-primary-soft",   border: "border-primary/30",     icon: <AlertCircle className="h-3 w-3" /> },
  mismatch:       { label: "Mismatch",       tone: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: <ShieldCheck className="h-3 w-3" /> },
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
        must_have_skills, nice_to_have_skills, role_function, jd_summary,
        companies (id, name, slug, logo_url, careers_url)
      `)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("matches")
      .select("score, strengths, gaps, reasoning, computed_at, verdict, fit_card, fit_card_at, confidence, hard_cap_reason, tech_coverage, feedback_adjustment, score_breakdown")
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
    /** Sprint 6 */
    confidence?: number | null;
    hard_cap_reason?: string | null;
    tech_coverage?: unknown;
    feedback_adjustment?: number | null;
    score_breakdown?: unknown;
  } | null;
  const application = appRaw as { id: string; status: string; applied_at: string | null; notes: string | null } | null;
  const compRange = formatComp(job.comp_lpa_min, job.comp_lpa_max);
  const expRange = formatExp(job.min_experience_years, job.max_experience_years);

  const verdictKey = (match?.verdict as Verdict | undefined) ?? null;
  const verdictMeta = verdictKey ? VERDICT_META[verdictKey] : null;

  // ── Apply Toolkit data load ────────────────────────────────────────
  const consents = await getUserConsents(user.id);
  const admin = createSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: profileRow }, { data: tailoredRow }, { data: memoRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("resume_parsed, resume_storage_path")
      .eq("id", user.id)
      .maybeSingle() as any,
    admin
      .from("tailored_resumes")
      .select("content, docx_storage_path, generated_at")
      .eq("user_id", user.id)
      .eq("job_id", id)
      .maybeSingle() as any,
    admin
      .from("negotiation_memos")
      .select("content, market_comp, generated_at")
      .eq("user_id", user.id)
      .eq("job_id", id)
      .maybeSingle() as any,
  ]) as [
    { data: { resume_parsed: ParsedResume | null; resume_storage_path: string | null } | null },
    { data: { content: TailoredResumeContent; docx_storage_path: string | null; generated_at: string } | null },
    { data: { content: NegotiationMemoContent; market_comp: CompBracket | null; generated_at: string } | null },
  ];

  const parsedResume = profileRow?.resume_parsed ?? null;
  const hasResume = Boolean(profileRow?.resume_storage_path && parsedResume);

  const atsView = parsedResume && hasResume
    ? computeAtsView({
        resume: parsedResume,
        must_have_skills:    job.must_have_skills ?? [],
        nice_to_have_skills: job.nice_to_have_skills ?? [],
      })
    : null;

  let initialTailorUrl: string | null = null;
  if (tailoredRow?.docx_storage_path) {
    const { data: signed } = await admin.storage
      .from("tailored-resumes")
      .createSignedUrl(tailoredRow.docx_storage_path, 600);
    initialTailorUrl = signed?.signedUrl ?? null;
  }

  return (
    <div className="space-y-5 pb-6">
      <StickyApplyBar
        companyName={company?.name ?? ""}
        companyLogoUrl={company?.logo_url ?? null}
        title={job.title}
        applyUrl={job.apply_url}
        jobId={job.id}
      />

      {/* Breadcrumb — SmartMatchesBackLink reads sessionStorage to return
          the user to the exact tab/filter slice they came from. */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        <SmartMatchesBackLink />
        <ChevronRight className="h-3 w-3 opacity-40" />
        {company?.name && <span className="text-foreground/70">{company.name}</span>}
        <ChevronRight className="h-3 w-3 opacity-40" />
        <span className="max-w-xs truncate text-foreground/50">{job.title}</span>
      </nav>

      {/* ── Job hero card ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4 sm:gap-5">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={64} />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-muted-foreground">{company?.name ?? ""}</p>
              {verdictMeta && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${verdictMeta.tone} ${verdictMeta.bg} ${verdictMeta.border}`}>
                  {verdictMeta.icon}
                  {verdictMeta.label}
                </span>
              )}
              {/* Sprint 6 — inline cap chip so the reason is visible without
                  expanding the Score Evidence card below. */}
              {match?.hard_cap_reason && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                  title={
                    match.hard_cap_reason === "thin_jd"       ? "Score capped: JD too short to score reliably."
                    : match.hard_cap_reason === "no_stack"    ? "Score capped: none of the JD's must-haves match your resume."
                    : match.hard_cap_reason === "adjacent_only" ? "Score capped: must-haves matched only by adjacent skills."
                    : match.hard_cap_reason === "senior_no_exp" ? "Score capped: senior role, <2 yrs professional experience."
                    : "Score capped"
                  }
                >
                  Score capped
                </span>
              )}
              {!job.is_active && (
                <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  <AlertCircle className="h-3 w-3" /> Stale — may be closed
                </span>
              )}
            </div>

            <h1 className="mt-2 text-xl font-semibold leading-tight sm:text-2xl">{job.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
              <p className="mt-3 text-lg font-semibold text-primary sm:text-xl">{compRange}</p>
            )}
          </div>

          {match && (
            <Tooltip label="Score combines a rules engine (experience, location, comp, tech overlap) with Gemini-graded fit. 75+ is a strong fit.">
              <div className="flex shrink-0 cursor-help flex-col items-center gap-1.5">
                <ScoreRing score={match.score} size="lg" showLabel={false} />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Match</span>
              </div>
            </Tooltip>
          )}
        </div>

        {/* Action bar */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {job.apply_url && (
            <ApplyButton jobId={job.id} applyUrl={job.apply_url} variant="default" />
          )}
          <JobActions jobId={job.id} existingApp={application} />
          {company?.careers_url && (
            <a
              href={company.careers_url}
              target="_blank"
              rel="noopener noreferrer"
              className="press tap-target ml-auto inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Official careers page</span>
              <span className="sm:hidden">Careers</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Fit Card (when present) ──────────────────────────── */}
      {/* Sprint 6 — mobile-first: when there's no Fit Card we skip the
          "Match snapshot" placeholder entirely (it just said "JD has no
          specific details" which adds zero value). The hero already shows
          score + verdict + cap chip; ScoreEvidence below renders only
          when there's substance (cap reason, missing skills, low conf). */}
      {match && match.fit_card && (
        <FitCardPanel
          data={match.fit_card}
          score={match.score}
          evidence={{
            confidence: match.confidence ?? null,
            hardCapReason: match.hard_cap_reason ?? null,
            techCoverage: match.tech_coverage,
            feedbackAdjustment: match.feedback_adjustment ?? null,
          }}
        />
      )}

      {/* ── Apply Toolkit ─────────────────────────────────────── */}
      <ApplyToolkit
        jobId={job.id}
        jobTitle={job.title}
        companyName={company?.name ?? "this company"}
        hasResume={hasResume}
        matchingConsent={consents.matching === true}
        recruiterView={
          atsView
            ? <RecruiterView view={atsView} />
            : (
              <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center text-xs text-muted-foreground">
                The recruiter view needs your parsed resume and a parsed JD. Upload your resume on /profile, then return here.
              </div>
            )
        }
        initialTailor={tailoredRow && initialTailorUrl ? {
          content: tailoredRow.content,
          download_url: initialTailorUrl,
          generated_at: tailoredRow.generated_at,
        } : null}
        initialMemo={memoRow ? {
          content: memoRow.content,
          market_comp: memoRow.market_comp,
          generated_at: memoRow.generated_at,
        } : null}
      />

      {/* Sprint 6 — Score evidence. Self-suppresses when nothing useful
          (no cap, no missing skills, high confidence) so most jobs
          without a Fit Card hide this entirely. When it does render it's
          the explanation of WHY the score is what it is — cap reason,
          missing skills, low confidence. Below Apply Toolkit because the
          action matters more than diagnostics. */}
      {match && !match.fit_card && (
        <ScoreEvidence
          score={match.score}
          confidence={match.confidence ?? null}
          hardCapReason={match.hard_cap_reason ?? null}
          techCoverage={match.tech_coverage}
          feedbackAdjustment={match.feedback_adjustment ?? null}
        />
      )}

      {/* ── Quick strengths + gaps (pre-Fit Card) ─────────────── */}
      {match && !match.fit_card && match.strengths && match.gaps && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {match.strengths && match.strengths.length > 0 && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-success">
                <CheckCircle2 className="h-3.5 w-3.5" /> Your strengths
              </p>
              <ul className="space-y-2">
                {match.strengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {match.gaps && match.gaps.length > 0 && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-warning">
                <TrendingUp className="h-3.5 w-3.5" /> Gaps to address
              </p>
              <ul className="space-y-2">
                {match.gaps.slice(0, 3).map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
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
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 lg:col-span-2">
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
                  <span key={t} className="rounded-md border border-border bg-secondary/50 px-2.5 py-1 font-mono text-xs">
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
            <SectionCard title={`More at ${company?.name ?? ""}`} subtitle="Similar roles for you">
              <div className="space-y-1">
                {similar.map((s) => (
                  <Link
                    key={s.job_id}
                    href={`/jobs/${s.job_id}`}
                    className="group flex items-center gap-3 rounded-md px-2 py-2.5 transition hover:bg-secondary focus-ring"
                  >
                    <CompanyLogo name={s.jobs?.companies?.name ?? "?"} logoUrl={s.jobs?.companies?.logo_url ?? null} size={28} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm transition group-hover:text-primary">{s.jobs?.title ?? "Role"}</p>
                    </div>
                    <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 text-xs font-bold tabular-nums">{Math.round(s.score)}</span>
                  </Link>
                ))}
              </div>
            </SectionCard>
          )}

          {/* Trust badge */}
          <SectionCard title="Source" subtitle="Where this listing came from">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {company?.careers_url && (
                <li>
                  <a
                    href={company.careers_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-foreground/80 transition hover:text-foreground focus-ring rounded"
                  >
                    <ExternalLink className="h-3 w-3 shrink-0" />
                    {company.name} official careers page
                  </a>
                </li>
              )}
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                Sourced from official career page only
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                No aggregators or third-party boards
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                Updated daily via automated crawler
              </li>
            </ul>
          </SectionCard>
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
