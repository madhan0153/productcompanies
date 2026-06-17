"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { COMPUTE_STATUS_EVENT } from "./compute-auto-refresh";

type ComputeJobStatus = "queued" | "running";

const STEP_LABELS = {
  queued: ["Resume signals saved", "Starting the match engine", "Scoring roles against your profile"],
  running: ["Resume signals ready", "Scoring live roles", "Preparing your match cards"],
} satisfies Record<ComputeJobStatus, string[]>;

type ComputeStatusEventDetail = {
  status?: "no_resume" | "computing" | "ready" | "needs_compute" | "failed";
  jobStatus?: ComputeJobStatus;
  queuedAt?: string | null;
  startedAt?: string | null;
};

type StepState = "done" | "active" | "pending";

function stepState(index: number, jobStatus: ComputeJobStatus): StepState {
  if (jobStatus === "queued") return index === 0 ? "done" : index === 1 ? "active" : "pending";
  // running — the engine is live, so the first two stages are behind us.
  return index < 2 ? "done" : "active";
}

// Presentation-only banner shown while a match-compute job is running for this
// user. The page-level <ComputeAutoRefresh /> poller drives router.refresh()
// once the backend reports a terminal state — this component never fakes a
// percentage; the progress is intentionally indeterminate (an honest "working"
// sweep) so we never imply a precision we don't have.
export function ComputingBanner({
  hasExisting = false,
  jobStatus = "queued",
  queuedAt,
  startedAt,
}: {
  hasExisting?: boolean;
  jobStatus?: ComputeJobStatus;
  queuedAt?: string | null;
  startedAt?: string | null;
}) {
  const reduce = useReducedMotion();
  const [liveJob, setLiveJob] = useState({ jobStatus, queuedAt, startedAt });

  useEffect(() => {
    setLiveJob({ jobStatus, queuedAt, startedAt });
  }, [jobStatus, queuedAt, startedAt]);

  useEffect(() => {
    function onStatus(event: Event) {
      const detail = (event as CustomEvent<ComputeStatusEventDetail>).detail;
      if (detail.status !== "computing") return;
      const nextJobStatus = detail.jobStatus;
      if (nextJobStatus !== "queued" && nextJobStatus !== "running") return;
      setLiveJob((current) => ({
        jobStatus: nextJobStatus,
        queuedAt: detail.queuedAt ?? current.queuedAt,
        startedAt: detail.startedAt ?? current.startedAt,
      }));
    }
    window.addEventListener(COMPUTE_STATUS_EVENT, onStatus);
    return () => window.removeEventListener(COMPUTE_STATUS_EVENT, onStatus);
  }, []);

  const visibleJobStatus = liveJob.jobStatus;
  const title = hasExisting ? "Updating your matches" : "Computing your matches";
  const statusLabel = visibleJobStatus === "running" ? "Live" : "Starting";
  const subtitle = hasExisting
    ? "Re-ranking every role against your latest resume — your current matches stay visible until the new ones land."
    : "Our AI is weighing your experience against every live role at 51 product companies.";
  const referenceTime = liveJob.startedAt ?? liveJob.queuedAt;
  const elapsed = referenceTime ? humanElapsed(referenceTime) : null;
  const steps = STEP_LABELS[visibleJobStatus];

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      aria-live="polite"
      aria-busy="true"
      className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card/80 p-4 shadow-lg shadow-primary/5 backdrop-blur-xl sm:p-5"
    >
      {/* Ambient brand glow — purely decorative, sits behind content. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="relative flex items-start gap-3.5 sm:gap-4">
        {/* Radar scanner — a rotating conic sweep masked into a ring, with a
            pulsing core. GPU-friendly (transform/opacity only). */}
        <div className="relative h-12 w-12 shrink-0 sm:h-14 sm:w-14">
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, transparent 210deg, hsl(var(--primary) / 0.5) 320deg, hsl(var(--primary) / 0.9) 358deg, transparent 360deg)",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.9, repeat: Infinity, ease: "linear" }}
            />
          )}
          {/* Inner disc carves the sweep into a thin ring. */}
          <div className="absolute inset-[2.5px] rounded-full bg-card" />
          {/* Static guide ring (also the full ring under reduced motion). */}
          <div className="absolute inset-0 rounded-full border border-primary/15" />
          {/* Pulsing core. */}
          {!reduce && (
            <motion.div
              aria-hidden
              className="absolute inset-[7px] rounded-full bg-primary/10"
              animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0.25, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-semibold text-foreground sm:text-[15px]">{title}</p>
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              {!reduce && (
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
              {statusLabel}
            </span>
            {elapsed && <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">{elapsed}</span>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Indeterminate progress sweep — honest "working" motion, no fake %. */}
      <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-secondary/70">
        {reduce ? (
          <div className="h-full w-2/5 rounded-full bg-primary/70" />
        ) : (
          <motion.div
            className="absolute inset-y-0 w-2/5 rounded-full bg-gradient-to-r from-primary/20 via-primary to-primary/20"
            animate={{ x: ["-110%", "320%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
      </div>

      {/* Stage checklist — vertical & finger-friendly on mobile, inline on sm+. */}
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {steps.map((step, index) => {
          const state = stepState(index, visibleJobStatus);
          return (
            <motion.li
              key={step}
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : index * 0.08, duration: 0.3 }}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-colors ${
                state === "active"
                  ? "border-primary/30 bg-primary/[0.06]"
                  : "border-border/60 bg-background/40"
              }`}
            >
              <StepDot state={state} reduce={reduce} />
              <span
                className={`min-w-0 truncate text-[11px] leading-snug ${
                  state === "pending" ? "text-muted-foreground" : "text-foreground/90"
                }`}
              >
                {step}
              </span>
            </motion.li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/80">
        Stay on this page — your matches appear automatically the moment scoring finishes.
      </p>
    </motion.div>
  );
}

function StepDot({ state, reduce }: { state: StepState; reduce: boolean | null }) {
  if (state === "done") {
    return (
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
        {!reduce && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <span className="relative h-2 w-2 rounded-full bg-primary" />
      </span>
    );
  }
  return <span className="h-4 w-4 shrink-0 rounded-full border border-border" />;
}

function humanElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just started";
  const seconds = Math.max(0, Math.round(diff / 1000));
  if (seconds < 60) return `${seconds}s elapsed`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`;
}
