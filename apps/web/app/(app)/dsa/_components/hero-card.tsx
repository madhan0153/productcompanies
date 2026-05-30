import Link from "next/link";
import { Sparkles, Target, ArrowRight, CheckCircle2, Clock3 } from "lucide-react";
import { DifficultyPill, Pill, BUCKET_LABEL, patternLabel, type Difficulty, type Bucket } from "./pills";
import { NextRefreshCountdown } from "./countdown";

// Today's question — the focal element of the daily hub. Server-rendered;
// only the next-refresh countdown is a small client island.

export interface HeroQuestion {
  slug: string;
  title: string;
  framing: string;
  difficulty: Difficulty;
  pattern: string;
  bucket: Bucket;
  minutes: number;
}

export function DailyHeroCard({
  q,
  status,
  rationale,
  signedIn,
}: {
  q: HeroQuestion;
  status: "not_started" | "in_progress" | "solved";
  rationale: string;
  signedIn: boolean;
}) {
  const accent =
    status === "solved"
      ? "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-success before:content-['']"
      : status === "in_progress"
      ? "before:absolute before:left-0 before:top-0 before:h-full before:w-1 before:bg-warning before:content-['']"
      : "";
  const cta =
    !signedIn ? "Start today's question"
      : status === "not_started" ? "Start today's question"
      : status === "in_progress" ? "Resume today's question"
      : "Review today's question";

  return (
    <section className={`surface-elevated lift relative overflow-hidden rounded-2xl ${accent}`}>
      {/* tinted cap — the only decorative fill on the page */}
      <div className="bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-5 pt-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-4 w-4" /> Today&apos;s question
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
            <Clock3 className="h-3.5 w-3.5" /> ~{q.minutes} min
          </span>
        </div>

        {status === "solved" ? (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" /> Solved today
          </p>
        ) : status === "in_progress" ? (
          <p className="mt-3 text-xs font-semibold text-warning">In progress</p>
        ) : null}

        <h2 className="mt-2 font-display text-xl font-semibold tracking-tight sm:text-2xl">{q.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{q.framing}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <DifficultyPill d={q.difficulty} />
          <Pill>{patternLabel(q.pattern)}</Pill>
          <Pill>{BUCKET_LABEL[q.bucket]}</Pill>
        </div>
      </div>

      {/* personalization strip */}
      <div className="mx-5 mt-4 rounded-xl bg-primary-soft px-3.5 py-3 sm:mx-6">
        <p className="flex items-start gap-2 text-xs leading-relaxed text-primary-soft-foreground">
          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{rationale}</span>
        </p>
      </div>

      {/* CTA */}
      <div className="p-5 pt-4 sm:p-6">
        <Link
          href={`/dsa/${q.slug}`}
          className="press tap-target inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
        {status === "solved" && <NextRefreshCountdown className="mt-3 text-center" />}
      </div>
    </section>
  );
}
