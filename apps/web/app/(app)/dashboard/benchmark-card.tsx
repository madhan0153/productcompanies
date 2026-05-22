// Product fix: percentile benchmark card.
//
// "You're in the top 25% for backend engineers (4–7 yrs exp)" is the
// kind of social-proof line that drives D7 retention and word-of-mouth.
// The card stays compact on mobile (single column) and offers a nudge
// CTA when there's headroom to climb a bucket.
//
// Pure server component — derives everything from props the dashboard
// already loads. No new DB read.

import Link from "next/link";
import { ArrowRight, TrendingUp } from "lucide-react";
import { computeDnaBenchmark, type DnaBenchmark } from "@prodmatch/shared";
import { cn } from "@/lib/utils";

interface Props {
  dnaScore: number | null;
  roleFunction: string | null;
  yearsExperience: number | null;
}

export function BenchmarkCard({ dnaScore, roleFunction, yearsExperience }: Props) {
  const benchmark = computeDnaBenchmark({
    dnaScore,
    roleFunction,
    years: yearsExperience,
  });
  if (!benchmark) return null;

  const tone = bucketTone(benchmark.bucket);

  return (
    <section
      aria-label="How you compare"
      className={cn(
        "rounded-xl border p-4 sm:p-5",
        tone.border,
        tone.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone.iconBg, tone.iconFg)}>
          <TrendingUp className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            How you compare
          </p>
          <h2 className={cn("mt-1 text-sm font-semibold leading-snug", tone.text)}>{benchmark.label}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{benchmark.detail}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={cn("text-lg font-bold tabular-nums leading-none", tone.text)}>
            {benchmark.percentile}<span className="text-xs">%ile</span>
          </p>
          {benchmark.nextTarget != null && (
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              next: {benchmark.nextTarget}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full", tone.bar)}
          style={{ width: `${benchmark.percentile}%` }}
          role="img"
          aria-label={`At percentile ${benchmark.percentile}`}
        />
      </div>

      <Link
        href="/profile"
        className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Tune your profile
        <ArrowRight className="h-3 w-3" />
      </Link>
    </section>
  );
}

function bucketTone(bucket: DnaBenchmark["bucket"]) {
  if (bucket === "top_5" || bucket === "top_10") {
    return {
      border: "border-success/30",
      bg: "bg-success/5",
      iconBg: "bg-success/15",
      iconFg: "text-success",
      text: "text-success",
      bar: "bg-success",
    };
  }
  if (bucket === "top_25") {
    return {
      border: "border-primary/25",
      bg: "bg-primary-soft",
      iconBg: "bg-primary/15",
      iconFg: "text-primary",
      text: "text-primary",
      bar: "bg-primary",
    };
  }
  if (bucket === "top_50") {
    return {
      border: "border-border",
      bg: "bg-card",
      iconBg: "bg-secondary",
      iconFg: "text-muted-foreground",
      text: "text-foreground",
      bar: "bg-primary/70",
    };
  }
  // Below median — use warning tone, never destructive (we don't want
  // to discourage). Wording in `detail` already pivots to "headroom".
  return {
    border: "border-warning/30",
    bg: "bg-warning/5",
    iconBg: "bg-warning/15",
    iconFg: "text-warning",
    text: "text-warning",
    bar: "bg-warning",
  };
}
