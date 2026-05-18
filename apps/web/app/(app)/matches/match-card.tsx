// Sprint 6 matches redesign — MatchCard, extracted from page.tsx and
// enriched with three new signals:
//   1. Application status pill (when the user has acted on the job)
//   2. Inline missing-skills chips (when ≤3 missing — keeps card tight)
//   3. Hard-cap badge near the score (when score was capped)
// Plus: the "NEW" stripe now fires for every plausible+ match (≥60), not
// just strong_fit, so users don't miss freshly-surfaced opportunities.

import Link from "next/link";
import {
  CheckCircle2, AlertCircle, TrendingUp, Target, ShieldCheck, ShieldAlert,
  Ghost, Sparkles, ChevronRight,
} from "lucide-react";
import type { Verdict, Json } from "@/lib/supabase/types";
import { CompanyLogo } from "@/components/company-logo";
import { ApplyButton } from "@/components/apply-button";
import { asRulesScoreBreakdown } from "@/components/score-breakdown";
import { WhyScoreToggle } from "./why-score-toggle";
import { DismissButton, RestoreButton } from "./dismiss-button";

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

export const VERDICT_META: Record<Verdict, VerdictMeta> = {
  strong_fit: {
    label: "Strong fit", short: "Strong",
    tone: "text-success", bgTone: "bg-success/5", borderTone: "border-success/25",
    scoreTone: "text-success bg-success/10",
    description: "You hit the must-haves and the level. Worth a tailored application.",
    rank: 1, icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  stretch: {
    label: "Stretch", short: "Stretch",
    tone: "text-warning", bgTone: "bg-warning/5", borderTone: "border-warning/25",
    scoreTone: "text-warning bg-warning/10",
    description: "Most must-haves covered with a gap or two. Apply if the role excites you.",
    rank: 2, icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
  off_target: {
    label: "Off-target", short: "Off-target",
    tone: "text-primary", bgTone: "bg-primary-soft", borderTone: "border-primary/20",
    scoreTone: "text-primary bg-primary-soft",
    description: "Adjacent to your stated targets — a pivot, not a natural next step.",
    rank: 3, icon: <Target className="h-3.5 w-3.5" />,
  },
  underqualified: {
    label: "Underqualified", short: "Under",
    tone: "text-primary", bgTone: "bg-primary-soft", borderTone: "border-primary/20",
    scoreTone: "text-primary bg-primary-soft",
    description: "JD asks for more years or skills than your resume shows today.",
    rank: 4, icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  mismatch: {
    label: "Mismatch", short: "Mismatch",
    tone: "text-destructive", bgTone: "bg-destructive/5", borderTone: "border-destructive/25",
    scoreTone: "text-destructive bg-destructive/10",
    description: "Wrong function. Hidden by default to keep your list focused.",
    rank: 5, icon: <ShieldCheck className="h-3.5 w-3.5" />,
  },
};

const HARD_CAP_SHORT: Record<string, string> = {
  thin_jd:       "Thin JD",
  no_stack:      "No stack overlap",
  adjacent_only: "Adjacent only",
  senior_no_exp: "Senior + <2y exp",
};

const APP_STATUS_TONE: Record<string, string> = {
  saved:        "bg-primary-soft text-primary-soft-foreground border-primary/30",
  applied:      "bg-primary-soft text-primary-soft-foreground border-primary/30",
  interviewing: "bg-warning/10 text-warning border-warning/30",
  offer:        "bg-success/10 text-success border-success/30",
  rejected:     "bg-destructive/10 text-destructive border-destructive/30",
  withdrawn:    "bg-muted text-muted-foreground border-border",
};

export interface MatchCardData {
  score: number;
  fit_card: Json | null;
  reasoning: string | null;
  hidden_reason: string | null;
  score_breakdown: Json | null;
  confidence: number | null;
  hard_cap_reason: string | null;
  feedback_adjustment: number | null;
  tech_coverage: unknown;
  jobs: {
    id: string;
    title: string;
    location: string | null;
    hubs: string[] | null;
    tech_stack: string[] | null;
    comp_lpa_min: number | null;
    comp_lpa_max: number | null;
    seniority: string | null;
    apply_url: string | null;
    posted_at: string | null;
    is_likely_ghost: boolean | null;
    jd_summary: string | null;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  };
}

interface FitCardLite {
  one_liner?: string;
  resume_tweaks?: Array<{ priority?: number; suggestion?: string; why?: string }>;
  strengths?: string[];
  gaps?: string[];
}

interface TechCoverageRow {
  direct?: string[];
  adjacent?: Array<{ jdSkill: string; via: string }>;
  missing?: string[];
}

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

export interface MatchCardProps {
  match: MatchCardData;
  verdict: Verdict;
  isNew: boolean;
  allScores: number[];
  /** When set, the user has tracked this job in /applications. Surfaces a pill. */
  applicationStatus?: string | null;
  /** When true: greyed-out card with Restore button instead of Dismiss. */
  hiddenView?: boolean;
}

export function MatchCard({
  match,
  verdict,
  isNew,
  allScores,
  applicationStatus,
  hiddenView = false,
}: MatchCardProps) {
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

  // Sprint 6 — inline missing-skills chips (only when ≤3, otherwise the
  // user should open the role for the full Score Evidence panel).
  const tc = match.tech_coverage as TechCoverageRow | null;
  const inlineMissing = tc?.missing && tc.missing.length > 0 && tc.missing.length <= 3
    ? tc.missing
    : null;

  const capShort = match.hard_cap_reason ? HARD_CAP_SHORT[match.hard_cap_reason] ?? null : null;

  const below = allScores.filter(s => s < match.score).length;
  const rankFromTop = allScores.length - below;
  const topPct = allScores.length >= 5 ? Math.round((rankFromTop / allScores.length) * 100) : 0;
  const showRanking = allScores.length >= 5;

  return (
    <Link
      href={`/jobs/${job.id}`}
      className={`group relative block overflow-hidden rounded-xl border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring sm:p-5 ${
        hiddenView
          ? "border-border opacity-60 hover:opacity-100"
          : isNew
            ? "border-success/30 hover:border-success/50"
            : "border-border"
      }`}
    >
      {/* NEW stripe — Sprint 6: now fires for any plausible+ unseen match,
          not just strong_fit. Same visual, broader trigger. */}
      {isNew && !hiddenView && (
        <div aria-hidden className="absolute left-0 top-0 h-full w-1 bg-success" />
      )}

      <div className="absolute right-3 top-3 z-10">
        {hiddenView
          ? <RestoreButton jobId={job.id} />
          : <DismissButton jobId={job.id} />}
      </div>

      <div className="flex flex-wrap items-start gap-3 pr-20 sm:pr-0 sm:gap-4">
        {/* Logo + score chip + cap + confidence */}
        <div className="flex flex-col items-center gap-2">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={48} />
          <div
            className={`flex min-w-[3rem] items-center justify-center gap-1 rounded-lg px-1.5 py-0.5 text-xs font-bold tabular-nums ${meta.scoreTone}`}
            aria-label={`${meta.label} — ${Math.round(match.score)} of 100${match.confidence != null ? `, confidence ${Math.round(match.confidence)}` : ""}${capShort ? `, capped: ${capShort}` : ""}`}
          >
            <span aria-hidden>{meta.icon}</span>
            {Math.round(match.score)}
          </div>
          {match.confidence != null && (
            <span
              className={`text-[9px] font-medium tabular-nums leading-none ${
                match.confidence < 55 ? "text-warning" : "text-muted-foreground/70"
              }`}
              title={`Score confidence ${Math.round(match.confidence)}/100 — derived from JD completeness, embeddings, and years signal.`}
            >
              conf {Math.round(match.confidence)}
            </span>
          )}
          {/* Sprint 6 — cap badge under the score chip when capped. Subtle,
              tap-targets the chip itself (aria-label communicates the reason). */}
          {capShort && (
            <span
              className="inline-flex items-center gap-1 rounded border border-warning/30 bg-warning/10 px-1 py-0.5 text-[9px] font-semibold tabular-nums text-warning"
              title={`Score was capped: ${capShort}`}
            >
              <ShieldAlert className="h-2.5 w-2.5" aria-hidden />
              capped
            </span>
          )}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
            <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.tone} ${meta.borderTone} ${meta.bgTone}`}>
              {meta.icon}
              {meta.short}
            </div>
            {isNew && (
              <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                New
              </span>
            )}
            {/* Sprint 6 — application status pill, surfaced when user has
                tracked the job. Lets them see "Applied 3d ago" without
                leaving the matches list. */}
            {applicationStatus && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
                  APP_STATUS_TONE[applicationStatus] ?? "bg-secondary border-border text-foreground"
                }`}
                title={`In your application pipeline · ${applicationStatus}`}
              >
                {applicationStatus}
              </span>
            )}
            {isGhost && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <Ghost className="h-3 w-3" /> Older listing
              </span>
            )}
          </div>

          <h3 className="mt-1.5 font-semibold leading-snug group-hover:text-primary transition">
            {job.title}
          </h3>

          {oneLiner && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground line-clamp-2">{oneLiner}</p>
          )}

          {/* Meta row */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {(job.hubs ?? []).slice(0, 3).map((h) => (<span key={h}>{h}</span>))}
            {(job.tech_stack ?? []).slice(0, 3).map((t) => (
              <span key={t} className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px]">{t}</span>
            ))}
          </div>

          {/* Sprint 6 — inline missing-skills chips (only when ≤3 missing). */}
          {inlineMissing && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-destructive/80">Missing</span>
              {inlineMissing.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center rounded border border-destructive/20 bg-destructive/5 px-1.5 py-0.5 font-mono text-[10px] text-destructive"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Inline fit signals — show when Fit Card exists */}
          {(strengths.length > 0 || gaps.length > 0) && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {strengths.length > 0 && (
                <div className="rounded-md border border-success/20 bg-success/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-success">Strength</p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{strengths[0]}</p>
                </div>
              )}
              {gaps.length > 0 && (
                <div className="rounded-md border border-warning/20 bg-warning/5 px-3 py-2">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-warning">Gap</p>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{gaps[0]}</p>
                </div>
              )}
            </div>
          )}

          {scoreBreakdown && (
            <WhyScoreToggle
              breakdown={scoreBreakdown}
              total={match.score}
              confidence={match.confidence}
              hardCapReason={match.hard_cap_reason}
              feedbackAdjustment={match.feedback_adjustment}
            />
          )}

          {topTweak?.suggestion && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/20 bg-primary-soft px-3 py-2">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Top resume tweak</p>
                <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{topTweak.suggestion}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 space-y-2.5 border-t border-border pt-3 text-xs text-muted-foreground">
        {showRanking && (
          <div className="flex items-start gap-2.5 rounded-md border border-border bg-secondary/40 px-3 py-2 sm:gap-3">
            <div className="shrink-0 text-center min-w-[2.75rem]">
              <p className={`text-xs font-semibold tabular-nums ${meta.tone}`}>Top {topPct}%</p>
              <p className="text-[9px] text-muted-foreground/70">{allScores.length} matches</p>
            </div>
            <div className="min-w-0">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Why you rank here</p>
              <p className="line-clamp-3 leading-relaxed sm:line-clamp-none">{rankingNarrative(verdict, topPct)}</p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
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
