// Side-by-side ATS scorecard preview. Used on the review page (before-only)
// and on the finalised page (before vs after).

import type { AtsScorecard } from "@/lib/matching/ats-scorecard";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TONE: Record<AtsScorecard["grade"], { tone: string; bg: string; border: string }> = {
  A: { tone: "text-success",     bg: "bg-success/10",     border: "border-success/30" },
  B: { tone: "text-success",     bg: "bg-success/5",      border: "border-success/20" },
  C: { tone: "text-warning",     bg: "bg-warning/10",     border: "border-warning/30" },
  D: { tone: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

export function AtsScorecardPanel({
  before,
  after,
}: {
  before: AtsScorecard;
  after?: AtsScorecard | null;
}) {
  const beforeTone = TONE[before.grade];
  const afterTone = after ? TONE[after.grade] : null;
  const delta = after ? after.total - before.total : null;
  const DeltaIcon = delta === null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const deltaTone =
    delta === null ? "text-muted-foreground"
    : delta > 0   ? "text-success"
    : delta < 0   ? "text-destructive"
    : "text-muted-foreground";

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ATS scorecard</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          {!after ? (
            <>
              <span className={`text-2xl font-bold tabular-nums ${beforeTone.tone}`}>{before.total}</span>
              <span className="text-xs text-muted-foreground">/ 100 ·  grade {before.grade}</span>
            </>
          ) : (
            <div className="flex flex-wrap items-baseline gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Before</span>
                <span className={`text-xl font-bold tabular-nums ${beforeTone.tone}`}>{before.total}</span>
              </div>
              <DeltaIcon className={`h-4 w-4 ${deltaTone}`} aria-hidden />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">After</span>
                <span className={`text-xl font-bold tabular-nums ${afterTone!.tone}`}>{after.total}</span>
              </div>
              <span className={`ml-auto text-sm font-semibold ${deltaTone}`}>
                {delta !== null && delta > 0 ? "+" : ""}
                {delta}
              </span>
            </div>
          )}
        </div>
      </div>

      <ul className="divide-y divide-border">
        {before.axes.map((axis) => {
          const afterAxis = after?.axes.find((a) => a.axis === axis.axis);
          const beforePct = axis.weight === 0 ? 0 : (axis.score / axis.weight) * 100;
          const afterPct = afterAxis ? (afterAxis.weight === 0 ? 0 : (afterAxis.score / afterAxis.weight) * 100) : null;
          const axisDelta = afterAxis ? afterAxis.score - axis.score : null;
          return (
            <li key={axis.axis} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-foreground">{axis.label}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {axis.score}{afterAxis ? ` → ${afterAxis.score}` : ""}
                  <span className="opacity-60">/{axis.weight}</span>
                  {axisDelta !== null && axisDelta !== 0 && (
                    <span className={`ml-1 font-semibold ${axisDelta > 0 ? "text-success" : "text-destructive"}`}>
                      ({axisDelta > 0 ? "+" : ""}{axisDelta})
                    </span>
                  )}
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full ${axisDelta && axisDelta > 0 ? "bg-success" : "bg-primary"} transition-all duration-500`}
                  style={{ width: `${afterPct ?? beforePct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{axis.hint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
