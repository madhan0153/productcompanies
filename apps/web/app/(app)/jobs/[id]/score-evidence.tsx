// Standalone Score Evidence panel — renders when the match has Sprint 6
// signals but no Fit Card (the most common case; only ~25 of 1000 matches
// get a Fit Card via the top-K limit).
//
// Mirrors the "Evidence" tab inside FitCardPanel so users see the same
// information whether or not Gemini has generated a full Fit Card for
// the role.

import { Layers, ShieldAlert, Activity } from "lucide-react";
import { getScoreBand, getConfidenceLabel } from "@/lib/matching/bands";

interface TechCoverage {
  direct?: string[];
  adjacent?: Array<{ jdSkill: string; via: string }>;
  missing?: string[];
}

const HARD_CAP_NOTES: Record<string, { label: string; tone: string }> = {
  thin_jd:       { label: "JD too short to score reliably (capped at 70).", tone: "text-warning" },
  no_stack:      { label: "None of the JD's must-have skills are on your resume (capped at 50).", tone: "text-destructive" },
  adjacent_only: { label: "Must-haves matched only by adjacent skills, not direct hits (capped at 70).", tone: "text-warning" },
  senior_no_exp: { label: "JD targets senior+; <2 yrs professional experience (capped at 45).", tone: "text-destructive" },
};

export function ScoreEvidence({
  score,
  confidence,
  hardCapReason,
  techCoverage,
  feedbackAdjustment,
}: {
  score: number;
  confidence: number | null | undefined;
  hardCapReason: string | null | undefined;
  techCoverage: unknown;
  feedbackAdjustment: number | null | undefined;
}) {
  const band = getScoreBand(score);
  const confLabel = confidence != null ? getConfidenceLabel(confidence) : null;
  const tc = asTechCoverage(techCoverage);
  const capNote = hardCapReason ? HARD_CAP_NOTES[hardCapReason] : null;

  const hasAnything = confidence != null || capNote || tc || (feedbackAdjustment != null && Math.abs(feedbackAdjustment) >= 0.5);
  if (!hasAnything) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-6" aria-label="Score evidence">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Score evidence</p>
          <p className="mt-0.5 text-sm font-semibold">{band.label}</p>
        </div>
        {confidence != null && (
          <div className="flex flex-col items-end">
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${
              confLabel === "high" ? "text-success" : confLabel === "low" ? "text-warning" : "text-muted-foreground"
            }`}>
              Confidence {confLabel}
            </p>
            <p className="text-xs tabular-nums text-muted-foreground">{Math.round(confidence)}/100</p>
          </div>
        )}
      </div>

      {capNote && (
        <div className={`mb-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs ${capNote.tone}`}>
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">{capNote.label}</span>
        </div>
      )}

      {tc && (
        <div className="mb-2">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Tech coverage vs JD must-haves
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <CoverageBucket
              tone="success"
              label="Direct"
              count={tc.direct?.length ?? 0}
              items={tc.direct ?? []}
            />
            <CoverageBucket
              tone="warning"
              label="Adjacent"
              count={tc.adjacent?.length ?? 0}
              items={(tc.adjacent ?? []).map((a) => `${a.jdSkill} (via ${a.via})`)}
            />
            <CoverageBucket
              tone="destructive"
              label="Missing"
              count={tc.missing?.length ?? 0}
              items={tc.missing ?? []}
            />
          </div>
        </div>
      )}

      {feedbackAdjustment != null && Math.abs(feedbackAdjustment) >= 0.5 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">
            {feedbackAdjustment > 0 ? "+" : ""}{feedbackAdjustment.toFixed(1)} from your activity (saves, applies, dismisses).
          </span>
        </div>
      )}
    </section>
  );
}

function CoverageBucket({
  tone, label, count, items,
}: {
  tone: "success" | "warning" | "destructive";
  label: string;
  count: number;
  items: string[];
}) {
  const tones = {
    success:     { border: "border-success/30",     bg: "bg-success/5",     text: "text-success",     count: "text-success" },
    warning:     { border: "border-warning/30",     bg: "bg-warning/5",     text: "text-warning",     count: "text-warning" },
    destructive: { border: "border-destructive/30", bg: "bg-destructive/5", text: "text-destructive", count: "text-destructive" },
  }[tone];
  return (
    <div className={`rounded-md border ${tones.border} ${tones.bg} px-3 py-2`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${tones.text}`}>{label}</span>
        <span className={`text-sm font-bold tabular-nums ${tones.count}`}>{count}</span>
      </div>
      {items.length > 0 && (
        <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
          {items.slice(0, 6).join(", ")}
          {items.length > 6 && ` +${items.length - 6} more`}
        </p>
      )}
    </div>
  );
}

function asTechCoverage(value: unknown): TechCoverage | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const hasAny =
    Array.isArray(v.direct) ||
    Array.isArray(v.adjacent) ||
    Array.isArray(v.missing);
  if (!hasAny) return null;
  return {
    direct:   Array.isArray(v.direct)   ? (v.direct as string[]).filter((x) => typeof x === "string") : [],
    adjacent: Array.isArray(v.adjacent) ? (v.adjacent as Array<{ jdSkill: string; via: string }>).filter((a) => a && typeof a === "object" && typeof a.jdSkill === "string" && typeof a.via === "string") : [],
    missing:  Array.isArray(v.missing)  ? (v.missing as string[]).filter((x) => typeof x === "string") : [],
  };
}
