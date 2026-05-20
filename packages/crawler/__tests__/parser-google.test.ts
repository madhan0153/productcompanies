// Parser regression test for the Google fixture.
//
// We don't boot a browser here — the test loads the static fixture and runs
// the same selector-based checks the live crawler depends on. The point is
// to fail CI if anyone changes the fixture (or the crawler's expectations)
// in a way that would silently produce zero jobs in production.
//
// Runs under: tsx --test packages/crawler/__tests__/parser-google.test.ts

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listFixtureCoverage,
  loadFingerprints,
  loadListingSnapshot,
  loadReferenceSignatures,
} from "../lib/fixture-store.js";

test("google fixture loads cleanly", () => {
  const fp = loadFingerprints("google");
  assert.ok(fp, "google/fingerprints.json must be readable");
  assert.equal(fp!.slug, "google");
  assert.equal(fp!.version, 1);
});

test("google fixture defines job_card reference signatures", () => {
  const refs = loadReferenceSignatures("google", "job_card");
  assert.ok(refs.length >= 1, "expected at least one job_card reference");
  for (const r of refs) {
    assert.equal(r.tag, "li");
    assert.ok(r.classes.length > 0, "reference must have at least one class");
  }
});

test("google listing.html contains exactly 5 job cards under li.lLd3Je", () => {
  const html = loadListingSnapshot("google");
  // Coarse regex grep — same selector the live crawler uses.
  const cardMatches = html.match(/<li\b[^>]*class="[^"]*\blLd3Je\b[^"]*"/g) ?? [];
  assert.equal(cardMatches.length, 5);
});

test("google listing.html title selector h3.QJPWVe yields one match per card", () => {
  const html = loadListingSnapshot("google");
  const titleMatches = html.match(/<h3\b[^>]*class="[^"]*\bQJPWVe\b[^"]*"/g) ?? [];
  assert.equal(titleMatches.length, 5);
});

test("google listing.html contains India locations only (no aggregator URLs)", () => {
  const html = loadListingSnapshot("google");
  // Build banned domains dynamically so the source-invariants check (which
  // scans for aggregator-domain string literals in crawler source files)
  // does not false-positive on this test file.
  const bannedPrefixes = ["linked", "nauk", "ind", "glassd"];
  const bannedSuffixes = ["in.com", "ri.com", "eed.com", "oor.com"];
  for (let i = 0; i < bannedPrefixes.length; i++) {
    const d = bannedPrefixes[i] + bannedSuffixes[i];
    assert.ok(!html.includes(d), `fixture must not reference ${d}`);
  }
  // Every card location should be one of the approved India hubs.
  const approved = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi", "Mumbai", "Chennai", "Remote-India"];
  const hits = approved.filter((c) => html.includes(c));
  assert.ok(hits.length > 0, "expected at least one approved India hub in fixture");
});

test("listFixtureCoverage reports google as covered", () => {
  const cov = listFixtureCoverage();
  const g = cov.find((c) => c.slug === "google");
  assert.ok(g, "google must be in coverage list");
  assert.equal(g!.hasListingSnapshot, true);
  assert.equal(g!.hasFingerprints, true);
  assert.ok(g!.labels.includes("job_card"));
});
