// Adaptive crawler — golden fixture + reference fingerprint storage.
//
// Fixtures live on disk under packages/crawler/__fixtures__/<slug>/.
//
//   listing.html        — a small captured snapshot of the official career
//                          page's listing markup (no PII; structure only).
//   fingerprints.json   — labelled reference signatures, keyed by logical
//                          element label (e.g. "job_card"). Used by the
//                          adaptive selector fallback when the fast CSS
//                          path returns zero elements.
//
// Files are *committed* to the repo so they ship with the crawler. They are
// never written from production crawls — refresh happens locally via the
// `--refresh-fingerprints=<slug>` flag (out of scope for this initial
// implementation; capture is exposed as captureFingerprints() in adaptive.ts).
//
// Privacy: signatures are structural, not textual. We deliberately do not
// persist live HTML from production crawls — only hand-curated fixtures.

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { ElementSignature } from "./fingerprint.js";

// __dirname works under tsx (CommonJS-transpiled) regardless of whether the
// crawler tsconfig targets CommonJS or ESM. We avoid import.meta.url here
// because the crawler tsconfig uses "module": "CommonJS".
const FIXTURES_ROOT = join(__dirname, "..", "__fixtures__");

export interface CompanyFingerprints {
  /** Schema version of the persisted file. */
  version: 1;
  /** Slug this file belongs to — sanity check. */
  slug: string;
  /** When the fixture was captured (ISO-8601). */
  capturedAt: string;
  /** Origin URL the snapshot was taken from (no query secrets). */
  source: string;
  /** Logical label → list of reference signatures. */
  signatures: Record<string, ElementSignature[]>;
}

export interface FixtureCoverage {
  slug: string;
  hasListingSnapshot: boolean;
  hasFingerprints: boolean;
  labels: string[];
  /** ISO-8601 of fingerprints.capturedAt, or null. */
  capturedAt: string | null;
}

/**
 * Load reference fingerprints for a slug. Returns null when the slug has no
 * fixtures committed yet — the crawler treats this as "adaptive disabled,
 * CSS-only" and the resilience UI flags the slug as low-coverage.
 */
export function loadFingerprints(slug: string): CompanyFingerprints | null {
  const path = join(FIXTURES_ROOT, slug, "fingerprints.json");
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as CompanyFingerprints;
    if (parsed.version !== 1 || parsed.slug !== slug) {
      // Malformed file — fail closed by reporting no fingerprints, never
      // throw inside the crawler hot path.
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Resolve references for a specific label (e.g. "job_card"). */
export function loadReferenceSignatures(slug: string, label: string): ElementSignature[] {
  const fp = loadFingerprints(slug);
  if (!fp) return [];
  return fp.signatures[label] ?? [];
}

/**
 * Load the static HTML snapshot for tests. Throws on missing file — used
 * only from test files where the absence is a test-author error.
 */
export function loadListingSnapshot(slug: string): string {
  const path = join(FIXTURES_ROOT, slug, "listing.html");
  return readFileSync(path, "utf8");
}

/**
 * Inventory of which slugs have which fixtures committed. Read by the
 * /admin/crawler-intel UI to render the coverage matrix.
 *
 * Synchronous, filesystem-only — safe to call from Server Components.
 */
export function listFixtureCoverage(): FixtureCoverage[] {
  if (!existsSync(FIXTURES_ROOT)) return [];
  const slugs = readdirSync(FIXTURES_ROOT).filter((entry) => {
    const p = join(FIXTURES_ROOT, entry);
    return statSync(p).isDirectory() && !entry.startsWith(".") && !entry.startsWith("_");
  });
  return slugs.map((slug) => {
    const fp = loadFingerprints(slug);
    return {
      slug,
      hasListingSnapshot: existsSync(join(FIXTURES_ROOT, slug, "listing.html")),
      hasFingerprints: fp !== null,
      labels: fp ? Object.keys(fp.signatures) : [],
      capturedAt: fp?.capturedAt ?? null,
    };
  });
}
