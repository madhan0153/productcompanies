"use client";

import { useEffect, useState } from "react";

// Next-question countdown to the next UTC midnight. Text-only, polite live
// region — no motion. Renders nothing until mounted to avoid hydration drift.

function nextMidnightMs(): number {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next.getTime();
}

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
    const tick = () => setLabel(format(nextMidnightMs() - Date.now()));
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
