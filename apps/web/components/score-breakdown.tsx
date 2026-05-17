// "Why this score?" — turns the opaque 0-100 match number into the same 7
// dimensions the matching engine actually computed. Renders compact bars
// per axis with the points-out-of-max + a one-line hint.

export type RulesScoreBreakdown = {
  semantic: number;   // 0-35
  tech: number;       // 0-22
  role: number;       // 0-18
  experience: number; // 0-12
  seniority: number;  // 0-7
  hub: number;        // 0-4
  lpa: number;        // 0-2
};

const AXIS_META: Array<{
  key: keyof RulesScoreBreakdown;
  label: string;
  weight: number;
  hintForScore: (score: number) => string;
}> = [
  { key: "semantic", label: "Semantic JD ↔ resume", weight: 35,
    hintForScore: (s) => s >= 22 ? "Tight semantic alignment between JD and resume content."
                       : s >= 12 ? "Moderate alignment — JD overlaps your resume vocabulary."
                       : "Weak semantic match — JD content sits far from your resume." },
  { key: "tech",     label: "Tech stack",            weight: 22,
    hintForScore: (s) => s >= 18 ? "Hits most must-have skills and some nice-to-haves."
                       : s >= 12 ? "Covers core must-haves; some gaps."
                       : "Few of the JD's must-have skills are evidenced on your resume." },
  { key: "role",     label: "Role function",         weight: 18,
    hintForScore: (s) => s >= 18 ? "Direct match with your target role function."
                       : s >= 10 ? "Adjacent function — credible lateral move."
                       : "Function doesn't match your stated targets." },
  { key: "experience", label: "Experience years",    weight: 12,
    hintForScore: (s) => s >= 11 ? "Years align cleanly with JD's stated range."
                       : s >= 8  ? "Within range, with a small over- or under-qualification gap."
                       : s >= 4  ? "Notable years gap — review the JD's minimum closely."
                       : "Years gap is wide enough that ATS may auto-filter." },
  { key: "seniority", label: "Seniority alignment",  weight: 7,
    hintForScore: (s) => s >= 6 ? "Seniority signal matches the JD's level."
                       : s >= 3 ? "One level off — a stretch but not disqualifying."
                       : "Seniority mismatch — JD targets a different career band." },
  { key: "hub",      label: "Location",              weight: 4,
    hintForScore: (s) => s >= 4 ? "Hub matches your preferences."
                       : s >= 2 ? "Adjacent hub or remote option available."
                       : "Location not in your preferred hubs." },
  { key: "lpa",      label: "Compensation",          weight: 2,
    hintForScore: (s) => s >= 2 ? "JD's posted band meets your target."
                       : s >= 1 ? "Stretch to your target — negotiable."
                       : "Posted band below your target." },
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
}: {
  breakdown: RulesScoreBreakdown;
  total: number;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-border bg-card ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this score</p>
        <p className="text-xs tabular-nums">
          <span className="font-bold">{Math.round(total)}</span>
          <span className="text-muted-foreground">/100</span>
        </p>
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
