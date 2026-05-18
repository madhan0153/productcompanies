// Sprint 6 matches redesign — interactive band strip.
//
// Replaces the old 5-cell verdict summary with a 3-cell intent strip:
// Shortlist (≥60) / Worth a look (40-59) / Filtered (<40 OR hard-mismatched).
// Each tile is a link to the corresponding ?tab=... view; the active tile
// has a primary border.
//
// On mobile: 3-up grid. On sm+: horizontal strip. Sticky on scroll so the
// user always knows which slice they're in.

import Link from "next/link";
import { ListChecks, Eye, EyeOff, Zap, Inbox } from "lucide-react";

export type MatchTab = "shortlist" | "worth_a_look" | "filtered" | "new" | "dismissed";

export interface BandCounts {
  /** score >= 60, not user_hidden, hidden_reason != mismatch */
  shortlist: number;
  /** 40 <= score < 60, not user_hidden, hidden_reason != mismatch */
  worthALook: number;
  /** score < 40 OR hidden_reason = mismatch, not user_hidden */
  filtered: number;
  /** seen_at IS NULL across visible scope */
  newCount: number;
  /** user_hidden = true */
  dismissed: number;
}

const TILE_META: Record<MatchTab, { label: string; sub: string; icon: React.ReactNode; tone: string; border: string; bg: string; activeBorder: string; activeBg: string }> = {
  shortlist: {
    label: "Shortlist",
    sub: "Worth applying",
    icon: <ListChecks className="h-4 w-4" />,
    tone: "text-success",
    border: "border-success/25",
    bg: "bg-success/5",
    activeBorder: "border-success",
    activeBg: "bg-success/10",
  },
  worth_a_look: {
    label: "Worth a look",
    sub: "Read before deciding",
    icon: <Eye className="h-4 w-4" />,
    tone: "text-warning",
    border: "border-warning/25",
    bg: "bg-warning/5",
    activeBorder: "border-warning",
    activeBg: "bg-warning/10",
  },
  filtered: {
    label: "Filtered",
    sub: "Score capped or wrong field",
    icon: <Inbox className="h-4 w-4" />,
    tone: "text-muted-foreground",
    border: "border-border",
    bg: "bg-secondary/40",
    activeBorder: "border-foreground/40",
    activeBg: "bg-secondary",
  },
  new: {
    label: "New",
    sub: "Since your last visit",
    icon: <Zap className="h-4 w-4" />,
    tone: "text-primary",
    border: "border-primary/25",
    bg: "bg-primary-soft",
    activeBorder: "border-primary",
    activeBg: "bg-primary-soft",
  },
  dismissed: {
    label: "Dismissed",
    sub: "You hid these",
    icon: <EyeOff className="h-4 w-4" />,
    tone: "text-muted-foreground",
    border: "border-border",
    bg: "bg-secondary/40",
    activeBorder: "border-foreground/40",
    activeBg: "bg-secondary",
  },
};

export function BandStrip({
  counts,
  active,
  buildHref,
}: {
  counts: BandCounts;
  active: MatchTab;
  /** Caller-controlled URL builder so filter chips (company, hub, skill) survive a tab change. */
  buildHref: (tab: MatchTab) => string;
}) {
  const order: MatchTab[] = ["shortlist", "worth_a_look", "filtered"];
  // New and Dismissed only render when they have content — kept compact.
  const tail: MatchTab[] = [
    ...(counts.newCount > 0 ? ["new" as const] : []),
    ...(counts.dismissed > 0 ? ["dismissed" as const] : []),
  ];

  const countFor: Record<MatchTab, number> = {
    shortlist:    counts.shortlist,
    worth_a_look: counts.worthALook,
    filtered:     counts.filtered,
    new:          counts.newCount,
    dismissed:    counts.dismissed,
  };

  return (
    <nav
      aria-label="Match buckets"
      className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur-md sm:static sm:mx-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none"
    >
      <ul
        className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-stretch sm:gap-3"
        role="tablist"
      >
        {[...order, ...tail].map((tab) => {
          const meta = TILE_META[tab];
          const isActive = tab === active;
          return (
            <li key={tab} className="min-w-0">
              <Link
                href={buildHref(tab)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${meta.label} (${countFor[tab]})`}
                className={`flex h-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 transition focus-ring sm:min-w-[10rem] ${
                  isActive
                    ? `${meta.activeBorder} ${meta.activeBg}`
                    : `${meta.border} ${meta.bg} hover:border-foreground/30`
                }`}
              >
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider ${meta.tone}`}>
                  {meta.icon}
                  <span className="truncate">{meta.label}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className={`text-lg font-bold tabular-nums sm:text-xl ${meta.tone}`}>{countFor[tab]}</span>
                </div>
                <p className="hidden text-[10px] text-muted-foreground sm:block">{meta.sub}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Server-side tab classification — used by page.tsx to slice the loaded rows. */
export function classifyMatch(m: {
  score: number;
  user_hidden: boolean;
  hidden_reason: string | null;
  seen_at: string | null;
}): MatchTab | null {
  if (m.user_hidden) return "dismissed";
  if (m.hidden_reason === "mismatch") return "filtered";
  if (m.score >= 60) return "shortlist";
  if (m.score >= 40) return "worth_a_look";
  return "filtered";
}
