"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brain, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { COMPUTE_STATUS_EVENT } from "./compute-auto-refresh";

const MESSAGES = [
  "Your AI match engine is scanning thousands of product roles",
  "Weighing your experience against every job in our database",
  "Crunching skill overlaps, seniority bands, and tech fit",
];

type ComputeJobStatus = "queued" | "running";

const STEP_LABELS = {
  queued: [
    "Resume saved",
    "Starting match worker",
    "Results appear automatically",
  ],
  running: [
    "Resume signals ready",
    "Scoring live roles",
    "Preparing match cards",
  ],
} satisfies Record<ComputeJobStatus, string[]>;

type ComputeStatusEventDetail = {
  status?: "no_resume" | "computing" | "ready" | "needs_compute" | "failed";
  jobStatus?: ComputeJobStatus;
  queuedAt?: string | null;
  startedAt?: string | null;
};

// Presentation-only banner shown while a match-compute job is running for this
// user. The page-level <ComputeAutoRefresh /> poller drives router.refresh()
// in both first-compute and replace flows.
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
  const statusLabel = visibleJobStatus === "running" ? "Running now" : "Starting";
  const subtitle = hasExisting
    ? "Re-ranking every role against your latest resume. Your current matches stay visible until the new ones are ready."
    : `${MESSAGES[0]}.`;
  const referenceTime = liveJob.startedAt ?? liveJob.queuedAt;
  const elapsed = referenceTime ? humanElapsed(referenceTime) : null;
  const steps = STEP_LABELS[visibleJobStatus];
  const progressWidth = visibleJobStatus === "running" ? "72%" : "34%";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        aria-live="polite"
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-card/75 px-4 py-4 shadow-sm"
      >
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"
            animate={{ translateX: ["-100%", "200%"] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
          />
        )}

        <div className="relative flex gap-3">
          <div className="relative mt-0.5 shrink-0">
            {!reduce && (
              <motion.span
                className="absolute inset-0 rounded-full bg-primary/20"
                animate={{ scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Clock3 className="h-3 w-3" />
                  {statusLabel}
                </span>
                {elapsed && (
                  <span className="text-[10px] text-muted-foreground">{elapsed}</span>
                )}
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {subtitle}{" "}
                <span className="text-foreground/70">You can stay here; results appear when compute finishes.</span>
              </p>
            </div>

            <div className="overflow-hidden rounded-full bg-secondary/70">
              <motion.div
                className="h-1.5 rounded-full bg-primary"
                initial={{ width: "18%" }}
                animate={{ width: progressWidth }}
                transition={{ duration: reduce ? 0 : 0.6, ease: "easeOut" }}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {steps.map((step, index) => {
                const Icon = index === 0 ? CheckCircle2 : index === 1 ? Brain : Sparkles;
                const active = visibleJobStatus === "running" && index === 1;
                const done = index === 0 || (visibleJobStatus === "running" && index < 2);
                return (
                  <div key={step} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/45 px-3 py-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${active ? "text-primary" : done ? "text-success" : "text-muted-foreground"}`} />
                    <span className={`min-w-0 text-[11px] leading-snug ${active ? "text-foreground" : "text-muted-foreground"}`}>{step}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function humanElapsed(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "just started";
  const seconds = Math.max(0, Math.round(diff / 1000));
  if (seconds < 60) return `${seconds}s elapsed`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`;
}
