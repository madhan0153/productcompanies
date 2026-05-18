"use client";

// Mobile-first entry view for /profile/enhance.
// Primary CTA: Auto-enhance (one-shot — diagnose + rewrite + render).
// Secondary CTA: review each change (per-bullet flow for power users).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, AlertCircle, Wand2, ShieldCheck,
  FileSearch, Brain, Pencil, BarChart2,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { autoEnhanceResume, diagnoseEnhancement } from "../enhance-actions";

interface Props {
  quotaUsed: number;
  quotaLimit: number;
  quotaExhausted: boolean;
  roleFunction: string | null;
}

const STAGES = [
  { label: "Reading your resume…",      icon: FileSearch },
  { label: "Diagnosing weak bullets…",  icon: Brain },
  { label: "Drafting improvements…",    icon: Pencil },
  { label: "Scoring the new version…",  icon: BarChart2 },
];

export function EnhanceEntry({ quotaUsed, quotaLimit, quotaExhausted, roleFunction }: Props) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [autoPending, startAuto] = useTransition();
  const [reviewPending, startReview] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);

  const runAuto = () => {
    setError(null);
    setStage(0);

    // Drive the stage indicator on a timer — the server action takes
    // ~20-40s total. Each stage shows for ~10s.
    const interval = setInterval(() => {
      setStage((s) => Math.min(s + 1, STAGES.length - 1));
    }, 10_000);

    startAuto(async () => {
      try {
        const res = await autoEnhanceResume();
        clearInterval(interval);
        if (res.ok) {
          router.refresh();
        } else {
          setError(res.error);
        }
      } catch (err) {
        clearInterval(interval);
        setError(err instanceof Error ? err.message : "Couldn't enhance. Please retry.");
      }
    });
  };

  const runReview = () => {
    setError(null);
    startReview(async () => {
      try {
        const res = await diagnoseEnhancement();
        if (res.ok) router.refresh();
        else setError(res.error);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't start review. Please retry.");
      }
    });
  };

  const pending = autoPending || reviewPending;

  return (
    <motion.div
      className="space-y-4"
      initial={reduce ? {} : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Primary auto-enhance card */}
      <div className="rounded-xl border-2 border-primary/40 bg-primary-soft p-4 sm:p-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wand2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold sm:text-lg">Auto-enhance my resume</p>
            <p className="text-[11px] text-muted-foreground">
              Target ATS score: 75–80%{roleFunction ? ` · ${roleFunction.replace(/_/g, " ")}` : ""}
            </p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>AI fixes weak verbs, adds quantification where implied, surfaces relevant keywords from your existing stack.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>You see the before/after score + every change that was made.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <span>Choose &quot;Keep as my resume&quot; to use it for matches, or download to apply manually.</span>
          </li>
        </ul>

        <div className="mt-4 flex items-start gap-2 rounded-md border border-success/20 bg-success/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
          <p>
            <strong className="text-foreground">Authenticity guard:</strong> no fact is added that isn&apos;t already in your resume. Any inferred number / tech / scope is flagged in the result so you can verify.
          </p>
        </div>

        {/* Processing state — animated stage indicator */}
        <AnimatePresence mode="wait">
          {autoPending ? (
            <motion.div
              key="processing"
              initial={reduce ? {} : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-4 overflow-hidden"
            >
              <div className="space-y-2 rounded-lg border border-primary/20 bg-background/60 p-3">
                {STAGES.map((s, i) => {
                  const Icon = s.icon;
                  const isDone = i < stage;
                  const isActive = i === stage;
                  return (
                    <motion.div
                      key={s.label}
                      className="flex items-center gap-2.5"
                      initial={reduce ? {} : { opacity: 0, x: -8 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all ${
                        isDone   ? "bg-success/15 text-success" :
                        isActive ? "bg-primary/15 text-primary" :
                        "bg-secondary text-muted-foreground/40"
                      }`}>
                        {isDone ? (
                          <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2 7 6 11 12 3"/></svg>
                        ) : (
                          <Icon className={`h-3.5 w-3.5 ${isActive && !reduce ? "animate-pulse" : ""}`} />
                        )}
                      </div>
                      <span className={`text-xs ${isDone ? "line-through text-muted-foreground" : isActive ? "font-medium text-foreground" : "text-muted-foreground/50"}`}>
                        {s.label}
                      </span>
                      {isActive && !reduce && (
                        <motion.span
                          className="ml-auto text-[10px] text-primary"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.4, repeat: Infinity }}
                        >
                          running…
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
                {/* Progress bar */}
                <div className="mt-2 overflow-hidden rounded-full bg-secondary/60">
                  <motion.div
                    className="h-1 rounded-full bg-primary"
                    initial={{ width: "5%" }}
                    animate={{ width: `${Math.min(((stage + 1) / STAGES.length) * 100, 92)}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cta"
              className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              initial={reduce ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-[11px] text-muted-foreground">
                {quotaUsed} / {quotaLimit} runs used this 30-day window.
              </p>
              <button
                type="button"
                onClick={runAuto}
                disabled={pending || quotaExhausted}
                className="press tap-target inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50 focus-ring"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Auto-enhance my resume
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {quotaExhausted && (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            <p>You&apos;ve used your monthly enhancements. The window resets a few weeks from your first run.</p>
          </div>
        )}

        <AnimatePresence>
          {error && (
            <motion.div
              initial={reduce ? {} : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <p>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Secondary: per-bullet review for power users */}
      <button
        type="button"
        onClick={runReview}
        disabled={pending || quotaExhausted}
        className="press tap-target group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/30 hover:bg-secondary/40 disabled:opacity-60 focus-ring"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold sm:text-sm">Or: review each change one by one</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
            Slower. AI proposes alternatives per weak bullet; you accept / edit / skip each.
          </p>
        </div>
        {reviewPending && <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />}
      </button>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Auto-enhance typically takes 25–45 seconds. We extract real bullet content from your PDF, run a diagnosis prompt, generate alternatives, and pick the safest improvement for each.
      </p>
    </motion.div>
  );
}
