"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  ScoreBreakdownPanel,
  type RulesScoreBreakdown,
} from "@/components/score-breakdown";

// Sprint 1 Item 3 — interactive disclosure for the match card.
// Lives inside a parent <Link>, so click events must stop propagation +
// preventDefault to avoid navigating away from the matches list.

export function WhyScoreToggle({
  breakdown,
  total,
  confidence,
  hardCapReason,
  feedbackAdjustment,
}: {
  breakdown: RulesScoreBreakdown;
  total: number;
  /** Sprint 6 — surfaced inside the expanded panel. */
  confidence?: number | null;
  hardCapReason?: string | null;
  feedbackAdjustment?: number | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2.5">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-card/50 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        Why this score?
      </button>
      {open && (
        <div className="mt-2" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
          <ScoreBreakdownPanel
            breakdown={breakdown}
            total={total}
            confidence={confidence}
            hardCapReason={hardCapReason}
            feedbackAdjustment={feedbackAdjustment}
          />
        </div>
      )}
    </div>
  );
}
