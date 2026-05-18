"use client";

// Session history — pathname-scoped scroll restoration.
//
// Next.js App Router already restores scroll on browser back/forward, but
// it fires BEFORE server-component rehydration completes — so on a long
// list page (matches), the browser scrolls to top before the cards mount.
//
// This hook stashes scrollY on `beforeunload` / route-change-out, then
// restores it on mount of the same pathname (server components have
// already painted by then). Keyed by pathname + search so a filter change
// doesn't restore the wrong position.

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY_PREFIX = "scroll:";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes

interface Stored { y: number; ts: number }

export function useScrollRestore(): void {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = `${KEY_PREFIX}${pathname}?${params.toString()}`;

  // Restore on mount (or when params change → new key).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Stored;
      if (!parsed || typeof parsed.y !== "number") return;
      if (Date.now() - (parsed.ts ?? 0) > MAX_AGE_MS) {
        window.sessionStorage.removeItem(key);
        return;
      }
      // Wait one frame so server-streamed content is painted.
      requestAnimationFrame(() => {
        window.scrollTo({ top: parsed.y, behavior: "instant" as ScrollBehavior });
      });
    } catch { /* sessionStorage unavailable — silent */ }
  }, [key]);

  // Persist on unload and on visibility hidden (mobile Safari pre-unload).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const save = () => {
      try {
        const stored: Stored = { y: window.scrollY, ts: Date.now() };
        window.sessionStorage.setItem(key, JSON.stringify(stored));
      } catch { /* silent */ }
    };
    window.addEventListener("beforeunload", save);
    document.addEventListener("visibilitychange", save);
    return () => {
      save();
      window.removeEventListener("beforeunload", save);
      document.removeEventListener("visibilitychange", save);
    };
  }, [key]);
}
