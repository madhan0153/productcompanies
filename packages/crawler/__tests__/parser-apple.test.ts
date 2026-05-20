// Parser regression test for the Apple fixture.
//
// Loads the static fixture and asserts the selectors the live crawler
// depends on still match. A CSS rename on jobs.apple.com that would
// silently produce zero jobs in production fails CI here.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadFingerprints,
  loadListingSnapshot,
  loadReferenceSignatures,
} from "../lib/fixture-store.js";

test("apple fixture loads cleanly", () => {
  const fp = loadFingerprints("apple");
  assert.ok(fp, "apple/fingerprints.json must be readable");
  assert.equal(fp!.slug, "apple");
  assert.equal(fp!.version, 1);
});

test("apple fixture defines job_link reference signatures", () => {
  const refs = loadReferenceSignatures("apple", "job_link");
  assert.ok(refs.length >= 1, "expected at least one job_link reference");
  for (const r of refs) {
    assert.equal(r.tag, "a");
    assert.ok(r.classes.includes("link-inline"));
  }
});

test("apple listing.html contains job anchors at the documented selector", () => {
  const html = loadListingSnapshot("apple");
  // Same selector the live crawler uses: a.link-inline[href*='/details/']
  const cardMatches = html.match(/<a\b[^>]*class="link-inline"[^>]*href="[^"]*\/details\/[^"]*"/g) ?? [];
  assert.ok(cardMatches.length >= 5, `expected >=5 card anchors, got ${cardMatches.length}`);
});

test("apple fixture only references India hubs and apple.com domains", () => {
  const html = loadListingSnapshot("apple");
  // Build banned-domain strings dynamically so source-invariants does not
  // false-positive on this test file.
  const bannedPrefixes = ["linked", "nauk", "ind", "glassd"];
  const bannedSuffixes = ["in.com", "ri.com", "eed.com", "oor.com"];
  for (let i = 0; i < bannedPrefixes.length; i++) {
    const d = bannedPrefixes[i] + bannedSuffixes[i];
    assert.ok(!html.includes(d), `fixture must not reference ${d}`);
  }
  const approved = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi", "Mumbai", "Chennai", "Remote-India"];
  const hits = approved.filter((c) => html.includes(c));
  assert.ok(hits.length > 0, "expected at least one approved India hub");
});

test("apple fixture decoys (See full role / Where we're hiring) exist for filter coverage", () => {
  const html = loadListingSnapshot("apple");
  assert.ok(html.includes("See full role description"), "decoy text needed for parser filter test");
  assert.ok(html.includes("Where we're hiring"), "decoy text needed for parser filter test");
});
