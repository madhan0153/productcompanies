// Slim, scan-first match card.
//
// Built for the matches list as a browsing surface, not an analysis surface:
// the deep "why" lives on the Job Detail page. The card shows only the high-
// signal scoreboard fields a recruiter / candidate scans in <1 second:
//
//   • Logo + company
//   • Title (single line, truncated)
//   • Score chip + verdict + confidence (sub-line)
//   • Top-percentile badge (when the dataset is large enough)
//   • Optional 1-line insight (when truly compact)
//   • Application status pill (if user has acted on this job)
//   • "Older listing" pill (ghost detection)
//
// Removed vs previous design:
//   • Strengths/Gaps preview blocks
//   • Inline missing-skills chips
//   • "Why this score" disclosure
//   • Top resume tweak block
//   • Ranking narrative footer
//   • Hubs + tech-stack chip rows
//   • Comp / posted-date / location
//   • Dismiss button (intentionally removed — see actions.ts)
//
// All of that surfaces on /jobs/[id] where the user has committed to depth.

import Link from "next/link";
import {
  CheckCircle2, AlertCircle, TrendingUp, Target,
  ShieldCheck, ShieldAlert, Ghost, ChevronRight, Award,
} from "lucide-react";
import type { Verdict, Json } from "@/lib/supabase/types";
import { CompanyLogo } from "@/components/company-logo";
import { getScoreBand } from "@/lib/matching/bands";

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
    rank: 1, icon: <CheckCircle2 className="h-3 w-3" />,
  },
  stretch: {
    label: "Stretch", short: "Stretch",
    tone: "text-warning", bgTone: "bg-warning/5", borderTone: "border-warning/25",
    scoreTone: "text-warning bg-warning/10",
    description: "Most must-haves covered with a gap or two. Apply if the role excites you.",
    rank: 2, icon: <TrendingUp className="h-3 w-3" />,
  },
  off_target: {
    label: "Off-target", short: "Off-target",
    tone: "text-primary", bgTone: "bg-primary-soft", borderTone: "border-primary/20",
    scoreTone: "text-primary bg-primary-soft",
    description: "Adjacent to your stated targets — a pivot, not a natural next step.",
    rank: 3, icon: <Target className="h-3 w-3" />,
  },
  underqualified: {
    label: "Underqualified", short: "Under",
    tone: "text-primary", bgTone: "bg-primary-soft", borderTone: "border-primary/20",
    scoreTone: "text-primary bg-primary-soft",
    description: "JD asks for more years or skills than your resume shows today.",
    rank: 4, icon: <AlertCircle className="h-3 w-3" />,
  },
  mismatch: {
    label: "Mismatch", short: "Mismatch",
    tone: "text-destructive", bgTone: "bg-destructive/5", borderTone: "border-destructive/25",
    scoreTone: "text-destructive bg-destructive/10",
    description: "Wrong function. Hidden by default to keep your list focused.",
    rank: 5, icon: <ShieldCheck className="h-3 w-3" />,
  },
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
}

export interface MatchCardProps {
  match: MatchCardData;
  verdict: Verdict;
  isNew: boolean;
  allScores: number[];
  /** When set, the user has tracked this job in /applications. */
  applicationStatus?: string | null;
  /** Reserved for parity with the old API — no-op in slim card. */
  hiddenView?: boolean;
}

export function MatchCard({
  match,
  verdict,
  isNew,
  allScores,
  applicationStatus,
}: MatchCardProps) {
  const job = match.jobs;
  const company = job.companies;
  // Defensive: legacy/internal verdicts (e.g. "evidence_pending", which the
  // engine baseline path could persist before the normalization fix) are not
  // keys in VERDICT_META. Falling back to `stretch` keeps the Explore tab from
  // crashing on those rows — they live in the 40–58 band, so stretch is the
  // correct display verdict anyway.
  const meta = VERDICT_META[verdict] ?? VERDICT_META.stretch;
  const scoreBand = getScoreBand(match.score);

  const card = (match.fit_card as FitCardLite | null) ?? null;
  // Tightly clamp the optional insight to a single line of high signal.
  // Long marketing JD blurbs are dropped to keep cards scan-fast.
  const rawInsight = (card?.one_liner ?? "").trim();
  const insight = rawInsight && rawInsight.length <= 110 ? rawInsight : "";

  const isGhost = job.is_likely_ghost === true;
  const isCapped = !!match.hard_cap_reason;

  // Top-percentile badge — only meaningful when the dataset is large.
  const below = allScores.filter((s) => s < match.score).length;
  const rankFromTop = allScores.length - below;
  const topPct = allScores.length >= 20 ? Math.round((rankFromTop / allScores.length) * 100) : null;
  const showTopBadge = topPct !== null && topPct <= 25;

  // Recruiter confidence — kept as a quiet sub-line under the score.
  // Below 55 surfaces with a warning tone; above that it's muted.
  const conf = match.confidence != null ? Math.round(match.confidence) : null;

  return (
    <Link
      href={`/jobs/${job.id}`}
      prefetch
      className={`group relative block overflow-hidden rounded-xl border bg-card px-3.5 py-3 transition-all duration-200 ease-out hover:border-primary/30 hover:bg-secondary/40 active:scale-[0.98] focus-ring sm:px-4 sm:py-3.5 ${
        isNew ? "border-success/30 hover:border-success/50" : "border-border"
      }`}
    >
      {isNew && (
        <div aria-hidden className="absolute left-0 top-0 h-full w-1 bg-success" />
      )}

      <div className="flex items-center gap-3 sm:gap-3.5">
        {/* Score column — logo + score chip stacked, fixed width */}
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={40} />
          <div
            className={`flex min-w-[2.75rem] items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold tabular-nums ${meta.scoreTone}`}
            aria-label={`${meta.label} — ${Math.round(match.score)} of 100${conf != null ? `, confidence ${conf}` : ""}`}
          >
            {Math.round(match.score)}
          </div>
        </div>

        {/* Main content — top-line: company + verdict; title; sub-line: badges */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-xs font-medium text-muted-foreground">{company?.name}</span>
            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${meta.tone} ${meta.borderTone} ${meta.bgTone}`}>
              {meta.icon}
              {scoreBand.band === "plausible" ? "Plausible" : meta.short}
            </span>
            {isNew && (
              <span className="rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                New
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-[15px] font-semibold leading-snug group-hover:text-primary transition sm:text-base">
            {job.title}
          </h3>

          {/* Sub-line — quiet by default. Only renders if there's something to show. */}
          {(showTopBadge || conf !== null || isCapped || applicationStatus || isGhost) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              {showTopBadge && (
                <span className={`inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-1.5 py-0.5 font-semibold ${meta.tone}`}>
                  <Award className="h-2.5 w-2.5" aria-hidden />
                  Top {topPct}%
                </span>
              )}
              {conf !== null && (
                <span
                  className={`inline-flex items-center gap-0.5 ${conf < 55 ? "text-warning" : "text-muted-foreground/80"}`}
                  title={`Score confidence ${conf}/100 — based on JD completeness, signal strength, and your resume coverage.`}
                >
                  <span className="text-[9px] font-medium uppercase tracking-wider">Conf</span>
                  <span className="font-semibold tabular-nums">{conf}</span>
                </span>
              )}
              {isCapped && (
                <span
                  className="inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-1.5 py-0.5 font-semibold text-warning"
                  title="Score was capped — open the role for the reason."
                >
                  <ShieldAlert className="h-2.5 w-2.5" aria-hidden />
                  capped
                </span>
              )}
              {applicationStatus && (
                <span
                  className={`inline-flex items-center rounded-full border px-1.5 py-0.5 capitalize ${
                    APP_STATUS_TONE[applicationStatus] ?? "bg-secondary border-border text-foreground"
                  }`}
                  title={`In your application pipeline · ${applicationStatus}`}
                >
                  {applicationStatus}
                </span>
              )}
              {isGhost && (
                <span className="inline-flex items-center gap-1 text-muted-foreground/70" title="This listing is older — may already be filled.">
                  <Ghost className="h-2.5 w-2.5" aria-hidden /> Older
                </span>
              )}
            </div>
          )}

          {/* Optional single-line insight. Kept very tight — full reasoning is on /jobs/[id]. */}
          {insight && (
            <p className="mt-1.5 line-clamp-1 text-xs leading-relaxed text-muted-foreground/90">
              {insight}
            </p>
          )}
        </div>

        {/* Chevron — pure affordance, no other action chrome on the card */}
        <ChevronRight
          aria-hidden
          className="hidden shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5 group-hover:text-primary sm:block"
        />
      </div>
    </Link>
  );
}
