// Centralized client-side error → user-message mapping.
//
// Client-safe: imports nothing server-side. Client fetch sites use this so
// network failures, offline state, and aborted requests get consistent,
// non-technical copy instead of each component inventing its own string (or,
// worse, mislabelling a network failure as a different kind of error).

export const GENERIC_MESSAGE = "Something went wrong. Please try again.";
export const OFFLINE_MESSAGE = "You appear to be offline. Check your connection and try again.";
export const NETWORK_MESSAGE = "Couldn't reach the server. Check your connection and try again.";

/** Request was cancelled (component unmounted, navigation, manual abort). */
export function isAbortError(err: unknown): boolean {
  return (
    (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/** fetch() rejects with a TypeError on a transport failure (DNS, offline, reset, CORS). */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

/**
 * Map an unknown thrown error to a safe, user-facing message. Distinguishes
 * offline / network transport failures from everything else; callers pass a
 * domain-specific `fallback` for the non-network case.
 */
export function toUserMessage(err: unknown, fallback: string = GENERIC_MESSAGE): string {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return OFFLINE_MESSAGE;
  if (isNetworkError(err)) return NETWORK_MESSAGE;
  return fallback;
}
