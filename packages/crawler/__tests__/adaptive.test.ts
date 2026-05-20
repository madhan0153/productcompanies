// Pure-TS ranking tests for the adaptive selector engine. We don't spin up
// Playwright here — the adaptive.ts file is a thin orchestrator on top of
// fingerprint similarity, which we exercise here against synthetic candidates.
//
// Runs under: tsx --test packages/crawler/__tests__/adaptive.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import { similarity, type ElementSignature } from "../lib/fingerprint.js";

function makeRef(): ElementSignature {
  return {
    tag: "li",
    classes: ["lLd3Je"],
    attrs: { "data-test": "card" },
    textShape: "w w9 wp w w wp w w9 w9 w9 w9 w9 w9p w9",
    depth: 4,
    siblingIndex: 0,
    childTagCounts: { div: 1, a: 1 },
    ancestorChain: ["ul", "main", "body", "html"],
  };
}

/**
 * Simulate the ranking logic in resolveAdaptive() without Playwright.
 * Returns indices that score above threshold, ordered as given.
 */
function rank(
  candidates: ElementSignature[],
  reference: ElementSignature[],
  threshold = 0.55,
): { idx: number; confidence: number }[] {
  return candidates
    .map((c, idx) => {
      let best = 0;
      for (const ref of reference) {
        const s = similarity(c, ref);
        if (s > best) best = s;
      }
      return { idx, confidence: best };
    })
    .filter((x) => x.confidence >= threshold);
}

test("identifies the renamed-class card and rejects unrelated <li> elements", () => {
  const reference = [makeRef()];
  const candidates: ElementSignature[] = [
    // 0: drifted card — class hash changed
    { ...makeRef(), classes: ["abc123_card"] },
    // 1: footer nav item — completely different ancestors + children
    {
      ...makeRef(),
      classes: ["footer-link"],
      ancestorChain: ["nav", "footer", "body", "html"],
      childTagCounts: { a: 1 },
    },
    // 2: another drifted card, slightly deeper
    { ...makeRef(), classes: ["abc123_card"], depth: 5, siblingIndex: 4 },
    // 3: pagination control
    {
      ...makeRef(),
      tag: "li",
      classes: ["page"],
      ancestorChain: ["ul", "nav", "div", "body"],
      childTagCounts: { a: 1 },
      textShape: "9",
    },
  ];
  const matched = rank(candidates, reference);
  const matchedIdx = matched.map((m) => m.idx).sort((a, b) => a - b);
  assert.deepEqual(matchedIdx, [0, 2]);
});

test("returns empty when no candidate crosses threshold", () => {
  const reference = [makeRef()];
  const candidates: ElementSignature[] = [
    { ...makeRef(), tag: "div" }, // wrong tag → 0
    {
      ...makeRef(),
      classes: ["totally_unrelated"],
      ancestorChain: ["section", "article", "div", "body"],
      childTagCounts: { span: 9 },
      textShape: "999",
    },
  ];
  const matched = rank(candidates, reference);
  assert.equal(matched.length, 0);
});

test("multiple reference signatures broaden the match envelope", () => {
  // Save a card at sibling index 0 and at sibling index 8 (header/footer of
  // the listing). A candidate at index 6 should still match because the
  // closeness is computed against the BEST reference, not the average.
  const reference: ElementSignature[] = [
    { ...makeRef(), siblingIndex: 0 },
    { ...makeRef(), siblingIndex: 8 },
  ];
  const candidate = { ...makeRef(), siblingIndex: 6, classes: ["abc123_card"] };
  const matched = rank([candidate], reference, 0.55);
  assert.equal(matched.length, 1);
});

test("threshold guards against false positives at the boundary", () => {
  const reference = [makeRef()];
  const borderline = { ...makeRef(), classes: ["x"] };
  const highBar = rank([borderline], reference, 0.9);
  const lowBar = rank([borderline], reference, 0.3);
  assert.equal(highBar.length, 0);
  assert.equal(lowBar.length, 1);
});
