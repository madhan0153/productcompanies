// Matches — compact band segmented control.
//
// Replaces the 3-tile grid with a single-row pill segmented control:
// Shortlist · Maybe · Filtered (+ New/Dismissed only when populated).
// Each pill is a Link to ?tab=...; active pill gets a filled bg + colored
// border so the user always knows which slice they're viewing.
//
// On mobile this saves ~100px vs the previous tile grid — keeps the matches
// list above the fold instead of pushing it 70% down the viewport.

import Link from "next/link";

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

const TILE_META: Record<MatchTab, { label: string; activeBg: string; activeTone: string; activeBorder: string }> = {
  shortlist:    { label: "Shortlist", activeTone: "text-success",     activeBg: "bg-success/10",    activeBorder: "border-success" },
  worth_a_look: { label: "Maybe",     activeTone: "text-warning",     activeBg: "bg-warning/10",    activeBorder: "border-warning" },
  filtered:     { label: "Filtered",  activeTone: "text-foreground",  activeBg: "bg-secondary",     activeBorder: "border-foreground/40" },
  new:          { label: "New",       activeTone: "text-primary",     activeBg: "bg-primary-soft",  activeBorder: "border-primary" },
  dismissed:    { label: "Dismissed", activeTone: "text-foreground",  activeBg: "bg-secondary",     activeBorder: "border-foreground/40" },
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
        role="tablist"
        className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible"
      >
        {[...order, ...tail].map((tab) => {
          const meta = TILE_META[tab];
          const isActive = tab === active;
          return (
            <li key={tab} className="shrink-0">
              <Link
                href={buildHref(tab)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${meta.label} (${countFor[tab]})`}
                className={`tap-target-sm inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-ring ${
                  isActive
                    ? `${meta.activeBorder} ${meta.activeBg} ${meta.activeTone}`
                    : "border-border bg-card/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                <span>{meta.label}</span>
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  isActive ? "bg-background/70 text-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                  {countFor[tab].toLocaleString("en-IN")}
                </span>
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
