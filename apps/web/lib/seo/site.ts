// Single source of truth for the public origin + canonical URLs.
// Reads NEXT_PUBLIC_SITE_URL when set (cheap operator override for the
// custom-domain migration); otherwise reconstructs from Vercel's env so a
// preview deploy doesn't silently emit production canonical URLs.

const FALLBACK_ORIGIN = "https://prodmatchai.vercel.app";

export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelUrl) return `https://${vercelUrl.replace(/\/$/, "")}`;
  return FALLBACK_ORIGIN;
}

/** Build an absolute URL — always returns origin + path with single slash. */
export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!path) return origin;
  if (path.startsWith("http")) return path;
  const normalised = path.startsWith("/") ? path : `/${path}`;
  return `${origin}${normalised}`;
}

/** Indian hubs the matcher already knows about. Lower-cased + slug-safe. */
export const INDIA_HUBS = [
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Gurugram",
  "Noida",
  "Delhi NCR",
  "Mumbai",
  "Chennai",
  "Remote-India",
] as const;

export type IndiaHub = (typeof INDIA_HUBS)[number];

export function hubToSlug(hub: string): string {
  return hub.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function slugToHub(slug: string): IndiaHub | null {
  const target = slug.toLowerCase();
  return (INDIA_HUBS.find((h) => hubToSlug(h) === target) ?? null) as IndiaHub | null;
}

/** Region code for schema.org PostalAddress.addressRegion. */
export const HUB_REGION: Record<string, string> = {
  Bengaluru: "KA",
  Hyderabad: "TS",
  Pune: "MH",
  Gurugram: "HR",
  Noida: "UP",
  "Delhi NCR": "DL",
  Mumbai: "MH",
  Chennai: "TN",
  "Remote-India": "IN",
};
