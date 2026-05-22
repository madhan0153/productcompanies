// Security fix (S-1): rate limiter with two tiers.
//
// 1. `checkRateLimit` (sync) — in-memory per-instance counter. Cheap.
//    Effective limit on serverless is N_instances × declared limit, so
//    this is "casual abuse deterrence" only.
//
// 2. `checkRateLimitShared` (async) — Postgres-backed atomic UPSERT via
//    the `rate_limit_check(text, timestamptz, integer)` RPC. Shared
//    across all Vercel function instances. Use this for any endpoint
//    where a determined attacker can fan out (auth, resume upload,
//    /api/resume/import, /api/cron/recompute-matches ad-hoc mode).
//
// Both functions return the same { ok, retryAfterSeconds } shape so call
// sites can swap between them without conditional logic.
//
// `checkRateLimitShared` fails-open: if the RPC errors (table missing on
// a fresh schema, DB connection dropped, etc.) the call is allowed and a
// structured warning is logged. We never DoS our own users because of a
// transient rate-limit-store issue.

// Lazy imports inside checkRateLimitShared keep the sync checkRateLimit path
// dependency-free — the security smoke test loads only the sync function and
// must not pull in the Supabase admin client (which transitively needs env
// vars that aren't set in the test environment).

type RateLimitOptions = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

const buckets = new Map<string, RateLimitRecord>();

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (buckets.size > 20_000) {
    for (const [bucketKey, record] of buckets) {
      if (record.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { ok: true };
}

export function userActionKey(userId: string, action: string): string {
  return `user:${userId}:${action}`;
}

export function ipActionKey(ip: string, action: string): string {
  return `ip:${ip}:${action}`;
}

/**
 * Shared / distributed rate limit via Supabase RPC. Use for any path
 * that needs real abuse protection on serverless. The first call in a
 * new window inserts; subsequent calls increment atomically.
 *
 * `ttlSeconds` should match `windowMs` (in seconds). The DB row is GC'd
 * by `rate_limit_gc()` from the daily cron — we never block waiting for
 * cleanup.
 */
export async function checkRateLimitShared(opts: {
  key: string;
  limit: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.floor(opts.windowMs / 1000));
  const now = Date.now();
  // Pin to the window boundary so concurrent callers hit the same row.
  const windowStartMs = Math.floor(now / opts.windowMs) * opts.windowMs;
  const windowStartIso = new Date(windowStartMs).toISOString();

  try {
    const [{ createSupabaseAdminClient }, { logEvent }] = await Promise.all([
      import("../supabase/admin"),
      import("../observability/log"),
    ]);
    const admin = createSupabaseAdminClient();
    const { data, error } = (await (admin.rpc as any)("rate_limit_check", {
      bucket_key:   opts.key,
      window_start: windowStartIso,
      ttl_seconds:  windowSeconds,
    })) as { data: number | null; error: { message: string } | null };

    if (error) {
      // Fail open. We never DoS our own users for a rate-limit-store outage.
      logEvent("warn", "rate_limit_shared_failed", {
        key_prefix: opts.key.split(":").slice(0, 2).join(":"),
        reason:     error.message?.slice(0, 80) ?? "unknown",
      });
      return { ok: true };
    }

    const count = typeof data === "number" ? data : 0;
    if (count > opts.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowStartMs + opts.windowMs - now) / 1000));
      return { ok: false, retryAfterSeconds };
    }
    return { ok: true };
  } catch (err) {
    // Log without statically importing — same fail-open semantics.
    try {
      const { logEvent } = await import("../observability/log");
      logEvent("warn", "rate_limit_shared_failed", {
        key_prefix: opts.key.split(":").slice(0, 2).join(":"),
        reason:     err instanceof Error ? err.message.slice(0, 80) : "unknown",
      });
    } catch { /* nothing more we can do */ }
    return { ok: true };
  }
}
