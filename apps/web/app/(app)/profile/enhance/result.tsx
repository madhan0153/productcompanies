"use client";

// Result view for a finalised enhancement.
// Renders the before/after ATS scorecard, the list of changes the auto-flow
// made, risk-flag callouts, and the canonical "Keep as my resume" CTA.
//
// Survives the disappear bug — this view loads server-side from the
// enhanced_resumes row + signed download URL, so the success UI persists
// across navigation/refresh. The previous bug was that the per-bullet
// review component held download URLs in component state, which got reset
// when router.refresh() re-rendered the page with a finalised (no longer
// pending) row.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, AlertTriangle, Loader2, Download, Printer,
  TrendingUp, TrendingDown, Sparkles, RefreshCw, Trash2,
} from "lucide-react";
import {
  keepEnhancedAsResume,
  discardEnhancement,
  autoEnhanceResume,
  type EnhancementDecision,
} from "../enhance-actions";
import { AtsScorecardPanel } from "@/components/diff-review/ats-compare";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { BulletRewrite, RewriteRiskFlag } from "@/lib/llm/prompts/bullet-rewrite";
import type { AtsScorecard } from "@/lib/matching/ats-scorecard";
import type { TailoredResumeContent } from "@/lib/llm/prompts/tailor-resume";

interface Props {
  id: string;
  atsBefore: AtsScorecard;
  atsAfter: AtsScorecard | null;
  enhancedContent: TailoredResumeContent | null;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  downloadUrl: string | null;
  finalisedAt: string | null;
}

const RISK_LABEL: Record<NonNullable<RewriteRiskFlag>, string> = {
  metric_inferred: "Numeric inference",
  tech_inferred:   "Tech keyword inferred",
  scope_inferred:  "Scope inference",
};

const RISK_DETAIL: Record<NonNullable<RewriteRiskFlag>, string> = {
  metric_inferred: "We added a quantity/scale not in the original. Verify before submitting.",
  tech_inferred:   "We surfaced a tech from your wider stack into this bullet. Confirm it was used.",
  scope_inferred:  "We tightened the scope language. Confirm it matches your actual role.",
};

export function EnhanceResult({
  id, atsBefore, atsAfter, enhancedContent,
  diagnosis, rewrites, decisions, downloadUrl, finalisedAt,
}: Props) {
  const router = useRouter();
  const [keeping, startKeep] = useTransition();
  const [discarding, startDiscard] = useTransition();
  const [redoing, startRedo] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [kept, setKept] = useState(false);

  // Build the changes list from the decisions map.
  // For each weak_bullet where the user (auto-flow) accepted an alt, we
  // surface: location, original, rewritten, risk flag, why.
  const changes = diagnosis.weak_bullets.map((wb, idx) => {
    const d = decisions[String(idx)];
    if (!d) return null;
    if (d.choice === "kept" || d.choice === "skipped") return null;

    let rewritten: string | null = null;
    let risk_flag: RewriteRiskFlag = null;
    let why = "";

    if (d.choice === "edited" && d.text) {
      rewritten = d.text;
    } else {
      const m = /^alt-(\d+)$/.exec(d.choice);
      if (m) {
        const altIdx = parseInt(m[1], 10);
        const alt = rewrites[String(idx)]?.alternatives[altIdx];
        if (alt) {
          rewritten = alt.text;
          risk_flag = alt.risk_flag;
          why = alt.why;
        }
      }
    }
    if (!rewritten) return null;
    return {
      location: wb.section === "summary"
        ? "Summary"
        : wb.section === "projects"
          ? `Project ${wb.bullet_index + 1}`
          : (wb.company ?? "Experience"),
      original: wb.original,
      rewritten,
      risk_flag,
      why,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  const riskCount = changes.filter((c) => c.risk_flag !== null).length;
  const delta = atsAfter ? atsAfter.total - atsBefore.total : null;

  const onKeep = () => {
    setError(null);
    startKeep(async () => {
      try {
        const res = await keepEnhancedAsResume(id);
        if (res.ok) {
          setKept(true);
          // Soft refresh so /profile picks up the new score / parsed JSON.
          setTimeout(() => router.refresh(), 600);
        } else {
          setError(res.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update your resume.");
      }
    });
  };

  const onDiscard = () => {
    if (!confirm("Discard this enhancement? Your original resume is unaffected.")) return;
    startDiscard(async () => {
      const res = await discardEnhancement(id);
      if (res.ok) router.refresh();
    });
  };

  const onRedo = () => {
    if (!confirm("Re-run auto-enhance? This uses one of your monthly slots.")) return;
    startRedo(async () => {
      const res = await autoEnhanceResume();
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  };

  return (
    <div className="space-y-4 pb-32">
      {/* Headline */}
      <div className="rounded-xl border border-success/30 bg-success/5 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          Enhancement ready
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {delta !== null && delta > 0 ? (
            <>
              ATS score lifted from <strong className="text-foreground">{atsBefore.total}</strong> to <strong className="text-success">{atsAfter!.total}</strong> ({delta > 0 ? "+" : ""}{delta} points). {changes.length} bullet{changes.length === 1 ? "" : "s"} improved.
            </>
          ) : delta !== null && delta === 0 ? (
            <>No score lift — your resume is already strong on the dimensions the ATS scorer checks.</>
          ) : (
            <>{changes.length} change{changes.length === 1 ? "" : "s"} applied. Review below.</>
          )}
        </p>
        {finalisedAt && (
          <p className="mt-1 text-[10px] text-muted-foreground/80">
            Generated {new Date(finalisedAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* ATS before/after */}
      <AtsScorecardPanel before={atsBefore} after={atsAfter} />

      {/* Risk flag banner — only if any */}
      {riskCount > 0 && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            {riskCount} change{riskCount === 1 ? "" : "s"} need a quick check
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We surfaced content your resume doesn&apos;t explicitly say (a number, a tech, a tighter scope). Confirm these match reality before applying to roles.
          </p>
        </div>
      )}

      {/* Changes list — collapsed by default with first 3 visible */}
      {changes.length > 0 && (
        <details className="rounded-xl border border-border bg-card" open>
          <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            Changes made
            <span className="ml-auto rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] tabular-nums">
              {changes.length}
            </span>
          </summary>
          <ul className="space-y-3 border-t border-border px-4 py-3">
            {changes.map((c, i) => (
              <li key={i} className="rounded-md border border-border/60 bg-secondary/30 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{c.location}</p>
                <div className="mt-1.5 space-y-1.5">
                  <p className="rounded border-l-2 border-destructive/40 bg-destructive/5 px-2 py-1 text-xs text-muted-foreground/90">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-destructive/70">Before</span>
                    <br />
                    {c.original}
                  </p>
                  <p className="rounded border-l-2 border-success/40 bg-success/5 px-2 py-1 text-xs text-foreground/90">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-success/70">After</span>
                    <br />
                    {c.rewritten}
                  </p>
                </div>
                {c.why && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground/80">{c.why}</p>
                )}
                {c.risk_flag && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    <span>
                      <strong>{RISK_LABEL[c.risk_flag]}:</strong> {RISK_DETAIL[c.risk_flag]}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Download / print — visible regardless of keep state */}
      <div className="flex flex-wrap gap-2">
        {downloadUrl && (
          <a
            href={downloadUrl}
            className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:bg-secondary focus-ring"
          >
            <Download className="h-3.5 w-3.5" aria-hidden /> Download .docx
          </a>
        )}
        <a
          href={`/profile/enhance/${id}/print?autoprint=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/30 hover:bg-secondary focus-ring"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden /> Save as PDF
        </a>
      </div>

      {/* Sticky bottom action bar — keep / redo / discard */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-3 lg:left-64 lg:bg-background lg:py-4">
        {kept && (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>Saved. Your matches will use this version after the next compute.</p>
          </div>
        )}
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
            disabled={discarding || keeping || redoing}
            className="tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50 focus-ring"
            title="Discard this enhancement"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={discarding || keeping || redoing}
            className="tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary/30 hover:text-primary disabled:opacity-50 focus-ring"
            title="Re-run auto-enhance"
          >
            {redoing
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
          </button>
          <button
            type="button"
            onClick={onKeep}
            disabled={keeping || discarding || redoing || kept}
            className="press tap-target ml-auto inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
          >
            {keeping ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Saving…
              </>
            ) : kept ? (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Saved
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Keep as my resume
              </>
            )}
          </button>
        </div>
      </div>

      {/* Hint about what "keep" does */}
      {!kept && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          <strong>&quot;Keep as my resume&quot;</strong> swaps the enhanced version in for matching. Your original is kept in resume history — you can revert any time. The source PDF in storage is unchanged.
        </p>
      )}

      {/* Silence unused-prop warning — enhancedContent is read server-side
          for the print route; kept on the prop list for clarity. */}
      {!enhancedContent && null}
    </div>
  );
}
