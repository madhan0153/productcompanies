"use client";

import { Flame, Snowflake } from "lucide-react";

// Streak presentation. The flame uses the existing `warning` token (amber) and
// frozen days use a desaturated muted tone — no new colors introduced.

export type DayState = "solved" | "today" | "future" | "missed" | "frozen" | "skipped";

export interface DayDot {
  label: string;
  state: DayState;
}

const DOT: Record<DayState, string> = {
  solved: "h-2.5 w-2.5 rounded-full bg-primary",
  today: "h-2.5 w-2.5 rounded-full bg-primary/40 ring-2 ring-primary animate-pulse-soft",
  future: "h-2.5 w-2.5 rounded-full bg-border",
  missed: "h-2.5 w-2.5 rounded-full bg-destructive/30",
  frozen: "h-2.5 w-2.5 rounded-full bg-sky-400/70 dark:bg-sky-400/60",
  skipped: "h-2.5 w-2.5 rounded-full bg-muted-foreground/30",
};

export function StreakChip({ current, milestone = false }: { current: number; milestone?: boolean }) {
  if (current <= 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-1 text-xs font-semibold text-warning tabular-nums ${
        milestone ? "animate-scale-in" : ""
      }`}
      aria-label={`${current} day streak`}
    >
      <Flame className="h-3.5 w-3.5" /> {current}
    </span>
  );
}

export function StreakRibbon({
  days,
  current,
  freeze,
  nextAccrual,
}: {
  days: DayDot[];
  current: number;
  freeze: number;
  nextAccrual: number;
}) {
  return (
    <div className="surface-inset flex items-center justify-between gap-3 px-4 py-3">
      <div className="flex items-center gap-1.5" aria-hidden>
        {days.map((d, i) => (
          <span key={i} className={DOT[d.state]} title={d.label} />
        ))}
      </div>
      <div className="text-right">
        <p className="text-xs font-semibold tabular-nums">
          {current > 0 ? `${current}-day streak` : "Start your streak"}
        </p>
        <p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Snowflake className="h-3 w-3" /> {freeze} freeze
          {freeze >= 0 && nextAccrual > 0 ? ` · refills in ${nextAccrual}d` : ""}
        </p>
      </div>
    </div>
  );
}
