import test from "node:test";
import assert from "node:assert/strict";
import { computeDnaBenchmark } from "./dna-benchmarks";

test("computeDnaBenchmark returns null for null input", () => {
  assert.equal(computeDnaBenchmark({ dnaScore: null }), null);
});

test("computeDnaBenchmark: high score lands in top buckets", () => {
  const b = computeDnaBenchmark({ dnaScore: 92, roleFunction: "backend", years: 5 });
  assert.ok(b);
  assert.ok(b!.percentile >= 90);
  assert.ok(["top_5", "top_10"].includes(b!.bucket));
  assert.match(b!.label, /Top \d+%/);
  assert.match(b!.label, /backend engineers \(4–7 yrs exp\)/);
});

test("computeDnaBenchmark: mid score lands in top_25 / top_50", () => {
  const b = computeDnaBenchmark({ dnaScore: 65, roleFunction: "frontend", years: 3 });
  assert.ok(b);
  assert.ok(b!.percentile >= 50 && b!.percentile < 90);
  assert.ok(["top_25", "top_50"].includes(b!.bucket));
});

test("computeDnaBenchmark: low score has actionable next-target", () => {
  const b = computeDnaBenchmark({ dnaScore: 30 });
  assert.ok(b);
  assert.ok(b!.percentile < 50);
  assert.ok(b!.nextTarget && b!.nextTarget > 30);
});

test("computeDnaBenchmark: clamps out-of-range scores", () => {
  const hi = computeDnaBenchmark({ dnaScore: 999 });
  const lo = computeDnaBenchmark({ dnaScore: -10 });
  assert.ok(hi);
  assert.ok(lo);
  assert.ok(hi!.percentile <= 100);
  assert.ok(lo!.percentile >= 0);
});

test("computeDnaBenchmark: unknown role function falls back to generic cohort copy", () => {
  const b = computeDnaBenchmark({ dnaScore: 70, roleFunction: "made_up_role" });
  assert.ok(b);
  assert.match(b!.label, /product-co candidates/);
});

test("computeDnaBenchmark: missing years uses 'all experience levels'", () => {
  const b = computeDnaBenchmark({ dnaScore: 70, roleFunction: "backend" });
  assert.ok(b);
  assert.match(b!.label, /all experience levels/);
});

test("computeDnaBenchmark: top_5 has no next target", () => {
  const b = computeDnaBenchmark({ dnaScore: 99 });
  assert.equal(b!.nextTarget, null);
});
