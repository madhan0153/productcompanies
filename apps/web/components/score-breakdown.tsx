// "Why this score?" — turns the opaque 0-100 match number into the same 7
// dimensions the matching engine actually computed. Renders compact bars
// per axis with the points-out-of-max + a one-line hint.

import { getScoreBand, getConfidenceLabel } from "@/lib/matching/bands";

export type RulesScoreBreakdown = {
  semantic: number;   // 0-35
  tech: number;       // 0-22
  role: number;       // 0-18
  experience: number; // 0-12
  seniority: number;  // 0-7
  hub: number;        // 0-4
  lpa: number;        // 0-2
};

// Sprint 6 — human-readable explanations for the hard-cap reasons surfaced
// by the rules engine. UI shows these in a small inline note when set.
const HARD_CAP_NOTES: Record<string, string> = {
  thin_jd:       "Score capped: JD body too short to score reliably.",
  no_stack:      "Score capped: none of the JD's must-have skills are on your resume.",
  adjacent_only: "Score capped: must-haves matched only by adjacent skills, not direct hits.",
  senior_no_exp: "Score capped: JD targets senior+ level; <2 yrs professional experience.",
};

// Sprint 6 rebalance — seniority + lpa dropped (no scoring contribution).
// Years experience already captures seniority signal; comp is missing on
// 95% of JDs from the 51 product-co career pages so the lpa dim defaulted
// to 1/2 on almost every match and distorted comparisons.
const AXIS_META: Array<{
  key: keyof RulesScoreBreakdown;
  label: string;
  weight: number;
  hintForScore: (score: number) => string;
}> = [
  { key: "semantic", label: "Semantic JD ↔ resume", weight: 38,
    hintForScore: (s) => s >= 24 ? "Tight semantic alignment between JD and resume content."
                       : s >= 13 ? "Moderate alignment — JD overlaps your resume vocabulary."
                       : "Weak semantic match — JD content sits far from your resume." },
  { key: "tech",     label: "Tech stack",            weight: 24,
    hintForScore: (s) => s >= 20 ? "Hits most must-have skills and some nice-to-haves."
                       : s >= 13 ? "Covers core must-haves; some gaps."
                       : "Few of the JD's must-have skills are evidenced on your resume." },
  { key: "role",     label: "Role function",         weight: 20,
    hintForScore: (s) => s >= 20 ? "Direct match with your target role function."
                       : s >= 11 ? "Adjacent function — credible lateral move."
                       : "Function doesn't match your stated targets." },
  { key: "experience", label: "Experience years",    weight: 13,
    hintForScore: (s) => s >= 12 ? "Years align cleanly with JD's stated range."
                       : s >= 9  ? "Within range, with a small over- or under-qualification gap."
                       : s >= 4  ? "Notable years gap — review the JD's minimum closely."
                       : "Years gap is wide enough that ATS may auto-filter." },
  { key: "hub",      label: "Location",              weight: 5,
    hintForScore: (s) => s >= 5 ? "Hub matches your preferences."
                       : s >= 2 ? "Adjacent hub or remote option available."
                       : "Location not in your preferred hubs." },
];

function tone(score: number, weight: number) {
  const pct = weight === 0 ? 0 : score / weight;
  if (pct >= 0.75) return { bar: "bg-success", text: "text-success" };
  if (pct >= 0.5)  return { bar: "bg-warning", text: "text-warning" };
  if (pct >= 0.25) return { bar: "bg-primary", text: "text-primary" };
  return                  { bar: "bg-destructive", text: "text-destructive" };
}

export function ScoreBreakdownPanel({
  breakdown,
  total,
  compact = false,
  confidence,
  hardCapReason,
  feedbackAdjustment,
}: {
  breakdown: RulesScoreBreakdown;
  total: number;
  compact?: boolean;
  /** Sprint 6 — 0-100 confidence; renders alongside score when provided. */
  confidence?: number | null;
  /** Sprint 6 — reason code when score was capped. Surfaces a small note. */
  hardCapReason?: string | null;
  /** Sprint 6 — re-rank delta applied. Surfaces "+2 from your activity" when nonzero. */
  feedbackAdjustment?: number | null;
}) {
  const band = getScoreBand(total);
  const confLabel = confidence != null ? getConfidenceLabel(confidence) : null;
  const confTone =
    confLabel === "high" ? "text-success"
    : confLabel === "low" ? "text-warning"
    : "text-muted-foreground";

  return (
    <div className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this score</p>
          <p className="text-[11px] text-muted-foreground/80">{band.label}</p>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-xs tabular-nums">
            <span className="font-bold">{Math.round(total)}</span>
            <span className="text-muted-foreground">/100</span>
          </p>
          {confidence != null && (
            <p className={`text-[10px] tabular-nums ${confTone}`} title="How trustworthy this score is, based on data completeness.">
              confidence {Math.round(confidence)}
            </p>
          )}
        </div>
      </div>
      <ul className="space-y-2">
        {AXIS_META.map((axis) => {
          const score = breakdown[axis.key] ?? 0;
          const t = tone(score, axis.weight);
          const pct = axis.weight === 0 ? 0 : (score / axis.weight) * 100;
          return (
            <li key={axis.key}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{axis.label}</span>
                <span className={`text-xs font-semibold tabular-nums ${t.text}`}>
                  +{score}<span className="ml-0.5 text-[10px] font-normal text-muted-foreground">/{axis.weight}</span>
                </span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div className={`h-full rounded-full transition-all ${t.bar}`} style={{ width: `${pct}%` }} />
              </div>
              {!compact && (
                <p className="mt-1 text-[11px] text-muted-foreground/80">{axis.hintForScore(score)}</p>
              )}
            </li>
          );
        })}
      </ul>
      {hardCapReason && HARD_CAP_NOTES[hardCapReason] && (
        <p className="mt-3 rounded-md border border-warning/30 bg-warning/5 px-2 py-1.5 text-[11px] text-warning">
          {HARD_CAP_NOTES[hardCapReason]}
        </p>
      )}
      {!compact && feedbackAdjustment != null && Math.abs(feedbackAdjustment) >= 0.5 && (
        <p className="mt-2 text-[11px] text-muted-foreground/80">
          {feedbackAdjustment > 0 ? "+" : ""}{feedbackAdjustment.toFixed(1)} from your activity (saves / dismisses).
        </p>
      )}
    </div>
  );
}

// Narrow runtime guard — a row's score_breakdown column may be null (legacy
// rows pre-Sprint-1) or any-shaped Json. Returns null on shape mismatch so
// callers can render a "not yet computed" fallback.
export function asRulesScoreBreakdown(value: unknown): RulesScoreBreakdown | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const keys: Array<keyof RulesScoreBreakdown> = [
    "semantic", "tech", "role", "experience", "seniority", "hub", "lpa",
  ];
  const out = {} as RulesScoreBreakdown;
  for (const k of keys) {
    const n = v[k];
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    out[k] = n;
  }
  return out;
}
