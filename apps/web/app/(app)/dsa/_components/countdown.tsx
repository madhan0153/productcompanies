"use client";

import { useEffect, useState } from "react";
import { msUntilNextIstMidnight } from "@/lib/dsa/today";

// Next-question countdown to the next IST midnight (India-first per
// CLAUDE.md rule 7). Text-only, polite live region — no motion.
// Renders nothing until mounted to avoid hydration drift.

function format(ms: number): string {
  if (ms <= 0) return "now";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = total % 60;
  return `${m}m ${s}s`;
}

export function NextRefreshCountdown({ className = "" }: { className?: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setLabel(format(msUntilNextIstMidnight()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (label === null) return null;
  return (
    <p className={`text-xs text-muted-foreground tabular-nums ${className}`} aria-live="polite">
      Next question in <span className="font-medium text-foreground">{label}</span>
    </p>
  );
}
