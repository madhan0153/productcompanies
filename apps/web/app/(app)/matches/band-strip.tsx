"use client";

// Matches — compact band segmented control.
//
// Client Component: uses useTransition + router.push for instant visual
// feedback when switching tabs. Accepts plain serializable props only —
// no function props, no useSearchParams.
//
// Types and classifyMatch live in ./match-types.ts (no "use client") so
// the server page.tsx can import them without crossing the boundary.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import type { MatchTab, BandCounts } from "./match-types";

export type { MatchTab, BandCounts };

const TILE_META: Record<
  MatchTab,
  { label: string; activeTone: string; activeBg: string; activeBorder: string }
> = {
  shortlist:    { label: "Shortlist", activeTone: "text-success",    activeBg: "bg-success/10",   activeBorder: "border-success" },
  worth_a_look: { label: "Maybe",     activeTone: "text-warning",    activeBg: "bg-warning/10",   activeBorder: "border-warning" },
  filtered:     { label: "Filtered",  activeTone: "text-foreground", activeBg: "bg-secondary",    activeBorder: "border-foreground/40" },
  new:          { label: "New",       activeTone: "text-primary",    activeBg: "bg-primary-soft", activeBorder: "border-primary" },
};

interface BandStripProps {
  counts: BandCounts;
  active: MatchTab;
  /** Plain serializable filter values — NOT functions. */
  selectedCompanies: string[];
  selectedHubs: string[];
  minScore: number | null;
}

export function BandStrip({
  counts,
  active,
  selectedCompanies,
  selectedHubs,
  minScore,
}: BandStripProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reduce = useReducedMotion();

  const buildHref = (nextTab: MatchTab): string => {
    const sp = new URLSearchParams();
    if (selectedCompanies.length > 0) sp.set("c", selectedCompanies.join(","));
    if (selectedHubs.length > 0)      sp.set("h", selectedHubs.join(","));
    if (minScore !== null)            sp.set("min_score", String(minScore));
    if (nextTab !== "shortlist")      sp.set("tab", nextTab);
    const qs = sp.toString();
    return qs ? `/matches?${qs}` : "/matches";
  };

  const order: MatchTab[] = ["shortlist", "worth_a_look", "filtered"];
  const tail: MatchTab[]  = counts.newCount > 0 ? ["new"] : [];

  const countFor: Record<MatchTab, number> = {
    shortlist:    counts.shortlist,
    worth_a_look: counts.worthALook,
    filtered:     counts.filtered,
    new:          counts.newCount,
  };

  const handleClick = (tab: MatchTab) => {
    if (tab === active && !isPending) return;
    startTransition(() => { router.push(buildHref(tab)); });
  };

  return (
    <nav
      aria-label="Match buckets"
      className="relative sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
    >
      <ul
        role="tablist"
        className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
      >
        {[...order, ...tail].map((tab) => {
          const meta    = TILE_META[tab];
          const isActive = tab === active;
          const count   = countFor[tab];

          return (
            <li key={tab} className="shrink-0 relative">
              <button
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-label={`${meta.label} (${count})`}
                onClick={() => handleClick(tab)}
                className={[
                  "tap-target-sm relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                  "transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  isActive
                    ? meta.activeTone
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <span className="relative z-10">{meta.label}</span>
                <span className={`relative z-10 rounded-full px-1.5 py-0.5 text-[10px] tabular-nums transition-colors duration-200 ${
                  isActive ? "bg-background/80 text-foreground shadow-sm" : "bg-secondary text-muted-foreground group-hover:bg-secondary/80"
                }`}>
                  {count.toLocaleString("en-IN")}
                </span>
              </button>

              {/* The buttery smooth active pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className={`absolute inset-0 z-0 rounded-full border ${meta.activeBorder} ${meta.activeBg}`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {isPending && !reduce && (
          <motion.div
            key="loading-bar"
            className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-primary/50"
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
    </nav>
  );
}
