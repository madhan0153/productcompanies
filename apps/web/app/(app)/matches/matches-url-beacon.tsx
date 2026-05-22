"use client";

// Session history — Matches URL beacon.
//
// Writes the current /matches URL (with all params: ?tab, ?c, ?h,
// ?min_score) to sessionStorage on every render. The job detail page's
// SmartMatchesBackLink reads this key so the breadcrumb "← Matches" lands
// the user exactly where they came from — same tab, same filters.
//
// SessionStorage (not localStorage) is intentional: we want this to clear
// on browser close, and stay scoped to a single tab/window.

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const MATCHES_REFERRER_KEY = "prodmatch:matches-url";

export function MatchesURLBeacon() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const refreshedRef = useRef(false);

  useEffect(() => {
    if (pathname !== "/matches" || refreshedRef.current) return;
    refreshedRef.current = true;
    router.refresh();
  }, [pathname, router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only fire on the matches list itself, not on /matches/[anything].
    if (pathname !== "/matches") return;
    const qs = params.toString();
    const full = qs ? `${pathname}?${qs}` : pathname;
    try {
      window.sessionStorage.setItem(MATCHES_REFERRER_KEY, full);
    } catch { /* silent */ }
  }, [pathname, params]);

  return null;
}
