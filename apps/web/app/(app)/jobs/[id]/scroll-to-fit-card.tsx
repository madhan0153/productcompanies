"use client";

// Ensure the Job Detail page opens at the top.
//
// Previously this component auto-scrolled the page to the Fit Card section
// on first visit, which made the page appear to open in the middle and
// hurt orientation/trust. We now always start at the top for fresh
// navigations, and let the browser restore scroll position on back/forward.
//
// Behavior:
//   • Fresh navigation (push/reload) with no URL hash → scrollTo(0, 0).
//   • Back / forward → no-op (browser restores prior position).
//   • Anchor link with a hash → no-op (let the anchor handle it).

import { useEffect } from "react";

export function ScrollToFitCard() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash) return;

    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav?.type === "back_forward") return;
    } catch {
      /* old browser — fall through */
    }

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  return null;
}
