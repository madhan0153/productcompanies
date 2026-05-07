"use client";

import { useState, useTransition } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { RefreshCw, Loader2, Lightbulb, Gauge, ChevronDown, ChevronUp } from "lucide-react";
import { refreshResumeScore } from "./actions";

// Phase G — Resume Score panel.
// Standalone from match score: answers "is my resume any good for what I'm
// targeting?" Five weighted dimensions, three actionable tips, grounded in
// LIVE demand from the 18 approved companies (not generic ATS rules).

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
        className="rounded-2xl border border-dashed border-border bg-card/30 p-6"
      >
        <div className="flex items-center gap-3">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <h2 className="text-sm font-medium">Resume score</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Compute your score against live demand from the 18 approved companies.
            </p>
          </div>
          <RefreshButton
            pending={pending}
            label="Compute score"
            onClick={() => {
              setError(null);
              start(async () => {
                const r = await refreshResumeScore();
                if (!r.ok) setError(r.error);
              });
            }}
          />
        </div>
        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
      </section>
    );
  }

  const tone =
    score >= 80 ? "from-emerald-500/15 via-emerald-500/5 to-transparent text-emerald-400 border-emerald-500/30" :
    score >= 60 ? "from-amber-500/15 via-amber-500/5 to-transparent text-amber-400 border-amber-500/30" :
                  "from-rose-500/15 via-rose-500/5 to-transparent text-rose-400 border-rose-500/30";

  const grade =
    score >= 85 ? "Application-ready" :
    score >= 70 ? "Strong" :
    score >= 55 ? "Solid baseline" :
                  "Needs work";

  return (
    <motion.section
      id="resume-score"
      initial={reduce ? {} : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${tone} bg-card/50 p-6 elev-1 backdrop-blur`}
    >
      <div aria-hidden className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />

      <header className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-current/30 bg-card/60 backdrop-blur">
            <span className="text-2xl font-bold tabular-nums">{score}</span>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Resume strength</p>
            <p className="font-display text-lg font-semibold">{grade}</p>
            <p className="text-xs text-muted-foreground">
              {scoredAt ? `Updated ${formatDate(scoredAt)}` : ""} · grounded in live demand from your 18 target companies
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

      {error && <p className="relative mt-3 text-xs text-rose-400">{error}</p>}

      {/* Tips — always visible, the actionable part */}
      {tips && tips.length > 0 && (
        <div className="relative mt-5">
          <header className="mb-3 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">3 highest-impact tweaks</h3>
          </header>
          <ol className="space-y-2.5">
            {tips.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4"
              >
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                  {t.priority}
                </span>
                <div>
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
        <div className="relative mt-5">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
          >
            {expanded ? <><ChevronUp className="h-3 w-3" /> Hide breakdown</> : <><ChevronDown className="h-3 w-3" /> See breakdown</>}
          </button>

          {expanded && (
            <ul className="mt-3 space-y-2.5">
              {breakdown.map((b) => (
                <li key={b.dimension} className="rounded-xl border border-border bg-card/60 p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{b.label}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {b.score}/{b.weight}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-glow"
                      style={{ width: `${(b.score / b.weight) * 100}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{b.hint}</p>
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
      className="press inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground disabled:opacity-60 focus-ring"
    >
      {pending ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scoring…
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
