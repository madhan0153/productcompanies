// Unit tests for the admin overview "Pulse" sparkline series.
// Runs under: tsx --test apps/web/__tests__/admin/pulse.test.ts
//
// Guards the core audit invariant: the sparkline is built ONLY from real
// quality-scored jobs and NEVER fabricates a trend when data is absent.

import { test } from "node:test";
import assert from "node:assert/strict";
import { qualityPulse } from "../../lib/admin/pulse";

test("empty input yields an empty series — no fabricated trend", () => {
  assert.deepEqual(qualityPulse([]), []);
  assert.deepEqual(qualityPulse(null), []);
  assert.deepEqual(qualityPulse(undefined), []);
});

test("real scores are passed through, rounded to integers", () => {
  assert.deepEqual(
    qualityPulse([{ quality_score: 70.4 }, { quality_score: 82.6 }, { quality_score: 55 }]),
    [70, 83, 55],
  );
});

test("null / non-finite scores are dropped, not coerced to misleading zeros", () => {
  assert.deepEqual(
    qualityPulse([
      { quality_score: 60 },
      { quality_score: null },
      { quality_score: Number.NaN },
      { quality_score: 90 },
    ]),
    [60, 90],
  );
});

test("does not return the old hardcoded placeholder trend", () => {
  const fabricated = [30, 44, 40, 55, 62, 58, 70, 72, 68, 76];
  assert.notDeepEqual(qualityPulse([]), fabricated);
});
