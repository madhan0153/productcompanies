"use client";

// Reusable diff-review card — mobile-first.
// Renders one weak bullet (original) + its alternatives + a tiny action bar.
//
// The parent owns state — this is a controlled component. Decisions are
// reported via onChange so the parent can save them to the server in
// batches (debounced) or all at once on finalise.

import { useState } from "react";
import { Check, Edit3, AlertTriangle, X, Sparkles } from "lucide-react";
import type { BulletRewrite, RewriteRiskFlag } from "@/lib/llm/prompts/bullet-rewrite";

export interface BulletDecision {
  choice: string;           // "kept" | "skipped" | "edited" | "alt-<n>"
  text?: string;            // when choice="edited"
}

interface Props {
  bulletId: string;         // string key (the parent's bullet_index)
  /** Where the bullet lives. */
  location: string;         // e.g. "Razorpay · Senior SDE" or "Summary"
  /** Verbatim original. */
  original: string;
  /** Up to 3 LLM-proposed alternatives. */
  alternatives: BulletRewrite["alternatives"];
  /** Severity 1-3. Drives the color of the badge. */
  severity?: 1 | 2 | 3;
  /** Human-readable weakness label. */
  weakness?: string;
  decision: BulletDecision | undefined;
  onChange(d: BulletDecision): void;
}

const RISK_LABEL: Record<NonNullable<RewriteRiskFlag>, string> = {
  metric_inferred: "Number/scale inferred — confirm only if true",
  tech_inferred:   "Tech keyword surfaced from your wider resume — confirm bullet actually used it",
  scope_inferred:  "Scope language tightened — confirm it matches your actual role",
};

const SEVERITY_DOT: Record<1 | 2 | 3, string> = {
  1: "bg-muted-foreground/50",
  2: "bg-warning",
  3: "bg-destructive",
};

const WEAKNESS_LABEL: Record<string, string> = {
  no_metric:     "Missing measurement",
  weak_verb:     "Weak verb",
  vague_scope:   "Vague scope",
  passive_voice: "Passive voice",
  tense_drift:   "Tense drift",
  keyword_gap:   "Keyword gap",
  redundancy:    "Redundant phrasing",
};

export function BulletReviewCard({
  bulletId,
  location,
  original,
  alternatives,
  severity = 2,
  weakness,
  decision,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(decision?.choice === "edited");
  const [editValue, setEditValue] = useState(decision?.text ?? original);
  void bulletId;

  const acceptAlt = (idx: number) => {
    onChange({ choice: `alt-${idx}` });
    setEditing(false);
  };

  const keep = () => {
    onChange({ choice: "kept" });
    setEditing(false);
  };

  const startEdit = () => {
    setEditing(true);
    setEditValue(decision?.text ?? selectedAltText() ?? original);
  };

  const saveEdit = () => {
    if (editValue.trim().length === 0) return;
    onChange({ choice: "edited", text: editValue.trim() });
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  function selectedAltText(): string | null {
    if (!decision) return null;
    const m = /^alt-(\d+)$/.exec(decision.choice);
    if (!m) return null;
    return alternatives[parseInt(m[1], 10)]?.text ?? null;
  }

  const isKept = decision?.choice === "kept";
  const isEdited = decision?.choice === "edited";
  const acceptedAltIdx = (() => {
    if (!decision) return -1;
    const m = /^alt-(\d+)$/.exec(decision.choice);
    return m ? parseInt(m[1], 10) : -1;
  })();

  return (
    <div className="rounded-xl border border-border bg-card p-3.5 sm:p-4">
      {/* Header */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_DOT[severity]}`} aria-hidden />
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {location}
        </p>
        {weakness && (
          <span className="ml-auto shrink-0 rounded-full border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {WEAKNESS_LABEL[weakness] ?? weakness}
          </span>
        )}
      </div>

      {/* Original */}
      <div className="mb-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Original
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{original}</p>
      </div>

      {/* Alternatives */}
      {!editing && (
        <ul className="space-y-2">
          {alternatives.length === 0 && (
            <li className="rounded-md border border-dashed border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
              No AI rewrite returned for this bullet. Edit manually or keep the original.
            </li>
          )}
          {alternatives.map((alt, i) => {
            const accepted = acceptedAltIdx === i;
            return (
              <li
                key={i}
                className={`rounded-md border px-3 py-2.5 transition ${
                  accepted
                    ? "border-success/40 bg-success/5"
                    : "border-border bg-secondary/30 hover:border-foreground/20"
                }`}
              >
                <div className="flex items-start gap-2">
                  <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" aria-hidden />
                  <p className="flex-1 text-sm leading-relaxed text-foreground">{alt.text}</p>
                </div>
                {alt.why && (
                  <p className="mt-1 pl-5 text-[11px] text-muted-foreground">{alt.why}</p>
                )}
                {alt.risk_flag && (
                  <div className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-[11px] text-warning">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                    <span>{RISK_LABEL[alt.risk_flag]}</span>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => acceptAlt(i)}
                    className={`tap-target-sm inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition focus-ring ${
                      accepted
                        ? "bg-success text-success-foreground"
                        : "border border-success/30 bg-success/10 text-success hover:bg-success/20"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                    {accepted ? "Accepted" : "Accept"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Inline editor */}
      {editing && (
        <div className="space-y-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-border bg-background px-2.5 py-2 text-sm leading-relaxed text-foreground focus-ring"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveEdit}
              className="tap-target-sm inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
            >
              <Check className="h-3 w-3" /> Save
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary focus-ring"
            >
              <X className="h-3 w-3" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Footer actions — keep / edit */}
      {!editing && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-2.5">
          <button
            type="button"
            onClick={keep}
            className={`tap-target-sm inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition focus-ring ${
              isKept
                ? "border-foreground/40 bg-secondary text-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {isKept ? <Check className="h-3 w-3" /> : null}
            Keep original
          </button>
          <button
            type="button"
            onClick={startEdit}
            className={`tap-target-sm inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition focus-ring ${
              isEdited
                ? "border-primary/40 bg-primary-soft text-primary"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Edit3 className="h-3 w-3" />
            {isEdited ? "Edited" : "Edit"}
          </button>
        </div>
      )}
    </div>
  );
}
