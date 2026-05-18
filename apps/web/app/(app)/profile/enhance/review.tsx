"use client";

// Mobile-first review screen for an enhanced_resumes row in pending_review.
// Renders the diagnosis headline, ATS scorecard, and one BulletReviewCard per
// weak bullet. Tracks decisions in React state, debounces save-to-server, and
// surfaces the Finalise / Discard actions in a sticky bottom bar.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Loader2, Download, Printer,
  Eye, ListChecks, Trash2,
} from "lucide-react";
import {
  applyEnhancementDecisions,
  finaliseEnhancement,
  discardEnhancement,
  type EnhancementDecision,
} from "../enhance-actions";
import { BulletReviewCard, type BulletDecision } from "@/components/diff-review/bullet-card";
import { AtsScorecardPanel } from "@/components/diff-review/ats-compare";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { BulletRewrite } from "@/lib/llm/prompts/bullet-rewrite";
import type { AtsScorecard } from "@/lib/matching/ats-scorecard";

interface EnhancedRow {
  id: string;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  ats_before: AtsScorecard;
  ats_after: AtsScorecard | null;
  status: "pending_review" | "finalised" | "discarded";
}

const GRADE_TONE: Record<string, { tone: string; bg: string; border: string }> = {
  A: { tone: "text-success",     bg: "bg-success/10",     border: "border-success/30" },
  B: { tone: "text-success",     bg: "bg-success/5",      border: "border-success/20" },
  C: { tone: "text-warning",     bg: "bg-warning/10",     border: "border-warning/30" },
  D: { tone: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

export function EnhanceReview({ row }: { row: EnhancedRow }) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, EnhancementDecision>>(
    row.decisions ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [finaliseError, setFinaliseError] = useState<string | null>(null);
  const [finalising, startFinalising] = useTransition();
  const [discarding, startDiscarding] = useTransition();
  const [finalisedUrls, setFinalisedUrls] = useState<{ docx: string; print: string } | null>(null);

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = row.diagnosis.weak_bullets.length;
  const reviewed = useMemo(() => {
    return row.diagnosis.weak_bullets.reduce((acc, _, i) => {
      return acc + (decisions[String(i)] ? 1 : 0);
    }, 0);
  }, [decisions, row.diagnosis.weak_bullets]);

  // Debounced server save on each decision change. 700ms — enough to coalesce
  // rapid taps, fast enough to feel responsive.
  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await applyEnhancementDecisions(row.id, decisions);
      } finally {
        setSaving(false);
      }
    }, 700);
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [decisions, row.id]);

  const onChange = (bulletId: string, decision: BulletDecision) => {
    setDecisions((d) => ({ ...d, [bulletId]: decision }));
  };

  const onFinalise = () => {
    setFinaliseError(null);
    startFinalising(async () => {
      const res = await finaliseEnhancement(row.id);
      if (res.ok) {
        setFinalisedUrls({ docx: res.docx_url, print: res.print_url });
        // Hard-refresh so the parent loads ats_after etc.
        router.refresh();
      } else {
        setFinaliseError(res.error);
      }
    });
  };

  const onDiscard = () => {
    if (!confirm("Discard this enhancement? Your original resume isn't affected.")) return;
    startDiscarding(async () => {
      const res = await discardEnhancement(row.id);
      if (res.ok) router.refresh();
    });
  };

  const gradeTone = GRADE_TONE[row.diagnosis.overall_grade] ?? GRADE_TONE.C;
  const isFinalised = row.status === "finalised";

  return (
    <div className="space-y-4 pb-32">
      {/* Headline + grade */}
      <div className={`rounded-xl border ${gradeTone.border} ${gradeTone.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${gradeTone.border} bg-background text-xl font-bold ${gradeTone.tone}`}>
            {row.diagnosis.overall_grade}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recruiter read
            </p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed">{row.diagnosis.headline}</p>
          </div>
        </div>
      </div>

      {/* ATS scorecard — before only on pending; before/after on finalised */}
      <AtsScorecardPanel before={row.ats_before} after={row.ats_after} />

      {/* ATS risks */}
      {row.diagnosis.ats_risks.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" aria-hidden />
            ATS risks
            <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
              {row.diagnosis.ats_risks.length}
            </span>
          </summary>
          <ul className="space-y-2 border-t border-border px-4 py-3">
            {row.diagnosis.ats_risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                  r.severity === 3 ? "bg-destructive" : r.severity === 2 ? "bg-warning" : "bg-muted-foreground/50"
                }`} aria-hidden />
                <div>
                  <p className="text-foreground/90">{r.issue}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">{r.where}</p>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Recruiter concerns */}
      {row.diagnosis.recruiter_concerns.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" aria-hidden />
            Recruiter concerns
            <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
              {row.diagnosis.recruiter_concerns.length}
            </span>
          </summary>
          <ul className="space-y-2 border-t border-border px-4 py-3">
            {row.diagnosis.recruiter_concerns.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {c}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Bullets */}
      {row.diagnosis.weak_bullets.length === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center text-sm text-success">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6" aria-hidden />
          No weak bullets detected. Your resume is in good shape.
        </div>
      ) : (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden />
              Suggested bullet changes
            </h2>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {reviewed} / {total} reviewed
            </span>
          </div>
          <div className="space-y-3">
            {row.diagnosis.weak_bullets.map((b, i) => {
              const id = String(i);
              const rewrite = row.rewrites[id] ?? null;
              const location = b.section === "summary"
                ? "Summary"
                : b.section === "projects"
                  ? "Projects"
                  : b.company ?? "Experience";
              return (
                <BulletReviewCard
                  key={id}
                  bulletId={id}
                  location={location}
                  original={b.original}
                  alternatives={rewrite?.alternatives ?? []}
                  severity={b.severity}
                  weakness={b.weakness}
                  decision={decisions[id]}
                  onChange={(d) => onChange(id, d)}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Finalised banner — appears after the user clicks Finalise */}
      {(isFinalised || finalisedUrls) && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Enhancement saved
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Your enhanced resume is ready. The original on your profile is unchanged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {finalisedUrls?.docx && (
              <a
                href={finalisedUrls.docx}
                className="press tap-target-sm inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
              >
                <Download className="h-3 w-3" /> Download .docx
              </a>
            )}
            {finalisedUrls?.print && (
              <a
                href={`${finalisedUrls.print}?autoprint=1`}
                target="_blank"
                rel="noopener noreferrer"
                className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary focus-ring"
              >
                <Printer className="h-3 w-3" /> Save as PDF
              </a>
            )}
          </div>
        </div>
      )}

      {/* Sticky bottom action bar — mobile-first */}
      {!isFinalised && !finalisedUrls && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 lg:left-64 lg:bg-background lg:py-4">
          {finaliseError && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>{finaliseError}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDiscard}
              disabled={discarding || finalising}
              className="tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-ring"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Discard</span>
            </button>
            <span className="text-[11px] text-muted-foreground">
              {saving ? "Saving…" : `${reviewed}/${total} reviewed`}
            </span>
            <button
              type="button"
              onClick={onFinalise}
              disabled={finalising || discarding}
              className="press tap-target ml-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
            >
              {finalising ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Finalising…
                </>
              ) : (
                "Finalise & generate"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
