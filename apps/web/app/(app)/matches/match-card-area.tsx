"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useMatchNav } from "./match-transition-context";

const QUOTES = [
  "Scanning live JDs from 18 product companies...",
  "Ranking by tech stack overlap and seniority fit...",
  "India's top product roles — finding your best fits...",
  "Checking experience bands and compensation signals...",
  "Almost ready — matching your career trajectory...",
];

export function MatchCardArea({ children }: { children: React.ReactNode }) {
  const { navPending } = useMatchNav();
  const [qi, setQi] = useState(0);

  useEffect(() => {
    if (!navPending) return;
    setQi(0);
    const t = setInterval(() => setQi((i) => (i + 1) % QUOTES.length), 1800);
    return () => clearInterval(t);
  }, [navPending]);

  return (
    <div className="space-y-3">
      {navPending && (
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary-soft px-4 py-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
          <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {QUOTES[qi]}
          </p>
        </div>
      )}
      <div className={navPending ? "pointer-events-none opacity-40 transition-opacity duration-150" : "transition-opacity duration-150"}>
        {children}
      </div>
    </div>
  );
}
