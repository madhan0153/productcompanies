// Deterministic "today's question" selection. Stable for a given user (or the
// anonymous global view) across an entire IST day so the daily pick never
// changes mid-session and resets at midnight India Standard Time (Asia/Kolkata,
// UTC+5:30). India-first per CLAUDE.md rule 7 — streaks, skip/freeze resets,
// and accrual windows all hinge on this key.

// en-CA formats as YYYY-MM-DD, which is exactly the ISO day we want.
const IST_DAY_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year:  "numeric",
  month: "2-digit",
  day:   "2-digit",
});

export function dsaTodayKey(date = new Date()): string {
  return IST_DAY_FORMATTER.format(date);
}

/** Personal day index (Day 1 = the user's first calendar day on the tab). */
export function dsaDayNumber(firstSeenIso: string | null, date = new Date()): number {
  if (!firstSeenIso) return 1;
  // Use the IST day key on both sides so off-by-one is impossible across
  // the IST midnight boundary.
  const firstKey = firstSeenIso.slice(0, 10);
  const first = Date.parse(firstKey);
  const today = Date.parse(dsaTodayKey(date));
  if (Number.isNaN(first) || Number.isNaN(today)) return 1;
  return Math.max(1, Math.round((today - first) / 86_400_000) + 1);
}

/**
 * Milliseconds until the next IST midnight. Used by the daily countdown so
 * the "Next question in Xh Ym" label aligns with the day rollover instead of
 * misleading users by 5h 30m (the old UTC math).
 */
export function msUntilNextIstMidnight(now = Date.now()): number {
  const IST_OFFSET_MS = (5 * 60 + 30) * 60_000;
  const istNow = now + IST_OFFSET_MS;
  const istDayStart = Math.floor(istNow / 86_400_000) * 86_400_000;
  const nextIstMidnightUtc = istDayStart + 86_400_000 - IST_OFFSET_MS;
  return nextIstMidnightUtc - now;
}

/**
 * Current hour (0–23) in IST. Vercel servers run in UTC, so a naive
 * `new Date().getHours()` greets users 5h 30m off. India-first per CLAUDE.md
 * rule 7 — the greeting must follow the user's clock, not the server's.
 */
export function istHour(date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  // en-GB renders "24" at midnight in some runtimes — normalize to 0.
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? 0 : n % 24;
}

/** FNV-ish stable hash → index in [0, len). Seed combines identity + day. */
export function dsaPickIndex(seed: string, len: number): number {
  if (len <= 0) return 0;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h % len;
}

/** Seed for the daily pick — per-user when signed in, global otherwise. */
export function dsaDailySeed(userId: string | null, date = new Date()): string {
  return `${userId ?? "anon"}:${dsaTodayKey(date)}`;
}
