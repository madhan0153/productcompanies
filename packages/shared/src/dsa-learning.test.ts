import test from "node:test";
import assert from "node:assert/strict";
import {
  DSA_PATTERN_ROADMAP,
  getDsaLearningGuide,
  getDsaPatternProgress,
  planDsaReview,
} from "./dsa-learning";
import { DSA_CATALOG, getDsaProblemBySlug } from "./dsa-catalog";

// ── planDsaReview ────────────────────────────────────────────────────────

test("planDsaReview: got_it on first review uses 3-day cadence", () => {
  const out = planDsaReview({ confidence: "got_it", currentRepetitions: 1 });
  assert.equal(out.nextOffsetDays, 3);
  assert.equal(out.nextRepetitions, 2);
});

test("planDsaReview: review on first review uses 2-day cadence", () => {
  const out = planDsaReview({ confidence: "review", currentRepetitions: 1 });
  assert.equal(out.nextOffsetDays, 2);
  assert.equal(out.nextRepetitions, 2);
});

test("planDsaReview: confused on first review uses 1-day cadence", () => {
  const out = planDsaReview({ confidence: "confused", currentRepetitions: 1 });
  assert.equal(out.nextOffsetDays, 1);
  assert.equal(out.nextRepetitions, 2);
});

test("planDsaReview: got_it stretches as repetitions increase", () => {
  // got_it curve: [3, 7, 14, 21, 30]
  assert.equal(planDsaReview({ confidence: "got_it", currentRepetitions: 2 }).nextOffsetDays, 7);
  assert.equal(planDsaReview({ confidence: "got_it", currentRepetitions: 3 }).nextOffsetDays, 14);
  assert.equal(planDsaReview({ confidence: "got_it", currentRepetitions: 4 }).nextOffsetDays, 21);
});

test("planDsaReview: repetitions cap at curve length, do not overflow", () => {
  const out = planDsaReview({ confidence: "got_it", currentRepetitions: 99 });
  assert.equal(out.nextOffsetDays, 30); // last bucket of got_it
  assert.equal(out.nextRepetitions, 5); // capped at curve length
});

test("planDsaReview: zero or negative repetitions are clamped to 1", () => {
  const a = planDsaReview({ confidence: "review", currentRepetitions: 0 });
  const b = planDsaReview({ confidence: "review", currentRepetitions: -3 });
  assert.equal(a.nextOffsetDays, 2);
  assert.equal(b.nextOffsetDays, 2);
});

test("planDsaReview: confused always trails got_it on the same repetition", () => {
  for (let r = 1; r <= 5; r++) {
    const got = planDsaReview({ confidence: "got_it", currentRepetitions: r }).nextOffsetDays;
    const con = planDsaReview({ confidence: "confused", currentRepetitions: r }).nextOffsetDays;
    assert.ok(con < got, `confused@${r}=${con} should be sooner than got_it@${r}=${got}`);
  }
});

// ── getDsaLearningGuide ──────────────────────────────────────────────────

test("getDsaLearningGuide: every catalog problem yields a non-empty guide", () => {
  for (const problem of DSA_CATALOG) {
    const guide = getDsaLearningGuide(problem);
    assert.ok(guide.prompt.length > 0, `${problem.slug} missing prompt`);
    assert.ok(guide.approach.length > 0, `${problem.slug} missing approach`);
    assert.ok(guide.solution.length > 0, `${problem.slug} missing solution`);
    assert.ok(guide.complexity.length > 0, `${problem.slug} missing complexity`);
    assert.ok(guide.estimatedMinutes > 0, `${problem.slug} missing minutes`);
  }
});

test("getDsaLearningGuide: code field is populated when codeByLang.typescript exists", () => {
  const twoSum = getDsaProblemBySlug("two-sum");
  if (!twoSum) {
    // Skip cleanly if the catalog ever drops this slug.
    return;
  }
  const guide = getDsaLearningGuide(twoSum);
  assert.ok(guide.codeByLang?.typescript);
  assert.equal(guide.code, guide.codeByLang.typescript);
});

// ── getDsaPatternProgress ────────────────────────────────────────────────

test("getDsaPatternProgress: empty completion returns 0/total per pattern", () => {
  const rows = getDsaPatternProgress([]);
  for (const row of rows) {
    assert.equal(row.completed, 0);
    assert.ok(row.total > 0);
  }
});

test("getDsaPatternProgress: completed slugs increment the right pattern", () => {
  const twoSum = getDsaProblemBySlug("two-sum");
  if (!twoSum) return;
  const rows = getDsaPatternProgress([twoSum.slug]);
  const arraysHashing = rows.find((r) => r.pattern === twoSum.pattern);
  assert.ok(arraysHashing);
  assert.ok(arraysHashing!.completed >= 1);
});

// ── DSA_PATTERN_ROADMAP ──────────────────────────────────────────────────

test("DSA_PATTERN_ROADMAP: 17 patterns in strictly increasing order", () => {
  assert.equal(DSA_PATTERN_ROADMAP.length, 17);
  for (let i = 1; i < DSA_PATTERN_ROADMAP.length; i++) {
    assert.ok(
      DSA_PATTERN_ROADMAP[i]!.order > DSA_PATTERN_ROADMAP[i - 1]!.order,
      `roadmap order must increase strictly between ${i - 1} and ${i}`,
    );
  }
});
