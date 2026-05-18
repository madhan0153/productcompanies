"use client";

// On a fresh navigation to a job that has a Fit Card, scroll the viewport
// so the Fit Card section is at the top. The hero card stays accessible
// (user can scroll back up) but the user lands on the high-value content.
//
// Skipped on back/forward navigations — those should restore the previous
// scroll position via useScrollRestore on the matches page. Skipped when
// the user has a URL hash (they navigated to a specific anchor).
//
// Honors prefers-reduced-motion: instant scroll instead of smooth.

import { useEffect } from "react";

export function ScrollToFitCard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;

    // performance.navigation.type is deprecated; use the modern API.
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav?.type === "back_forward") return;
    } catch { /* old browser — fall through */ }

    // If user has already scrolled past the top (e.g. anchor restore from
    // browser cache), don't yank them. Auto-scroll only on a clean entry.
    if (window.scrollY > 4) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let attempts = 0;
    const tryScroll = () => {
      if (cancelled) return;
      attempts++;
      const el = document.getElementById("fit-card");
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 12;
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
        return;
      }
      // Fit card not in DOM yet (SSR streaming). Retry up to ~1s.
      if (attempts < 20) setTimeout(tryScroll, 50);
    };
    // Brief delay so the hero finishes paint before we scroll past it.
    const start = setTimeout(tryScroll, 120);
    return () => {
      cancelled = true;
      clearTimeout(start);
    };
  }, []);

  return null;
}
