// Sprint 6 — Smart "Next best action" card.
//
// Picks ONE thing to surface based on the user's current state. Avoids the
// classic dashboard problem of listing 12 things to do — instead, ranks
// possible nudges and shows only the most-impactful one.
//
// Ranking (highest priority first):
//   1. Critical: DPDP consent missing
//   2. Critical: no resume uploaded
//   3. Critical: matches stale (>5 days since last compute, resume changed)
//   4. Action:   application stuck (applied >7d, no status change)
//   5. Action:   strong fit hasn't been opened yet (seen_at=null, score>=75)
//   6. Action:   try a generated tool (Coach / Tailored / Memo) on top match
//   7. Polish:   resume has a fixable dimension <50% of weight
//   8. Polish:   preferred_hubs unset
//
// Ranking order intentionally aggressive — critical issues drown everything
// else. Polish items only surface when nothing more important is pending.

import Link from "next/link";
import { Zap, ArrowUpRight } from "lucide-react";

export interface NextActionInputs {
  hasResume: boolean;
  matchingConsentGranted: boolean;
  matchesStale: boolean;
  /** Apps in "applied" state with applied_at >7d ago and no status change. */
  stuckApps: Array<{ id: string; job_title: string; days: number }>;
  /** Unseen strong-fit (seen_at=null AND score>=75) top match, if any. */
  unseenStrongFit: { jobId: string; title: string; company: string } | null;
  /** Top match (any score) — used for try-a-tool nudges. */
  topMatch: { jobId: string; title: string; company: string; score: number } | null;
  coachOrToolUsed: boolean;
  preferredHubsCount: number;
  /** Lowest-scoring resume dim under 50% of weight, if computed. */
  weakestResumeDim: { label: string; hint: string } | null;
  /** Phase R2 — resume_score; drives the "Enhance my resume" nudge when <70. */
  resumeScore: number | null;
  /** Phase R2 — whether the user has the resume_intelligence consent on. */
  resumeIntelConsentGranted: boolean;
  /** Phase R2 — whether the user already finalised an enhancement on the
   *  current resume signature. Avoids re-nudging after they've acted. */
  hasFinalisedEnhancement: boolean;
}

export interface NextAction {
  title: string;
  body: string;
  cta: string;
  href: string;
  tone: "critical" | "action" | "polish";
}

export function pickNextAction(inputs: NextActionInputs): NextAction | null {
  // 1. Consent
  if (!inputs.matchingConsentGranted) {
    return {
      title: "Grant matching consent",
      body: "DPDP Act 2023 requires per-purpose consent before we can run AI matching for you. One-tap accept.",
      cta: "Grant consent",
      href: "/settings/privacy",
      tone: "critical",
    };
  }

  // 2. Resume
  if (!inputs.hasResume) {
    return {
      title: "Upload your resume",
      body: "We parse it and rank every active role across 18 product companies. Takes ~30 seconds.",
      cta: "Upload PDF",
      href: "/profile",
      tone: "critical",
    };
  }

  // 3. Stale matches
  if (inputs.matchesStale) {
    return {
      title: "Refresh your matches",
      body: "Your resume signature changed since the last compute. Re-rank now to see updated scores.",
      cta: "Recompute",
      href: "/matches?recompute=1",
      tone: "critical",
    };
  }

  // 4. Stuck app — most urgent action item
  if (inputs.stuckApps.length > 0) {
    const top = inputs.stuckApps[0];
    return {
      title: `Follow up on ${top.job_title}`,
      body: `Applied ${top.days} days ago without an update. Mark it interviewing, withdrawn, or set a next action.`,
      cta: "Open application",
      href: `/applications/${top.id}`,
      tone: "action",
    };
  }

  // 5. Unseen strong fit
  if (inputs.unseenStrongFit) {
    return {
      title: `A strong fit you haven't opened: ${inputs.unseenStrongFit.title}`,
      body: `${inputs.unseenStrongFit.company} — full Fit Card ready, with resume tweaks and story prompts.`,
      cta: "Open role",
      href: `/jobs/${inputs.unseenStrongFit.jobId}`,
      tone: "action",
    };
  }

  // 5.5 (Phase R2) — Resume enhancement when score is weak. Higher priority
  // than "try a tool on top match" because a weaker resume drags down every
  // future match score and recruiter callback.
  if (
    inputs.hasResume &&
    inputs.resumeScore !== null &&
    inputs.resumeScore < 70 &&
    !inputs.hasFinalisedEnhancement
  ) {
    return {
      title: "Enhance your resume",
      body: inputs.resumeIntelConsentGranted
        ? "Your resume score is below 70. AI reviews ATS readability and bullet quality — you approve every change."
        : "Your resume score is below 70. Turn on Resume Intelligence to get AI-reviewed bullet improvements.",
      cta: inputs.resumeIntelConsentGranted ? "Run enhancement" : "Turn on + enhance",
      href: inputs.resumeIntelConsentGranted ? "/profile/enhance" : "/settings/privacy",
      tone: "action",
    };
  }

  // 6. Try a tool on top match
  if (!inputs.coachOrToolUsed && inputs.topMatch) {
    return {
      title: `Generate a tailored resume for ${inputs.topMatch.title}`,
      body: `Your top match at ${inputs.topMatch.company} (score ${Math.round(inputs.topMatch.score)}). One click produces a JD-anchored .docx.`,
      cta: "Generate",
      href: `/jobs/${inputs.topMatch.jobId}#apply-toolkit`,
      tone: "action",
    };
  }

  // 7. Resume polish
  if (inputs.weakestResumeDim) {
    return {
      title: `Improve ${inputs.weakestResumeDim.label}`,
      body: inputs.weakestResumeDim.hint,
      cta: "See tips",
      href: "/profile#resume-score",
      tone: "polish",
    };
  }

  // 8. Hubs
  if (inputs.preferredHubsCount === 0) {
    return {
      title: "Set your preferred hubs",
      body: "Adds up to +5 points on every match in Bengaluru, Hyderabad, Pune, Delhi NCR, or Remote-India.",
      cta: "Set hubs",
      href: "/profile",
      tone: "polish",
    };
  }

  return null;
}

const TONE: Record<NextAction["tone"], { ring: string; bg: string; icon: string; cta: string }> = {
  critical: { ring: "border-destructive/30", bg: "bg-destructive/5", icon: "bg-destructive text-destructive-foreground", cta: "bg-destructive text-destructive-foreground hover:bg-destructive/90" },
  action:   { ring: "border-primary/30",     bg: "bg-primary-soft",  icon: "bg-primary text-primary-foreground",         cta: "bg-primary text-primary-foreground hover:bg-primary/90" },
  polish:   { ring: "border-border",         bg: "bg-secondary/40",  icon: "bg-secondary text-foreground",               cta: "bg-foreground text-background hover:bg-foreground/90" },
};

export function NextActionCard({ action }: { action: NextAction }) {
  const t = TONE[action.tone];
  return (
    <div className={`rounded-xl border ${t.ring} ${t.bg} p-5 sm:p-6`} role="region" aria-label="Next best action">
      <div className="flex flex-wrap items-start gap-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <Zap className="h-5 w-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next best action</p>
          <h2 className="mt-0.5 text-base font-semibold leading-snug">{action.title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{action.body}</p>
          <Link
            href={action.href}
            className={`press mt-4 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-ring ${t.cta}`}
          >
            {action.cta} <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
