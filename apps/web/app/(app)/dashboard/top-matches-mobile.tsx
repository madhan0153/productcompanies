"use client";

// Sprint 6 — Mobile-only horizontal carousel for top matches.
// Desktop (`lg+`) still uses the existing stacked list inside SectionCard.
// Here we render an `overflow-x-auto snap-x` strip of compact match cards
// for thumb-friendly browsing.

import Link from "next/link";
import { CompanyLogo } from "@/components/company-logo";

export interface TopMatchCard {
  jobId: string;
  title: string;
  company: string;
  logoUrl: string | null;
  score: number;
  verdict: string | null;
  confidence: number | null;
}

const VERDICT_TONE: Record<string, string> = {
  strong_fit:     "text-success bg-success/10 border-success/30",
  stretch:        "text-warning bg-warning/10 border-warning/30",
  off_target:     "text-primary bg-primary-soft border-primary/30",
  underqualified: "text-muted-foreground bg-secondary border-border",
  mismatch:       "text-destructive bg-destructive/5 border-destructive/30",
};

const VERDICT_LABEL: Record<string, string> = {
  strong_fit:     "Strong",
  stretch:        "Stretch",
  off_target:     "Off-target",
  underqualified: "Under",
  mismatch:       "Mismatch",
};

export function TopMatchesMobile({ matches }: { matches: TopMatchCard[] }) {
  if (matches.length === 0) return null;
  return (
    <section className="lg:hidden" aria-label="Top matches">
      <header className="mb-3 flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold">Top matches</h2>
        <Link
          href="/matches"
          className="text-xs font-medium text-muted-foreground transition hover:text-primary focus-ring rounded"
        >
          See all →
        </Link>
      </header>
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
      >
        {matches.map((m) => {
          const verdict = m.verdict ?? "stretch";
          const tone = VERDICT_TONE[verdict] ?? VERDICT_TONE.stretch;
          const label = VERDICT_LABEL[verdict] ?? "Match";
          return (
            <Link
              key={m.jobId}
              href={`/jobs/${m.jobId}`}
              role="listitem"
              className="group flex w-[78%] shrink-0 snap-start flex-col gap-2 rounded-xl border border-border bg-card p-4 transition active:bg-secondary/60 focus-ring"
            >
              <div className="flex items-start justify-between gap-3">
                <CompanyLogo name={m.company} logoUrl={m.logoUrl} size={36} />
                <div className="flex flex-col items-end gap-1">
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-bold tabular-nums">
                    {Math.round(m.score)}
                  </span>
                  {m.confidence != null && (
                    <span className="text-[9px] text-muted-foreground tabular-nums">
                      conf {Math.round(m.confidence)}
                    </span>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-semibold leading-snug transition group-hover:text-primary">
                  {m.title}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{m.company}</p>
              </div>
              <span className={`inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tone}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
