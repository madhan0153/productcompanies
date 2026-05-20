// Adaptive crawler — resilient selector resolution.
//
// Inspiration: Scrapling (MIT) — see /NOTICE.md. The browser-side extraction
// here is original TS, but the "try CSS, then fall back to find-similar by
// fingerprint" pattern is Scrapling's.
//
// Public surface:
//   - resolveAdaptive(page, { slug, label, selector, reference, threshold })
//   - captureFingerprints(page, selector)
//
// The crawler can keep using `page.$$eval` happy-path code. When something
// breaks (selector returns 0 or fewer than expected), call `resolveAdaptive`
// with the slug + label of the saved fingerprint to recover.

import type { Page, ElementHandle } from "playwright";
import { similarity, type ElementSignature } from "./fingerprint.js";

export interface AdaptiveMatch {
  /** ElementHandle for the matched element. Caller is responsible for disposal. */
  handle: ElementHandle;
  /** 0..1 similarity to the saved reference. 1 when the CSS selector hit cleanly. */
  confidence: number;
  /** The captured signature of the live element. */
  signature: ElementSignature;
}

export interface AdaptiveResolveOptions {
  /** Company slug; used for telemetry only. */
  slug: string;
  /** Logical label (e.g. "job_card") this resolver is finding. */
  label: string;
  /** Preferred CSS selector. Tried first. */
  selector: string;
  /**
   * Reference signatures captured when the crawler was last healthy.
   * If empty, only the CSS path is used and we never fall back.
   */
  reference: ElementSignature[];
  /**
   * Minimum similarity for a fingerprint-fallback match. Defaults to 0.55 —
   * empirically high enough to avoid catching unrelated `<li>` elements on
   * an ATS page while still tolerating class renames.
   */
  threshold?: number;
  /**
   * Max number of candidate elements to fingerprint when falling back.
   * Cap exists to bound page.evaluate work on long pages. Default 400.
   */
  candidateCap?: number;
  /**
   * Optional telemetry callback fired once per resolve. The crawler wires
   * this to its logger; tests pass a stub.
   */
  onTelemetry?: (event: AdaptiveTelemetry) => void;
}

export type AdaptiveTelemetry =
  | { kind: "css_hit"; slug: string; label: string; count: number }
  | { kind: "fallback_hit"; slug: string; label: string; count: number; meanConfidence: number }
  | { kind: "miss"; slug: string; label: string; reason: "no_reference" | "no_candidates" | "below_threshold" };

/**
 * Resolve a logical element label. Strategy:
 *   1. Try the CSS selector. If it returns >= 1 element, those are the matches
 *      (confidence 1.0). This is the cheap, fast path used 99% of the time.
 *   2. If CSS returns 0 and `reference` is non-empty, fingerprint every
 *      candidate element on the page that shares the reference's tag, score
 *      against each reference signature, and return matches above threshold.
 *
 * Never returns false-positives silently: if nothing crosses the threshold,
 * returns [] and emits a `miss` telemetry event.
 */
export async function resolveAdaptive(
  page: Page,
  opts: AdaptiveResolveOptions,
): Promise<AdaptiveMatch[]> {
  const threshold = opts.threshold ?? 0.55;
  const candidateCap = opts.candidateCap ?? 400;

  // ── Step 1: CSS-first path ──
  const cssMatches = await page.$$(opts.selector);
  if (cssMatches.length > 0) {
    // Capture signatures so the caller can refresh the reference set when
    // the crawler is healthy. This is cheap relative to the navigation.
    const sigs = await extractSignaturesForHandles(page, cssMatches);
    opts.onTelemetry?.({ kind: "css_hit", slug: opts.slug, label: opts.label, count: cssMatches.length });
    return cssMatches.map((h, i) => ({
      handle: h,
      confidence: 1,
      signature: sigs[i] ?? EMPTY_SIGNATURE,
    }));
  }

  // ── Step 2: fingerprint fallback ──
  if (opts.reference.length === 0) {
    opts.onTelemetry?.({ kind: "miss", slug: opts.slug, label: opts.label, reason: "no_reference" });
    return [];
  }

  // All reference signatures must share a tag (we save them together).
  // If they don't (hand-edited fingerprints.json), fall back to the first.
  const tag = opts.reference[0].tag;

  // Pull all candidate elements with the same tag, fingerprinting in-browser.
  const candidates = await extractCandidatesByTag(page, tag, candidateCap);
  if (candidates.length === 0) {
    opts.onTelemetry?.({ kind: "miss", slug: opts.slug, label: opts.label, reason: "no_candidates" });
    return [];
  }

  // Score each candidate against the best reference and keep matches above
  // threshold. Track mean confidence for telemetry.
  type Scored = { idx: number; confidence: number; signature: ElementSignature };
  const scored: Scored[] = candidates.map((c, idx) => {
    let best = 0;
    for (const ref of opts.reference) {
      const s = similarity(c, ref);
      if (s > best) best = s;
    }
    return { idx, confidence: best, signature: c };
  });
  const keep = scored.filter((s) => s.confidence >= threshold);
  if (keep.length === 0) {
    opts.onTelemetry?.({ kind: "miss", slug: opts.slug, label: opts.label, reason: "below_threshold" });
    return [];
  }

  // Materialise handles for the kept candidates using a fresh DOM query
  // (we already discarded handles to avoid memory pressure when the page
  // is large).
  const handles = await materialiseByIndex(page, tag, keep.map((s) => s.idx));
  const meanConfidence =
    keep.reduce((acc, s) => acc + s.confidence, 0) / keep.length;
  opts.onTelemetry?.({
    kind: "fallback_hit",
    slug: opts.slug,
    label: opts.label,
    count: keep.length,
    meanConfidence,
  });
  return keep.map((s, i) => ({
    handle: handles[i],
    confidence: s.confidence,
    signature: s.signature,
  }));
}

const EMPTY_SIGNATURE: ElementSignature = {
  tag: "",
  classes: [],
  attrs: {},
  textShape: "",
  depth: 0,
  siblingIndex: 0,
  childTagCounts: {},
  ancestorChain: [],
};

/**
 * Capture fingerprints for the elements matched by `selector`. Used by
 * crawlers when they're healthy, to refresh the saved reference file.
 */
export async function captureFingerprints(
  page: Page,
  selector: string,
  limit = 25,
): Promise<ElementSignature[]> {
  return page.$$eval(
    selector,
    (els, params) => {
      const { limit, browserCode } = params as { limit: number; browserCode: string };
      // The browser code defines `__pmComputeSig` on globalThis.
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      new Function(browserCode)();
      const compute = (globalThis as unknown as {
        __pmComputeSig: (el: Element) => unknown;
      }).__pmComputeSig;
      return els.slice(0, limit).map((el) => compute(el)) as unknown[];
    },
    { limit, browserCode: BROWSER_SIG_FN },
  ) as Promise<ElementSignature[]>;
}

// ── Internal helpers ───────────────────────────────────────────────────────

async function extractSignaturesForHandles(
  page: Page,
  handles: ElementHandle[],
): Promise<ElementSignature[]> {
  const out: ElementSignature[] = [];
  for (const h of handles.slice(0, 50)) {
    const sig = await page.evaluate(
      (params) => {
        const { browserCode } = params as { browserCode: string };
        // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
        new Function(browserCode)();
        const compute = (globalThis as unknown as {
          __pmComputeSig: (el: Element) => unknown;
        }).__pmComputeSig;
        return compute(params.el as Element);
      },
      { browserCode: BROWSER_SIG_FN, el: h },
    );
    out.push(sig as ElementSignature);
  }
  // Pad to length if we capped at 50 — callers don't expect missing entries.
  while (out.length < handles.length) out.push(EMPTY_SIGNATURE);
  return out;
}

async function extractCandidatesByTag(
  page: Page,
  tag: string,
  cap: number,
): Promise<ElementSignature[]> {
  return page.$$eval(
    tag,
    (els, params) => {
      const { cap, browserCode } = params as { cap: number; browserCode: string };
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
      new Function(browserCode)();
      const compute = (globalThis as unknown as {
        __pmComputeSig: (el: Element) => unknown;
      }).__pmComputeSig;
      return els.slice(0, cap).map((el) => compute(el)) as unknown[];
    },
    { cap, browserCode: BROWSER_SIG_FN },
  ) as Promise<ElementSignature[]>;
}

async function materialiseByIndex(
  page: Page,
  tag: string,
  indices: number[],
): Promise<ElementHandle[]> {
  const set = new Set(indices);
  const allHandles = await page.$$(tag);
  const out: ElementHandle[] = [];
  for (let i = 0; i < allHandles.length; i++) {
    if (set.has(i)) out.push(allHandles[i]);
    else await allHandles[i].dispose();
  }
  return out;
}

// ── Browser-side fingerprint function (string-evaluated) ──────────────────
//
// We ship this as a string instead of a function reference because Playwright
// serialises closures but our shared `fingerprint.ts` types use TS syntax
// not available in the page context. Defining once here keeps Node and
// browser in lockstep — see fingerprint.test.ts for the matching scoring side.
const BROWSER_SIG_FN = `
globalThis.__pmComputeSig = function (el) {
  function textShape(text, maxLen) {
    maxLen = maxLen || 80;
    if (!text) return "";
    var out = [], lastCat = "";
    for (var i = 0; i < text.length && out.length < maxLen; i++) {
      var c = text[i], cat;
      if (/[a-zA-Z]/.test(c)) cat = "w";
      else if (/[0-9]/.test(c)) cat = "9";
      else if (/\\s/.test(c)) cat = " ";
      else cat = "p";
      if (cat !== lastCat) { out.push(cat); lastCat = cat; }
    }
    return out.join("");
  }

  function pickAttrs(el) {
    var out = {};
    var attrs = el.attributes || [];
    for (var i = 0; i < attrs.length; i++) {
      var a = attrs[i];
      var k = a.name, v = a.value;
      var stable =
        k === "id" || k === "role" || k === "name" || k === "type" ||
        k === "itemprop" || k === "itemtype" ||
        k.indexOf("data-") === 0 || k.indexOf("aria-") === 0;
      if (!stable) continue;
      if (k === "id" && /^[a-f0-9-]{12,}$/i.test(v)) continue;
      out[k] = v;
    }
    return out;
  }

  function classList(el) {
    var raw = (el.getAttribute && el.getAttribute("class")) || "";
    return raw.split(/\\s+/).filter(Boolean).sort();
  }

  function depth(el) {
    var d = 0, n = el;
    while (n && n.parentElement) { d++; n = n.parentElement; }
    return d;
  }

  function siblingIndex(el) {
    var p = el.parentElement;
    if (!p) return 0;
    var idx = 0;
    for (var i = 0; i < p.children.length; i++) {
      var c = p.children[i];
      if (c === el) return idx;
      if (c.tagName === el.tagName) idx++;
    }
    return 0;
  }

  function childTagCounts(el) {
    var counts = {};
    var children = el.children || [];
    for (var i = 0; i < children.length; i++) {
      var t = children[i].tagName.toLowerCase();
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }

  function ancestorChain(el) {
    var chain = [], n = el.parentElement, hops = 0;
    while (n && hops < 4) {
      chain.push(n.tagName.toLowerCase());
      n = n.parentElement;
      hops++;
    }
    return chain;
  }

  return {
    tag: el.tagName.toLowerCase(),
    classes: classList(el),
    attrs: pickAttrs(el),
    textShape: textShape((el.textContent || "").trim()),
    depth: depth(el),
    siblingIndex: siblingIndex(el),
    childTagCounts: childTagCounts(el),
    ancestorChain: ancestorChain(el),
  };
};
`;
