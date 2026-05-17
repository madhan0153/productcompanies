// Sprint 6 — Concrete resume guidance.
//
// Replaces the vague "Needs work" verbiage with the user's two biggest
// resume dimensions falling below their weight, pulled from the existing
// resume_score_breakdown jsonb. Each shows the dim label, plain-English
// hint already produced by computeResumeScore(), and an estimate of the
// points lift if fixed.
//
// We always defer to the existing resume-score engine for content — never
// invent prescriptions here.

import Link from "next/link";
import { TrendingUp, ArrowUpRight } from "lucide-react";

interface Dim {
  dimension: string;
  label: string;
  score: number;
  weight: number;
  hint: string;
}

function asDims(value: unknown): Dim[] | null {
  if (!Array.isArray(value)) return null;
  return value.filter((d): d is Dim =>
    !!d && typeof d === "object" &&
    typeof (d as Dim).label === "string" &&
    typeof (d as Dim).hint === "string" &&
    typeof (d as Dim).score === "number" &&
    typeof (d as Dim).weight === "number" &&
    typeof (d as Dim).dimension === "string"
  );
}

export function ResumeGuidanceCard({
  resumeScore,
  breakdown,
}: {
  resumeScore: number | null;
  breakdown: unknown;
}) {
  if (resumeScore === null) return null;
  const dims = asDims(breakdown) ?? [];

  // Two biggest gaps = lowest pct-of-weight, with weight >= 10 to filter
  // tiny dims that look big but only contribute ≤2 points.
  const gaps = dims
    .filter((d) => d.weight >= 10)
    .map((d) => ({ ...d, pct: d.weight === 0 ? 0 : d.score / d.weight, lift: d.weight - d.score }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 2);

  const tone =
    resumeScore >= 80 ? "text-success"
    : resumeScore >= 60 ? "text-warning"
    : "text-destructive";
  const barTone =
    resumeScore >= 80 ? "bg-success"
    : resumeScore >= 60 ? "bg-warning"
    : "bg-destructive";

  return (
    <Link
      href="/profile#resume-score"
      className="group block rounded-xl border border-border bg-card p-5 transition hover:border-primary/30 focus-ring"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Resume strength</h2>
            <span className={`text-sm font-bold tabular-nums ${tone}`}>{resumeScore}<span className="text-muted-foreground font-normal">/100</span></span>
          </div>
          {/* Bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
            <div className={`h-full rounded-full transition-all duration-700 ${barTone}`} style={{ width: `${resumeScore}%` }} />
          </div>

          {gaps.length > 0 ? (
            <ul className="mt-4 space-y-2.5">
              {gaps.map((g) => (
                <li key={g.dimension} className="flex items-start gap-2">
                  <span className="mt-0.5 inline-flex h-5 w-12 shrink-0 items-center justify-center rounded bg-warning/10 text-[10px] font-semibold tabular-nums text-warning">
                    +{g.lift}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold">{g.label}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{g.hint}</p>
                  </div>
                </li>
              ))}
              <li className="flex items-center gap-1.5 pt-1 text-[11px] font-medium text-primary">
                See full breakdown <ArrowUpRight className="h-3 w-3" />
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {resumeScore >= 85 ? "Application-ready for top product companies."
                : resumeScore >= 70 ? "Strong baseline — review on /profile for minor tweaks."
                : "Open your profile for specific tips."}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
