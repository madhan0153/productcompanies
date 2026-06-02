"use client";

// Invisible poller. Mounted by /matches whenever a match-compute is in flight
// for the user (isComputing). It periodically calls router.refresh() so the
// server component re-reads the DB; the moment the background job stamps
// matches_resume_version_id (compute done) the page re-renders with isComputing
// false and this component unmounts on its own.
//
// Why a dedicated component instead of ComputingBanner's old setInterval: the
// banner only renders when there are zero existing matches, so the *replace*
// flow (old matches present) never auto-refreshed and the user had to reload
// by hand. This poller mounts in both cases, and is the single source of the
// refresh tick (ComputingBanner is now presentation-only).

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const TICK_MS = 4000;
const HARD_CAP_MS = 3 * 60 * 1000;

export function ComputeAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const startMs = Date.now();
    const id = setInterval(() => {
      // Stop polling after the hard cap — something is stuck; the user can
      // reload manually rather than us hammering the server forever.
      if (Date.now() - startMs > HARD_CAP_MS) {
        clearInterval(id);
        return;
      }
      router.refresh();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [router]);

  return null;
}
