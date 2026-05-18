"use client";

// Session history — pathname-scoped scroll restoration.
//
// The App Router's built-in scroll restoration fires before server-component
// rehydration, so the browser clamps to top on long list pages (matches).
//
// IMPORTANT: the scrollable element in AppShell is `motion.main#main-content`
// (overflow-y-auto), NOT window. All saves/restores must target that element.
// window.scrollY is always 0 in this app.
//
// Keyed by pathname + search so a filter/tab change doesn't restore the
// wrong position.

import { useEffect, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const KEY_PREFIX = "scroll:";
const MAX_AGE_MS = 30 * 60 * 1000; // 30 minutes
const SCROLL_EL_ID = "main-content";

interface Stored { y: number; ts: number }

/** Locate the app's primary scroll container. Returns null in SSR. */
function getScrollEl(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  return document.getElementById(SCROLL_EL_ID);
}

export function useScrollRestore(): void {
  const pathname = usePathname();
  const params = useSearchParams();
  const key = `${KEY_PREFIX}${pathname}?${params.toString()}`;

  // ── Save on route change-out ────────────────────────────────────────────
  // Called from the cleanup of the restore effect and on visibilitychange/
  // beforeunload to ensure we capture the position even on hard navigations.
  const save = useCallback(() => {
    try {
      const el = getScrollEl();
      const y = el ? el.scrollTop : window.scrollY;
      const stored: Stored = { y, ts: Date.now() };
      window.sessionStorage.setItem(key, JSON.stringify(stored));
    } catch { /* sessionStorage unavailable — silent */ }
  }, [key]);

  // ── Restore on mount ───────────────────────────────────────────────────
  // Retries up to ~1.5s while the page streams in content. Without retries,
  // the scroll restores before cards mount and clamps to a lower position.
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
      if (parsed.y < 10) return; // already at top, no need to restore

      const targetY = parsed.y;
      let cancelled = false;
      let attempts = 0;

      const tryRestore = () => {
        if (cancelled) return;
        attempts++;
        const el = getScrollEl();
        if (!el) {
          // Element not mounted yet — retry
          if (attempts < 30) setTimeout(tryRestore, 50);
          return;
        }
        const maxY = el.scrollHeight - el.clientHeight;
        if (maxY >= targetY - 20) {
          el.scrollTop = targetY;
          return;
        }
        // Page still streaming; retry. 30 × 50ms = 1.5s ceiling.
        if (attempts < 30) {
          setTimeout(tryRestore, 50);
        } else {
          el.scrollTop = Math.min(targetY, maxY);
        }
      };
      requestAnimationFrame(tryRestore);
      return () => { cancelled = true; };
    } catch { /* sessionStorage unavailable — silent */ }
  }, [key]);

  // ── Persist on every key change (new route) and browser close ──────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Save current position before key changes (navigating away).
    // The key at cleanup time is the previous route's key — correct.
    const el = getScrollEl();
    if (el) {
      // Scroll listener: save on scroll idle for tab-switch within same URL
      let rafId = 0;
      const onScroll = () => {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(save);
      };
      el.addEventListener("scroll", onScroll, { passive: true });

      window.addEventListener("beforeunload", save);
      document.addEventListener("visibilitychange", save);

      return () => {
        save();
        cancelAnimationFrame(rafId);
        el.removeEventListener("scroll", onScroll);
        window.removeEventListener("beforeunload", save);
        document.removeEventListener("visibilitychange", save);
      };
    } else {
      // Fallback to window (non-AppShell pages)
      window.addEventListener("beforeunload", save);
      document.addEventListener("visibilitychange", save);
      return () => {
        save();
        window.removeEventListener("beforeunload", save);
        document.removeEventListener("visibilitychange", save);
      };
    }
  }, [key, save]);
}
