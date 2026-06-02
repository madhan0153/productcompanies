"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Brain } from "lucide-react";

const MESSAGES = [
  "Your AI match engine is scanning thousands of product roles",
  "Weighing your experience against every job in our database",
  "Crunching skill overlaps, seniority bands, and tech fit",
];

// Presentation-only banner shown while a match-compute job is running for this
// user. The page-level <ComputeAutoRefresh /> poller drives router.refresh()
// (in both the first-compute and replace flows), so this component no longer
// owns a timer — it just renders the animated "analysing…" state.
export function ComputingBanner() {
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative overflow-hidden rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 via-primary/8 to-transparent px-4 py-4"
      >
        {/* Subtle shimmer sweep */}
        {!reduce && (
          <motion.div
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent"
            animate={{ translateX: ["-100%", "200%"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
          />
        )}

        <div className="relative flex items-center gap-3">
          {/* Pulsing icon */}
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

          {/* Text */}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Analysing your profile&hellip;
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {MESSAGES[0]}.{" "}
              <span className="text-foreground/70">Usually ready in 30–60 seconds.</span>
            </p>
          </div>

          {/* Bouncing dots */}
          <div className="shrink-0">
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
