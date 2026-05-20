// Adaptive crawler — element fingerprint primitives.
//
// Inspiration: Scrapling's "auto-match" / find_similar pattern
// (https://github.com/D4Vinci/Scrapling, MIT). See /NOTICE.md.
// This file is a TypeScript re-implementation of the *idea*, not a port.
//
// Goal: when a brittle CSS selector breaks because a career site shipped a
// CSS-module rename, fall back to finding the elements that look the *most
// like* the elements we matched the last time the crawler was healthy.
//
// Privacy: signatures intentionally capture *structure*, not job content.
// No text content is persisted — only a coarse "shape" of the text
// (letters→`w`, digits→`9`, punctuation→`p`). This is safe to commit and
// safe to log.

export interface ElementSignature {
  /** Lowercased tag name, e.g. "li". */
  tag: string;
  /** Sorted class tokens. */
  classes: string[];
  /** Selected stable attributes only: id, role, name, type, data-*, aria-*. */
  attrs: Record<string, string>;
  /** Shape of text content — letters→w, digits→9, punctuation→p, whitespace→space.
   *  Capped at 80 chars. Lossy by design (no PII). */
  textShape: string;
  /** Tree depth from document root. */
  depth: number;
  /** Position among same-tag siblings. */
  siblingIndex: number;
  /** Counts of child tags directly under the element. */
  childTagCounts: Record<string, number>;
  /** Chain of ancestor tags, up to 4 levels (closest first). */
  ancestorChain: string[];
}

const STABLE_ATTR_PREFIXES = ["data-", "aria-"];
const STABLE_ATTR_NAMES = new Set(["id", "role", "name", "type", "itemprop", "itemtype"]);

/**
 * Reduce a string to a coarse shape token sequence. Used to compare
 * structural similarity of text blocks without persisting the actual text.
 */
export function computeTextShape(text: string, maxLen = 80): string {
  if (!text) return "";
  const out: string[] = [];
  let lastCat = "";
  for (let i = 0; i < text.length && out.length < maxLen; i++) {
    const c = text[i];
    let cat: string;
    if (/[a-zA-Z]/.test(c)) cat = "w";
    else if (/[0-9]/.test(c)) cat = "9";
    else if (/\s/.test(c)) cat = " ";
    else cat = "p";
    // Collapse runs (Scrapling-style coarsening).
    if (cat !== lastCat) {
      out.push(cat);
      lastCat = cat;
    }
  }
  return out.join("");
}

/** Jaccard similarity over two string lists. */
function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter++;
  const uni = sa.size + sb.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

/** Overlap of two string→string maps as a 0..1 ratio. */
function attrOverlap(a: Record<string, string>, b: Record<string, string>): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 1;
  let agree = 0;
  for (const k of keys) {
    if (a[k] !== undefined && b[k] !== undefined && a[k] === b[k]) agree++;
  }
  return agree / keys.size;
}

/** Longest-common-prefix ratio over two arrays. */
function prefixRatio(a: string[], b: string[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return a.length === b.length ? 1 : 0;
  let lcp = 0;
  for (let i = 0; i < len; i++) {
    if (a[i] === b[i]) lcp++;
    else break;
  }
  return lcp / Math.max(a.length, b.length);
}

/** Closeness of two integer values, normalized to 0..1 by a soft denominator. */
function intCloseness(a: number, b: number, soft = 6): number {
  const d = Math.abs(a - b);
  return Math.max(0, 1 - d / (d + soft));
}

/** Bag-of-children similarity — same Jaccard idea, weighted by counts. */
function childCountSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = new Set<string>([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 1;
  let agree = 0;
  let total = 0;
  for (const k of keys) {
    const av = a[k] ?? 0;
    const bv = b[k] ?? 0;
    agree += Math.min(av, bv);
    total += Math.max(av, bv);
  }
  return total === 0 ? 1 : agree / total;
}

/** Levenshtein distance, capped — used on the textShape coarse strings. */
function levenshtein(a: string, b: string, cap = 200): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  // Truncate to keep this bounded for unexpected inputs.
  const aa = a.length > cap ? a.slice(0, cap) : a;
  const bb = b.length > cap ? b.slice(0, cap) : b;
  const m = aa.length;
  const n = bb.length;
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = aa[i - 1] === bb[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n];
}

function textShapeSimilarity(a: string, b: string): number {
  if (a === "" && b === "") return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  const d = levenshtein(a, b);
  return Math.max(0, 1 - d / max);
}

/**
 * Weighted similarity between two element signatures in [0, 1].
 *
 * A different tag short-circuits to 0 — we never claim a `<div>` is similar
 * to a `<li>`. Weights chosen so a single brittle thing (e.g. a renamed
 * class) cannot drop a strong match below ~0.6.
 */
export function similarity(a: ElementSignature, b: ElementSignature): number {
  if (a.tag !== b.tag) return 0;

  const sClass = jaccard(a.classes, b.classes);
  const sAttr = attrOverlap(a.attrs, b.attrs);
  const sText = textShapeSimilarity(a.textShape, b.textShape);
  const sAncestor = prefixRatio(a.ancestorChain, b.ancestorChain);
  const sChildren = childCountSimilarity(a.childTagCounts, b.childTagCounts);
  const sSibling = intCloseness(a.siblingIndex, b.siblingIndex, 8);
  const sDepth = intCloseness(a.depth, b.depth, 4);

  // Weights sum to 1.00.
  return (
    0.30 * sClass +
    0.15 * sAttr +
    0.15 * sText +
    0.20 * sAncestor +
    0.10 * sChildren +
    0.05 * sSibling +
    0.05 * sDepth
  );
}

/** Filter raw attributes down to the stable ones we use in fingerprints. */
export function pickStableAttrs(attrs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (STABLE_ATTR_NAMES.has(k) || STABLE_ATTR_PREFIXES.some((p) => k.startsWith(p))) {
      // Some IDs are autogenerated nonces — keep them out of the signature.
      if (k === "id" && /^[a-f0-9-]{12,}$/i.test(v)) continue;
      out[k] = v;
    }
  }
  return out;
}

export const FINGERPRINT_WEIGHTS = Object.freeze({
  classes: 0.30,
  attrs: 0.15,
  textShape: 0.15,
  ancestorChain: 0.20,
  childTagCounts: 0.10,
  siblingIndex: 0.05,
  depth: 0.05,
});
