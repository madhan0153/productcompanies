// HTTP utility for career-site APIs. Provides:
//   • Per-request timeout via AbortController (default 30s)
//   • Bounded retry on 5xx / network errors with exponential backoff
//   • A rotating User-Agent pool so we don't all look like Chrome 120 forever
//
// Used by every `fetch(...)` call inside packages/crawler/companies/* in
// place of bare `fetch`. Single source of truth for politeness + resilience.

const USER_AGENTS: readonly string[] = [
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
];

export function pickUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export interface FetchRetryOptions extends Omit<RequestInit, "signal"> {
  /** Per-attempt timeout in ms. Default 30_000. */
  timeoutMs?: number;
  /** Total attempts including the first try. Default 3. */
  maxAttempts?: number;
  /** Base delay before the second attempt. Doubles each retry. Default 1_000. */
  baseBackoffMs?: number;
  /** Treat these HTTP statuses as retryable in addition to 5xx. Default [429]. */
  retryOnStatus?: number[];
  /** Inject a randomized User-Agent if caller didn't set one. Default true. */
  rotateUA?: boolean;
}

class HttpError extends Error {
  constructor(public status: number, public body: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Wrapper around `fetch` with timeout + exponential-backoff retry on 5xx /
 * network errors. Returns the final `Response` on success; throws on
 * exhausted retries or 4xx (non-retryable by default).
 *
 * Throws `HttpError` for non-2xx responses with a parsed body for logging.
 */
export async function fetchWithRetry(
  url: string,
  opts: FetchRetryOptions = {},
): Promise<Response> {
  const timeoutMs    = opts.timeoutMs    ?? 30_000;
  const maxAttempts  = opts.maxAttempts  ?? 3;
  const baseBackoff  = opts.baseBackoffMs ?? 1_000;
  const retryStatus  = new Set(opts.retryOnStatus ?? [429]);
  const rotateUA     = opts.rotateUA ?? true;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);

    // Merge caller headers with a User-Agent unless they set one explicitly.
    const headers = new Headers(opts.headers ?? {});
    if (rotateUA && !headers.has("user-agent") && !headers.has("User-Agent")) {
      headers.set("User-Agent", pickUserAgent());
    }
    // Light politeness defaults that ATS endpoints expect.
    if (!headers.has("accept")) headers.set("Accept", "application/json, text/plain, */*");
    if (!headers.has("accept-language")) headers.set("Accept-Language", "en-US,en;q=0.9");

    try {
      const res = await fetch(url, { ...opts, headers, signal: ctrl.signal });
      clearTimeout(timer);

      // Retryable statuses → fall through to backoff.
      if (res.status >= 500 || retryStatus.has(res.status)) {
        const body = await res.text().catch(() => "");
        lastErr = new HttpError(res.status, body, `HTTP ${res.status} on ${url}`);
        if (attempt < maxAttempts) {
          await sleep(baseBackoff * 2 ** (attempt - 1));
          continue;
        }
        throw lastErr;
      }

      // Non-retryable 4xx → throw immediately with body.
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new HttpError(res.status, body, `HTTP ${res.status} on ${url}`);
      }

      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      // Don't retry HttpError 4xx (already thrown above bypasses this path).
      // AbortError + network errors fall through here.
      if (attempt < maxAttempts) {
        await sleep(baseBackoff * 2 ** (attempt - 1));
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/** Convenience: fetch + JSON parse with retry + timeout. */
export async function fetchJson<T>(
  url: string,
  opts: FetchRetryOptions = {},
): Promise<T> {
  const res = await fetchWithRetry(url, opts);
  return (await res.json()) as T;
}

export { HttpError };
