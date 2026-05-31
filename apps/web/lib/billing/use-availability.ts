"use client";

import { useEffect, useState } from "react";
import type { CheckoutProductId } from "@/lib/billing/catalog";

type AvailabilityMap = Partial<Record<CheckoutProductId, boolean>>;

interface State {
  /** null = not yet fetched (treat as "available" to avoid flicker on fast paths). */
  products: AvailabilityMap | null;
  apiKeyReady: boolean | null;
  error: string | null;
}

let cache: { at: number; data: State } | null = null;
const TTL_MS = 60_000;

/**
 * Client hook: which CheckoutProductIds are checkout-ready right now?
 * Used by paywall surfaces to dim CTAs they can't fulfil. Treats unknown
 * (null) as available so the UI doesn't flicker on first paint.
 */
export function useAvailability(): State & { isAvailable(id: CheckoutProductId): boolean } {
  const [state, setState] = useState<State>(() => {
    if (cache && Date.now() - cache.at < TTL_MS) return cache.data;
    return { products: null, apiKeyReady: null, error: null };
  });

  useEffect(() => {
    if (cache && Date.now() - cache.at < TTL_MS) return;
    let cancelled = false;
    fetch("/api/billing/availability", { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((data: { products: AvailabilityMap; apiKeyReady: boolean }) => {
        if (cancelled) return;
        const next: State = { products: data.products, apiKeyReady: data.apiKeyReady, error: null };
        cache = { at: Date.now(), data: next };
        setState(next);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        // Fail-open: if we can't reach the endpoint we assume products are
        // available rather than locking users out of every CTA on a flaky network.
        setState({ products: null, apiKeyReady: null, error: err.message });
      });
    return () => { cancelled = true; };
  }, []);

  return {
    ...state,
    isAvailable(id: CheckoutProductId): boolean {
      if (state.products === null) return true;
      return Boolean(state.products[id]);
    },
  };
}
