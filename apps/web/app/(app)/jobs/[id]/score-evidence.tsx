// Standalone Score Evidence panel.
//
// Mobile-first rewrite: this used to render unconditionally and ate ~120px
// just to display "Weak fit · conf 82". Now it ONLY renders when there's
// substance worth a card-sized block:
//   - Hard cap reason set
//   - Tech coverage has at least one missing must-have
//   - Feedback delta is material
//   - Low confidence (<55)
// Otherwise returns null and the page uses the hero's inline chips instead.

import { Layers, ShieldAlert, Activity } from "lucide-react";
import { getConfidenceLabel } from "@/lib/matching/bands";

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
  confidence,
  hardCapReason,
  techCoverage,
  feedbackAdjustment,
}: {
  /** Score retained as prop for future use but not displayed (hero shows it). */
  score?: number;
  confidence: number | null | undefined;
  hardCapReason: string | null | undefined;
  techCoverage: unknown;
  feedbackAdjustment: number | null | undefined;
}) {
  const tc = asTechCoverage(techCoverage);
  const capNote = hardCapReason ? HARD_CAP_NOTES[hardCapReason] : null;
  const lowConfidence = confidence != null && confidence < 55;
  const hasMissing = !!tc && (tc.missing?.length ?? 0) > 0;
  const hasFeedback = feedbackAdjustment != null && Math.abs(feedbackAdjustment) >= 0.5;

  // Mobile-first gate: only render when there's substance. Boring evidence
  // (high confidence + no cap + no missing skills) is silent — the hero
  // card already communicates everything via verdict + score + cap chip.
  const worthRendering = capNote || hasMissing || lowConfidence || hasFeedback;
  if (!worthRendering) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 sm:p-5" aria-label="Score evidence">
      <header className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this score</p>
        {lowConfidence && confidence != null && (
          <span className="inline-flex items-center rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">
            Confidence {getConfidenceLabel(confidence)} · {Math.round(confidence)}
          </span>
        )}
      </header>

      {capNote && (
        <div className={`mb-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs ${capNote.tone}`}>
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">{capNote.label}</span>
        </div>
      )}

      {tc && hasMissing && (
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Layers className="h-3.5 w-3.5" /> Skills the JD asks for
          </div>
          {/* Mobile: 2-col grid (Have/Missing). Adjacent only shows when present. */}
          <div className="grid grid-cols-2 gap-2">
            <CoverageBucket
              tone="success"
              label={`On your resume · ${(tc.direct?.length ?? 0)}`}
              items={tc.direct ?? []}
            />
            <CoverageBucket
              tone="destructive"
              label={`Missing · ${(tc.missing?.length ?? 0)}`}
              items={tc.missing ?? []}
            />
          </div>
          {tc.adjacent && tc.adjacent.length > 0 && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-warning">Adjacent on your resume:</span>{" "}
              {tc.adjacent.slice(0, 4).map((a) => `${a.jdSkill} (via ${a.via})`).join(", ")}
              {tc.adjacent.length > 4 && ` +${tc.adjacent.length - 4} more`}
            </p>
          )}
        </div>
      )}

      {hasFeedback && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
          <Activity className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="leading-relaxed">
            {feedbackAdjustment > 0 ? "+" : ""}{feedbackAdjustment.toFixed(1)} from your activity.
          </span>
        </div>
      )}
    </section>
  );
}

function CoverageBucket({
  tone, label, items,
}: {
  tone: "success" | "warning" | "destructive";
  label: string;
  items: string[];
}) {
  const tones = {
    success:     { border: "border-success/30",     bg: "bg-success/5",     text: "text-success"     },
    warning:     { border: "border-warning/30",     bg: "bg-warning/5",     text: "text-warning"     },
    destructive: { border: "border-destructive/30", bg: "bg-destructive/5", text: "text-destructive" },
  }[tone];
  return (
    <div className={`rounded-md border ${tones.border} ${tones.bg} px-2.5 py-2`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${tones.text}`}>{label}</span>
      {items.length > 0 && (
        <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
          {items.slice(0, 5).join(", ")}
          {items.length > 5 && ` +${items.length - 5} more`}
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
