// Deterministic "today's question" selection. Stable for a given user (or the
// anonymous global view) across an entire UTC day so the daily pick never
// changes mid-session. No DB write needed for the choice itself.

export function dsaTodayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/** Personal day index (Day 1 = the user's first calendar day on the tab). */
export function dsaDayNumber(firstSeenIso: string | null, date = new Date()): number {
  if (!firstSeenIso) return 1;
  const first = Date.parse(firstSeenIso.slice(0, 10));
  const today = Date.parse(dsaTodayKey(date));
  if (Number.isNaN(first) || Number.isNaN(today)) return 1;
  return Math.max(1, Math.round((today - first) / 86_400_000) + 1);
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
