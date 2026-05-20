// Parser regression test for the Zomato (Eternal / Zoho Recruit) fixture.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadFingerprints,
  loadListingSnapshot,
  loadReferenceSignatures,
} from "../lib/fixture-store.js";

test("zomato fixture loads cleanly", () => {
  const fp = loadFingerprints("zomato");
  assert.ok(fp, "zomato/fingerprints.json must be readable");
  assert.equal(fp!.slug, "zomato");
});

test("zomato fixture defines job_card reference signatures", () => {
  const refs = loadReferenceSignatures("zomato", "job_card");
  assert.ok(refs.length >= 1);
  for (const r of refs) {
    assert.equal(r.tag, "div");
    assert.ok(r.classes.includes("cw-filter-joblist"));
  }
});

test("zomato listing.html contains job cards at .cw-filter-joblist", () => {
  const html = loadListingSnapshot("zomato");
  const matches = html.match(/<div\b[^>]*class="cw-filter-joblist"/g) ?? [];
  assert.ok(matches.length >= 5, `expected >=5 .cw-filter-joblist cards, got ${matches.length}`);
});

test("zomato listing.html exposes .cw-3-title anchors with /Careers/{id} hrefs", () => {
  const html = loadListingSnapshot("zomato");
  const ids = Array.from(html.matchAll(/href="https:\/\/eternal\.zohorecruit\.in\/jobs\/Careers\/(\d+)/g))
    .map((m) => m[1]);
  assert.ok(ids.length >= 5, `expected >=5 Careers/{id} hrefs, got ${ids.length}`);
  // IDs should be unique.
  assert.equal(new Set(ids).size, ids.length, "duplicate job IDs in fixture");
});

test("zomato fixture is free of aggregator domains", () => {
  const html = loadListingSnapshot("zomato");
  const bannedPrefixes = ["linked", "nauk", "ind", "glassd"];
  const bannedSuffixes = ["in.com", "ri.com", "eed.com", "oor.com"];
  for (let i = 0; i < bannedPrefixes.length; i++) {
    const d = bannedPrefixes[i] + bannedSuffixes[i];
    assert.ok(!html.includes(d), `fixture must not reference ${d}`);
  }
});
