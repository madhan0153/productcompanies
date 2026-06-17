"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Loader2, Lightbulb, Gauge, ChevronDown, ChevronUp } from "lucide-react";
import { refreshResumeScore } from "./actions";

// Resume Score panel — answers "is my resume any good for what I'm targeting?"
// Five weighted dimensions, three actionable tips, grounded in LIVE demand
// from the 51 approved companies (not generic ATS rules).

export interface ResumeScorePanelData {
  score: number | null;
  breakdown: Array<{
    dimension: string;
    label: string;
    score: number;
    weight: number;
    hint: string;
  }> | null;
  tips: Array<{
    priority: 1 | 2 | 3;
    tip: string;
    why: string;
  }> | null;
  scoredAt: string | null;
}

export function ResumeScorePanel({ score, breakdown, tips, scoredAt }: ResumeScorePanelData) {
  const reduce = useReducedMotion();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (score === null) {
    return (
      <section
        id="resume-score"
        className="rounded-xl border border-dashed border-border bg-secondary/30 p-5"
      >
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">Resume score</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Compute your score against live demand from the 51 approved companies.
            </p>
          </div>
          <RefreshButton
            pending={pending}
            label="Compute"
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await refreshResumeScore();
                if (!r.ok) setError(r.error);
              });
            }}
          />
        </div>
        {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      </section>
    );
  }

  const tone =
    score >= 80 ? { text: "text-success", border: "border-success/30", bg: "bg-success/5" } :
    score >= 60 ? { text: "text-warning", border: "border-warning/30", bg: "bg-warning/5" } :
                  { text: "text-destructive", border: "border-destructive/30", bg: "bg-destructive/5" };

  const grade =
    score >= 85 ? "High callback likelihood" :
    score >= 70 ? "Good callback likelihood" :
    score >= 55 ? "Moderate — improvements will help" :
                  "Low — address tips below first";

  return (
    <motion.section
      id="resume-score"
      initial={reduce ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-xl border ${tone.border} ${tone.bg} p-5 sm:p-6`}
    >
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border ${tone.border} bg-card ${tone.text}`}>
            <span className="text-xl font-bold tabular-nums">{score}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Callback signal</p>
            <p className={`text-lg font-semibold ${tone.text}`}>{grade}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {scoredAt ? `Updated ${formatDate(scoredAt)}` : ""} · scored against live JD demand from 51 product companies
            </p>
          </div>
        </div>

        <RefreshButton
          pending={pending}
          label="Recompute"
          onClick={() => {
            setError(null);
            start(async () => {
              const r = await refreshResumeScore();
              if (!r.ok) setError(r.error);
            });
          }}
        />
      </header>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}

      {/* Tips — always visible, the actionable part */}
      {tips && tips.length > 0 && (
        <div className="mt-5">
          <header className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">3 highest-impact tweaks to lift callbacks</h3>
          </header>
          <ol className="space-y-2.5">
            {tips.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[11px] font-bold text-primary-soft-foreground">
                  {t.priority}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-snug">{t.tip}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t.why}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Breakdown — collapsed by default, transparency on demand */}
      {breakdown && breakdown.length > 0 && (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> Hide breakdown</> : <><ChevronDown className="h-3 w-3" /> See breakdown</>}
          </button>

          {expanded && (
            <ul className="mt-3 space-y-2.5">
              {breakdown.map((b) => (
                <li key={b.dimension} className="rounded-xl border border-border bg-card p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{b.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {b.score}/{b.weight}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(b.score / b.weight) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{b.hint}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </motion.section>
  );
}

function RefreshButton({
  pending, label, onClick,
}: {
  pending: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60 focus-ring"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> Scoring…
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5" /> {label}
        </>
      )}
    </button>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const diff = Math.round((Date.now() - d.getTime()) / 86400000);
    if (diff <= 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 30) return `${diff}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}
