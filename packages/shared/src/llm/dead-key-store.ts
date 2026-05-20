// Pluggable persistence for the LLM provider router's dead-key state.
//
// The in-memory `deadUntil` Map in provider-router.ts is the hot path.
// On Vercel serverless, that Map resets on every cold start, so we'd
// re-discover dead keys via 429 round-trips on every container reboot.
// This module provides a DeadKeyStore interface that the consumer
// (apps/web, or any host) can implement against Supabase / Redis / KV
// to make dead-key state durable.
//
// Design:
//   - Set the store once at app boot via `setDeadKeyStore(store)`.
//   - The router calls `ensureHydrated()` on first request to merge
//     persisted state into the in-memory Map.
//   - When the router marks a combo dead, it ALSO write-throughs to the
//     store asynchronously (best-effort; failures are logged at debug
//     level and never block the request).
//   - When no store is set, behaviour is identical to before: in-memory
//     only.
//
// Privacy: this module captures NO user data. Metadata is provider id,
// model name, masked key index, capability, failure kind, and a truncated
// error reason from the upstream provider. The writer in apps/web must
// already scrub any prompt / response text from `reason` before passing
// it here — see comment on writeReasonSafe().

import type { LlmCapability } from "./operations";

export interface DeadKeyMetadata {
  providerId: string;
  model: string;
  keyIndex: number;
  capability: LlmCapability;
  failureKind: "auth" | "quota" | "rate_limited" | "unsupported";
  /** Truncated error message (≤ 500 chars). Caller must have scrubbed any
   *  user-supplied text — typically the provider's own error body is fine. */
  reason?: string;
}

export interface DeadKeyStore {
  /** Load every dead combo whose `dead_until` is still in the future. */
  loadAll(): Promise<Map<string, number>>;
  /** Persist that `comboKey` is dead until `deadUntilMs` (epoch ms). */
  markDead(comboKey: string, deadUntilMs: number, metadata: DeadKeyMetadata): Promise<void>;
  /** Optional best-effort cleanup of rows whose dead_until is in the past. */
  clearExpired?(): Promise<void>;
}

let _store: DeadKeyStore | null = null;

/** Wire a store. Pass `null` to detach (mostly useful in tests). */
export function setDeadKeyStore(store: DeadKeyStore | null): void {
  _store = store;
}

export function getDeadKeyStore(): DeadKeyStore | null {
  return _store;
}

/**
 * Scrub a raw error string for safe persistence:
 *   - Truncated to 500 chars.
 *   - Whitespace collapsed.
 *   - `Bearer ` / `sk-` / `gsk_` / `hf_` / `nvapi-` prefixes redacted
 *     just in case the provider echoed a partial key in its response.
 */
export function writeReasonSafe(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  let s = raw.replace(/\s+/g, " ").trim();
  s = s.replace(/(?:Bearer\s+|sk-[a-z0-9-]+|gsk_[a-z0-9]+|hf_[a-z0-9]+|nvapi-[a-z0-9]+|csk-[a-z0-9]+)/gi, "[REDACTED]");
  if (s.length > 500) s = s.slice(0, 497) + "...";
  return s;
}
