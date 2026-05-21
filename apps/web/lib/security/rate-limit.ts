// Dev review note (D3): this is an in-memory per-instance rate limiter.
// Vercel can run multiple lambda instances for the same function, so the
// effective limit is roughly N_instances × declared limit. That's fine for
// deterring casual abuse, but for production-grade abuse control move to a
// shared backend:
//   - Upstash Redis (recommended) — `INCR` + `EXPIRE`
//   - Postgres advisory locks + a counter row
// When that lands, the contract here stays the same; only the bucket
// store changes. Tests and call sites do not need to be touched.

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
