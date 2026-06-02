"use client";

// Lightweight compute-status poller. It deliberately avoids calling
// router.refresh() while the compute job is still queued/running; refreshing
// the whole RSC tree during row upserts is what made the mobile flow flicker
// and occasionally land on the app error boundary. We refresh once only after
// the backend reports a terminal state.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const TICK_MS = 3500;
const FIRST_TICK_MS = 2200;
const HARD_CAP_MS = 4 * 60 * 1000;
export const COMPUTE_STATUS_EVENT = "prodmatch:match-compute-status";

type ComputeStatusResponse = {
  status?: "no_resume" | "computing" | "ready" | "needs_compute" | "failed";
  jobStatus?: "queued" | "running";
  queuedAt?: string | null;
  startedAt?: string | null;
};

export function ComputeAutoRefresh() {
  const router = useRouter();
  const terminalRefreshStarted = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();

    async function poll() {
      if (cancelled || terminalRefreshStarted.current) return;
      if (Date.now() - startedAt > HARD_CAP_MS) {
        terminalRefreshStarted.current = true;
        router.refresh();
        return;
      }

      try {
        const res = await fetch("/api/matches/compute-status", {
          cache: "no-store",
          credentials: "same-origin",
        });
        const body = await res.json().catch(() => ({})) as ComputeStatusResponse;
        if (body.status) {
          window.dispatchEvent(new CustomEvent(COMPUTE_STATUS_EVENT, { detail: body }));
        }
        if (
          body.status === "ready" ||
          body.status === "failed" ||
          body.status === "needs_compute" ||
          body.status === "no_resume"
        ) {
          terminalRefreshStarted.current = true;
          router.refresh();
          return;
        }
      } catch {
        // Network/API hiccup during compute should not throw the page into an
        // error boundary. Keep the current progress UI and try again.
      }

      if (!cancelled) timer = setTimeout(poll, TICK_MS);
    }

    timer = setTimeout(poll, FIRST_TICK_MS);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return null;
}
