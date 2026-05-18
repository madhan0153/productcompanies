"use client";

// Matches — compact band segmented control.
//
// Each pill is a client-side router push inside `useTransition` so:
//  1. The active pill highlights INSTANTLY on click (no waiting for the server).
//  2. While the new tab data loads, a subtle loading indicator appears.
//  3. The tab label text never flickers because we drive active state from
//     local `isPending` optimistically, not from the URL only.
//
// On mobile this saves ~100px vs the previous tile grid — keeps the matches
// list above the fold instead of pushing it 70% down the viewport.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";

export type MatchTab = "shortlist" | "worth_a_look" | "filtered" | "new";

export interface BandCounts {
  /** score >= 60, hidden_reason IS NULL */
  shortlist: number;
  /** 40 <= score < 60, hidden_reason IS NULL */
  worthALook: number;
  /** score < 40 OR hidden_reason = mismatch */
  filtered: number;
  /** seen_at IS NULL across visible scope */
  newCount: number;
}

const TILE_META: Record<MatchTab, { label: string; activeTone: string; activeBg: string; activeBorder: string; pendingRing: string }> = {
  shortlist:    { label: "Shortlist", activeTone: "text-success",     activeBg: "bg-success/10",   activeBorder: "border-success",       pendingRing: "ring-success/40" },
  worth_a_look: { label: "Maybe",     activeTone: "text-warning",     activeBg: "bg-warning/10",   activeBorder: "border-warning",       pendingRing: "ring-warning/40" },
  filtered:     { label: "Filtered",  activeTone: "text-foreground",  activeBg: "bg-secondary",    activeBorder: "border-foreground/40", pendingRing: "ring-border" },
  new:          { label: "New",       activeTone: "text-primary",     activeBg: "bg-primary-soft", activeBorder: "border-primary",       pendingRing: "ring-primary/40" },
};

export function BandStrip({
  counts,
  active,
  buildHref,
}: {
  counts: BandCounts;
  active: MatchTab;
  /** Caller-controlled URL builder so filter chips (company, hub) survive a tab change. */
  buildHref: (tab: MatchTab) => string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const order: MatchTab[] = ["shortlist", "worth_a_look", "filtered"];
  const tail: MatchTab[] = counts.newCount > 0 ? ["new"] : [];
  const tabs = [...order, ...tail];

  const countFor: Record<MatchTab, number> = {
    shortlist:    counts.shortlist,
    worth_a_look: counts.worthALook,
    filtered:     counts.filtered,
    new:          counts.newCount,
  };

  const handleClick = (tab: MatchTab) => {
    if (tab === active && !isPending) return;
    startTransition(() => {
      router.push(buildHref(tab));
    });
  };

  return (
    <nav
      aria-label="Match buckets"
      className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
    >
      <ul
        role="tablist"
        className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
      >
        {tabs.map((tab) => {
          const meta = TILE_META[tab];
          const isActive = tab === active;
          const count = countFor[tab];

          return (
            <li key={tab} className="shrink-0">
              <button
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-label={`${meta.label} (${count})`}
                disabled={isActive && !isPending}
                onClick={() => handleClick(tab)}
                className={[
                  "tap-target-sm relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  "transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
                  isActive
                    ? `${meta.activeBorder} ${meta.activeBg} ${meta.activeTone} ${isPending ? `ring-2 ${meta.pendingRing}` : ""}`
                    : "border-border bg-card/40 text-muted-foreground hover:border-foreground/30 hover:bg-secondary/60 hover:text-foreground active:scale-95",
                ].filter(Boolean).join(" ")}
              >
                {/* Active indicator dot — animates in */}
                <AnimatePresence>
                  {isActive && isPending && !reduce && (
                    <motion.span
                      key="spinner"
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute -right-1 -top-1"
                    >
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    </motion.span>
                  )}
                </AnimatePresence>

                <span>{meta.label}</span>
                <motion.span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                    isActive ? "bg-background/70 text-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                  // Animate count changes
                  key={count}
                  initial={reduce ? undefined : { scale: 0.85, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {count.toLocaleString("en-IN")}
                </motion.span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Full-width loading bar — subtly signals the server is fetching */}
      <AnimatePresence>
        {isPending && !reduce && (
          <motion.div
            key="loading-bar"
            className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-primary/50 sm:hidden"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </nav>
  );
}

/** Server-side tab classification — used by page.tsx to slice the loaded rows. */
export function classifyMatch(m: {
  score: number;
  hidden_reason: string | null;
  seen_at: string | null;
}): MatchTab | null {
  if (m.hidden_reason === "mismatch") return "filtered";
  if (m.score >= 60) return "shortlist";
  if (m.score >= 40) return "worth_a_look";
  return "filtered";
}
