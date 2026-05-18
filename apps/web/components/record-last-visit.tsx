"use client";

// Session history — records the most-recently visited (path + search +
// optional context) in localStorage so the dashboard can show a
// "Continue where you left off" surface.
//
// Why localStorage, not a DB table:
//   - Single-device continue covers 95% of the value
//   - Zero schema, zero migration risk, zero RLS to get wrong
//   - Cross-device persistence can be added later via the planned
//     user_session_state table (see plan in earlier message)
//
// Mounted once in AppShell; updates the entry on every route change.

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useScrollRestore } from "@/hooks/use-scroll-restore";

const STORAGE_KEY = "prodmatch:last-visit";

export interface LastVisit {
  path: string;
  label: string;
  ts: number;
}

// Pathname → human label for the "Continue" surface. Job/application IDs
// are kept opaque; the dashboard will resolve them server-side if needed.
function labelFor(path: string): string {
  if (path === "/dashboard")        return "Dashboard";
  if (path === "/matches")          return "Matches";
  if (path === "/profile")          return "Profile";
  if (path === "/coach")            return "Coach";
  if (path === "/insights")         return "Market insights";
  if (path === "/applications")     return "Applications";
  if (path.startsWith("/jobs/"))    return "A job you were viewing";
  if (path.startsWith("/applications/")) return "An application";
  if (path.startsWith("/settings"))  return "Settings";
  return path;
}

export function RecordLastVisit() {
  const pathname = usePathname();
  const params = useSearchParams();
  useScrollRestore();

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Don't record dashboard itself — defeats the purpose of "continue".
    if (pathname === "/dashboard" || pathname === "/" || pathname.startsWith("/auth")) return;

    const qs = params.toString();
    const path = qs ? `${pathname}?${qs}` : pathname;
    const entry: LastVisit = {
      path,
      label: labelFor(pathname),
      ts: Date.now(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
    } catch { /* localStorage unavailable — silent */ }
  }, [pathname, params]);

  return null;
}
