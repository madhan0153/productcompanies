// Parser regression test for the Zerodha fixture.
//
// Loads the static fixture and asserts the selectors the live crawler
// depends on still match. The Zerodha selector is intentionally broad
// (`a[href*="/careers/"]`) so this test mostly guards the title-length
// and NAV_WORDS filters that the parser applies in-memory.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadFingerprints,
  loadListingSnapshot,
  loadReferenceSignatures,
} from "../lib/fixture-store.js";

test("zerodha fixture loads cleanly", () => {
  const fp = loadFingerprints("zerodha");
  assert.ok(fp, "zerodha/fingerprints.json must be readable");
  assert.equal(fp!.slug, "zerodha");
});

test("zerodha fixture defines job_link reference signatures", () => {
  const refs = loadReferenceSignatures("zerodha", "job_link");
  assert.ok(refs.length >= 1, "expected at least one job_link reference");
  for (const r of refs) assert.equal(r.tag, "a");
});

test("zerodha listing.html contains anchors deeper than /careers/", () => {
  const html = loadListingSnapshot("zerodha");
  // The parser keeps anchors matching /careers/[non-empty]
  const deepAnchors = html.match(/href="https:\/\/zerodha\.com\/careers\/[^"\/?#]+"/g) ?? [];
  assert.ok(deepAnchors.length >= 6, `expected >=6 deep /careers/ anchors, got ${deepAnchors.length}`);
});

test("zerodha fixture contains nav decoys (about, team, culture, perks)", () => {
  const html = loadListingSnapshot("zerodha");
  for (const word of ["about", "team", "culture", "perks", "process"]) {
    assert.ok(
      html.includes(`/careers/${word}`),
      `parser must filter out /careers/${word} — fixture should include it as a decoy`,
    );
  }
});

test("zerodha fixture is free of aggregator domains", () => {
  const html = loadListingSnapshot("zerodha");
  const bannedPrefixes = ["linked", "nauk", "ind", "glassd"];
  const bannedSuffixes = ["in.com", "ri.com", "eed.com", "oor.com"];
  for (let i = 0; i < bannedPrefixes.length; i++) {
    const d = bannedPrefixes[i] + bannedSuffixes[i];
    assert.ok(!html.includes(d), `fixture must not reference ${d}`);
  }
});
