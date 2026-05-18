"use client";

// Tailored Resume — review screen. Mirrors profile/enhance/review.tsx but
// uses the per-job tailored actions and surfaces the mode (polish/tailor).

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, CheckCircle2, Loader2, Download, Printer,
  ListChecks, Trash2, ShieldCheck, Wand2, Eye,
} from "lucide-react";
import {
  applyTailoredDecisions,
  finaliseTailored,
  discardTailored,
} from "../tailor-actions";
import { BulletReviewCard, type BulletDecision } from "@/components/diff-review/bullet-card";
import { AtsScorecardPanel } from "@/components/diff-review/ats-compare";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { BulletRewrite, RewriteMode } from "@/lib/llm/prompts/bullet-rewrite";
import type { AtsScorecard } from "@/lib/matching/ats-scorecard";
import type { EnhancementDecision } from "../../../profile/enhance-actions";

interface Props {
  jobId: string;
  rowId: string;
  mode: RewriteMode;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  atsBefore: AtsScorecard;
}

const GRADE_TONE: Record<string, { tone: string; bg: string; border: string }> = {
  A: { tone: "text-success",     bg: "bg-success/10",     border: "border-success/30" },
  B: { tone: "text-success",     bg: "bg-success/5",      border: "border-success/20" },
  C: { tone: "text-warning",     bg: "bg-warning/10",     border: "border-warning/30" },
  D: { tone: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
};

export function TailorReview({
  jobId, rowId, mode, diagnosis, rewrites, decisions: initial, atsBefore,
}: Props) {
  const router = useRouter();
  const [decisions, setDecisions] = useState<Record<string, EnhancementDecision>>(initial ?? {});
  const [saving, setSaving] = useState(false);
  const [finalising, startFinalising] = useTransition();
  const [discarding, startDiscarding] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [finalisedUrls, setFinalisedUrls] = useState<{ docx: string; print: string } | null>(null);
  void rowId;

  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const total = diagnosis.weak_bullets.length;
  const reviewed = useMemo(
    () => diagnosis.weak_bullets.reduce((acc, _, i) => acc + (decisions[String(i)] ? 1 : 0), 0),
    [decisions, diagnosis.weak_bullets],
  );

  useEffect(() => {
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      setSaving(true);
      try { await applyTailoredDecisions(jobId, decisions); }
      finally { setSaving(false); }
    }, 700);
    return () => { if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current); };
  }, [decisions, jobId]);

  const onChange = (bulletId: string, decision: BulletDecision) => {
    setDecisions((d) => ({ ...d, [bulletId]: decision }));
  };

  const onFinalise = () => {
    setError(null);
    startFinalising(async () => {
      try {
        const res = await finaliseTailored(jobId);
        if (res.ok) {
          setFinalisedUrls({ docx: res.download_url, print: res.print_url });
          router.refresh();
        } else {
          setError(res.error || "Couldn't finalise. Please retry.");
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? `Couldn't finalise: ${err.message}`
            : "Couldn't finalise. Please check your connection and retry.",
        );
      }
    });
  };

  const onDiscard = () => {
    if (!confirm("Discard this tailoring? Your original resume isn't affected.")) return;
    startDiscarding(async () => {
      const res = await discardTailored(jobId);
      if (res.ok) router.refresh();
    });
  };

  const gradeTone = GRADE_TONE[diagnosis.overall_grade] ?? GRADE_TONE.C;

  return (
    <div className="space-y-4 pb-32">
      {/* Mode + grade banner */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
          mode === "polish"
            ? "border-success/30 bg-success/10 text-success"
            : "border-primary/30 bg-primary-soft text-primary"
        }`}>
          {mode === "polish" ? <ShieldCheck className="h-3 w-3" /> : <Wand2 className="h-3 w-3" />}
          {mode === "polish" ? "Polish mode" : "Tailor mode"}
        </span>
      </div>

      <div className={`rounded-xl border ${gradeTone.border} ${gradeTone.bg} p-4`}>
        <div className="flex items-start gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border ${gradeTone.border} bg-background text-xl font-bold ${gradeTone.tone}`}>
            {diagnosis.overall_grade}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">JD-anchored read</p>
            <p className="mt-0.5 text-sm font-medium leading-relaxed">{diagnosis.headline}</p>
          </div>
        </div>
      </div>

      <AtsScorecardPanel before={atsBefore} after={null} />

      {diagnosis.missing_keywords.length > 0 && (
        <details className="rounded-xl border border-border bg-card">
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
            <Eye className="h-4 w-4 text-primary" aria-hidden />
            Missing JD keywords
            <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
              {diagnosis.missing_keywords.length}
            </span>
          </summary>
          <ul className="space-y-2 border-t border-border px-4 py-3">
            {diagnosis.missing_keywords.map((k, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <strong className="text-foreground">{k.keyword}</strong>
                <span className="ml-1 text-[10px] uppercase tracking-wider opacity-70">({k.presence})</span>
                <p className="mt-0.5 leading-relaxed">{k.rationale}</p>
              </li>
            ))}
          </ul>
        </details>
      )}

      {diagnosis.weak_bullets.length === 0 ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-center text-sm text-success">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6" aria-hidden />
          Your resume already covers this JD well. Finalise to render the canonical .docx.
        </div>
      ) : (
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ListChecks className="h-4 w-4 text-primary" aria-hidden />
              Suggested changes
            </h2>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {reviewed} / {total} reviewed
            </span>
          </div>
          <div className="space-y-3">
            {diagnosis.weak_bullets.map((b, i) => {
              const id = String(i);
              const rewrite = rewrites[id] ?? null;
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

      {finalisedUrls && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Tailored resume saved
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Ready for download. Your profile resume is unchanged.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {finalisedUrls.docx && (
              <a
                href={finalisedUrls.docx}
                className="press tap-target-sm inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
              >
                <Download className="h-3 w-3" /> Download .docx
              </a>
            )}
            {finalisedUrls.print && (
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

      {!finalisedUrls && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 lg:left-64 lg:bg-background lg:py-4">
          {error && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>{error}</p>
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
                "Finalise & download"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
