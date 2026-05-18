"use client";

// Reads sessionStorage["prodmatch:matches-url"] (set by MatchesURLBeacon
// on the matches list) and renders the breadcrumb "← Matches" link
// pointing back to that exact URL — preserving tab, company filter, hub
// filter, and min_score.
//
// Falls back to plain /matches when no beacon entry exists (e.g., user
// landed on a job URL directly via a shared link).

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const KEY = "prodmatch:matches-url";

export function SmartMatchesBackLink() {
  const [href, setHref] = useState<string>("/matches");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.sessionStorage.getItem(KEY);
      if (stored && stored.startsWith("/matches")) setHref(stored);
    } catch { /* silent */ }
  }, []);

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded transition hover:text-foreground focus-ring"
      aria-label="Back to matches"
    >
      <ArrowLeft className="h-3 w-3" /> Matches
    </Link>
  );
}
