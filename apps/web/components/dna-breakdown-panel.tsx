// Visualises the 4-axis DNA breakdown. Read-only, server-renderable. Used
// on /profile (full panel) and /dashboard (compact tooltip variant).

import type { DnaBreakdown } from "@/lib/matching/dna-breakdown";

const AXIS_ORDER: Array<DnaBreakdown["axes"][number]["axis"]> = [
  "modern_stack",
  "scale_impact",
  "ownership_signals",
];

function axisTone(score: number, weight: number) {
  const pct = weight === 0 ? 0 : score / weight;
  if (pct >= 0.75) return { bar: "bg-success", text: "text-success" };
  if (pct >= 0.5)  return { bar: "bg-warning", text: "text-warning" };
  if (pct >= 0.25) return { bar: "bg-primary", text: "text-primary" };
  return                  { bar: "bg-destructive", text: "text-destructive" };
}

export function DnaBreakdownPanel({ breakdown }: { breakdown: DnaBreakdown }) {
  const indexed = new Map(breakdown.axes.map((a) => [a.axis, a]));
  const ordered = AXIS_ORDER.map((k) => indexed.get(k)).filter((a): a is DnaBreakdown["axes"][number] => !!a);

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Readiness breakdown</p>
          <p className="text-sm font-semibold">How your <span className="text-primary">{breakdown.total}/100</span> readiness signal is composed</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {ordered.map((a) => {
          const tone = axisTone(a.score, a.weight);
          const pct = a.weight === 0 ? 0 : (a.score / a.weight) * 100;
          return (
            <li key={a.axis} className="px-5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{a.label}</span>
                <span className={`text-sm font-bold tabular-nums ${tone.text}`}>
                  +{a.score}
                  <span className="ml-0.5 text-xs font-normal text-muted-foreground">/{a.weight}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full transition-all ${tone.bar}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">{a.hint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Compact list-of-4 for use inside the dashboard tooltip / score chip.
export function DnaBreakdownInline({ breakdown }: { breakdown: DnaBreakdown }) {
  const indexed = new Map(breakdown.axes.map((a) => [a.axis, a]));
  const ordered = AXIS_ORDER.map((k) => indexed.get(k)).filter((a): a is DnaBreakdown["axes"][number] => !!a);
  return (
    <div className="space-y-1">
      {ordered.map((a) => (
        <div key={a.axis} className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">{a.label}</span>
          <span className="font-semibold tabular-nums">+{a.score}<span className="opacity-50">/{a.weight}</span></span>
        </div>
      ))}
    </div>
  );
}
