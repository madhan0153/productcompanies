// Sprint 6 dashboard — replaces the misleading "1000 matches" stat with an
// honest band stack. The user sees the actual shortlist, not the raw count.
//
// Bands match apps/web/lib/matching/bands.ts:
//   excellent  ≥90
//   strong     ≥75
//   plausible  ≥60   ← "shortlist" boundary
//   weak       ≥40
//   reject     <40   ← capped or hard-mismatched roles

import Link from "next/link";
import { Briefcase, ChevronRight } from "lucide-react";

export interface MatchBandCounts {
  excellent: number;
  strong: number;
  plausible: number;
  weak: number;
  reject: number;
  total: number;
}

export function MatchBandCard({ counts }: { counts: MatchBandCounts }) {
  const shortlist = counts.excellent + counts.strong + counts.plausible;
  const bands = [
    { key: "excellent", label: "Excellent",  count: counts.excellent, cls: "bg-success",          textCls: "text-success" },
    { key: "strong",    label: "Strong",     count: counts.strong,    cls: "bg-success/70",       textCls: "text-success" },
    { key: "plausible", label: "Plausible",  count: counts.plausible, cls: "bg-warning",          textCls: "text-warning" },
    { key: "weak",      label: "Weak",       count: counts.weak,      cls: "bg-muted-foreground/40", textCls: "text-muted-foreground" },
    { key: "reject",    label: "Filtered",   count: counts.reject,    cls: "bg-muted-foreground/20", textCls: "text-muted-foreground/70" },
  ];
  const max = Math.max(counts.total, 1);

  return (
    <Link
      href={shortlist > 0 ? "/matches?min_score=60" : "/matches"}
      className="group block rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring sm:p-5"
      aria-label={`Matches: ${shortlist} shortlisted out of ${counts.total} ranked`}
    >
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Briefcase className="h-4 w-4" />
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="text-2xl font-semibold tabular-nums leading-none">{shortlist}</p>
          <p className="mt-1 text-xs font-medium">{shortlist === 1 ? "Shortlisted role" : "Shortlisted roles"}</p>
          <p className="text-[11px] text-muted-foreground">of {counts.total.toLocaleString("en-IN")} ranked</p>
        </div>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>

      {/* Band stack — segmented bar */}
      {counts.total > 0 && (
        <div className="mt-4 space-y-2">
          <div
            className="flex h-1.5 w-full overflow-hidden rounded-full bg-secondary"
            role="img"
            aria-label={`Score distribution: excellent ${counts.excellent}, strong ${counts.strong}, plausible ${counts.plausible}, weak ${counts.weak}, filtered ${counts.reject}`}
          >
            {bands.map((b) =>
              b.count > 0 ? (
                <div
                  key={b.key}
                  className={`h-full ${b.cls}`}
                  style={{ width: `${(b.count / max) * 100}%` }}
                  title={`${b.label}: ${b.count}`}
                />
              ) : null,
            )}
          </div>

          {/* Legend — compact, mobile-friendly */}
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] tabular-nums">
            {bands.filter((b) => b.count > 0).map((b) => (
              <span key={b.key} className={`inline-flex items-center gap-1 ${b.textCls}`}>
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${b.cls}`} aria-hidden />
                {b.label} {b.count}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
}
