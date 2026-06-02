"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brain, CheckCircle2, Clock3, Sparkles } from "lucide-react";

const MESSAGES = [
  "Your AI match engine is scanning thousands of product roles",
  "Weighing your experience against every job in our database",
  "Crunching skill overlaps, seniority bands, and tech fit",
];

const STEPS = [
  "Reading your saved resume signals",
  "Scoring live product-company roles",
  "Preparing strengths, gaps, and next actions",
];

// Presentation-only banner shown while a match-compute job is running for this
// user. The page-level <ComputeAutoRefresh /> poller drives router.refresh()
// in both first-compute and replace flows.
export function ComputingBanner({ hasExisting = false }: { hasExisting?: boolean }) {
  const reduce = useReducedMotion();
  const title = hasExisting ? "Updating your matches..." : "Analysing your profile...";
  const subtitle = hasExisting
    ? "Re-ranking every role against your latest resume. Your current matches stay visible until the new ones are ready."
    : `${MESSAGES[0]}.`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-card/70 px-4 py-4 shadow-sm"
      >
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent"
            animate={{ translateX: ["-100%", "200%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
          />
        )}

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            {!reduce && (
              <>
                <motion.span
                  className="absolute inset-0 rounded-full bg-primary/20"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.span
                  className="absolute inset-[3px] rounded-full bg-primary/25"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                />
              </>
            )}
            <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-primary/15">
              <Brain className="h-4 w-4 text-primary" />
            </span>
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{title}</p>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  <Clock3 className="h-3 w-3" />
                  30-60s
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {subtitle}{" "}
                <span className="text-foreground/70">This page refreshes automatically when results land.</span>
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {STEPS.map((step, index) => {
                const Icon = index === 0 ? CheckCircle2 : index === 1 ? Brain : Sparkles;
                return (
                  <div key={step} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                    <Icon className={`h-3.5 w-3.5 shrink-0 ${index === 1 ? "text-primary" : "text-success"}`} />
                    <span className="min-w-0 text-[11px] leading-snug text-muted-foreground">{step}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="hidden shrink-0 pt-3 sm:block">
            {!reduce ? (
              <div className="flex items-center gap-1">
                {[0, 0.15, 0.3].map((delay, i) => (
                  <motion.span
                    key={i}
                    className="block h-1.5 w-1.5 rounded-full bg-primary"
                    animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay, ease: "easeInOut" }}
                  />
                ))}
              </div>
            ) : (
              <span className="text-xs text-primary">computing</span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
