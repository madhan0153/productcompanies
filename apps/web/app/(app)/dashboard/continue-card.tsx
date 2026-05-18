"use client";

// Session history — "Continue where you left off" surface.
//
// Reads localStorage on mount. If the user has a recent visit (≤24h) to
// any non-dashboard page, surfaces a one-tap CTA to jump back. Renders
// nothing on first visit or when stale.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, ArrowUpRight } from "lucide-react";

const STORAGE_KEY = "prodmatch:last-visit";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

interface LastVisit {
  path: string;
  label: string;
  ts: number;
}

function humanAgo(ts: number): string {
  const diff = Date.now() - ts;
  const min = 60_000, hr = 3_600_000;
  if (diff < min)  return "just now";
  if (diff < hr)   return `${Math.round(diff / min)} min ago`;
  if (diff < 24 * hr) return `${Math.round(diff / hr)} hr ago`;
  return "yesterday";
}

export function ContinueCard() {
  const [entry, setEntry] = useState<LastVisit | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as LastVisit;
      if (!parsed?.path || !parsed?.ts) return;
      if (Date.now() - parsed.ts > MAX_AGE_MS) {
        window.localStorage.removeItem(STORAGE_KEY);
        return;
      }
      setEntry(parsed);
    } catch { /* silent */ }
  }, []);

  if (!entry) return null;

  return (
    <Link
      href={entry.path}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition hover:border-primary/30 hover:bg-secondary/40 focus-ring"
      aria-label={`Continue where you left off — ${entry.label}`}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground transition group-hover:bg-primary group-hover:text-primary-foreground">
        <Clock className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Continue where you left off</p>
        <p className="text-sm font-medium">{entry.label}</p>
        <p className="text-[11px] text-muted-foreground">{humanAgo(entry.ts)}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
