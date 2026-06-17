// Shared India Standard Time helpers. Vercel servers run in UTC, so a naive
// `new Date().getHours()` greets users 5h 30m off. India-first per CLAUDE.md
// rule 7 — every server-rendered greeting must follow the user's IST clock,
// not the server's. Single source of truth for hour-of-day in IST.

/** Current hour (0–23) in IST for the given instant. */
export function istHour(date: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hour12: false,
  }).format(date);
  const n = parseInt(h, 10);
  return Number.isNaN(n) ? 0 : n % 24; // en-GB can render "24" at midnight
}

/** Standard three-band greeting keyed off the IST hour. */
export function istGreeting(date: Date = new Date()): string {
  const h = istHour(date);
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
