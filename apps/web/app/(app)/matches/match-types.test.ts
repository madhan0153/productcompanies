import test from "node:test";
import assert from "node:assert/strict";
import { classifyMatch } from "./match-types";

// Helper to build a minimal match-shaped object.
const m = (overrides: Partial<{ score: number; hidden_reason: string | null; seen_at: string | null }>) => ({
  score: 70,
  hidden_reason: null,
  seen_at: null,
  ...overrides,
});

test("classifyMatch: score >= 60 with no hidden_reason → shortlist", () => {
  assert.equal(classifyMatch(m({ score: 60 })), "shortlist");
  assert.equal(classifyMatch(m({ score: 85 })), "shortlist");
  assert.equal(classifyMatch(m({ score: 100 })), "shortlist");
});

test("classifyMatch: 40 <= score < 60 → worth_a_look", () => {
  assert.equal(classifyMatch(m({ score: 40 })), "worth_a_look");
  assert.equal(classifyMatch(m({ score: 50 })), "worth_a_look");
  assert.equal(classifyMatch(m({ score: 59 })), "worth_a_look");
});

test("classifyMatch: score < 40 → filtered", () => {
  assert.equal(classifyMatch(m({ score: 0 })), null);
  assert.equal(classifyMatch(m({ score: 25 })), null);
  assert.equal(classifyMatch(m({ score: 39 })), null);
});

test("classifyMatch: hidden_reason forces filtered regardless of score", () => {
  assert.equal(classifyMatch(m({ score: 95, hidden_reason: "mismatch" })), null);
  assert.equal(classifyMatch(m({ score: 70, hidden_reason: "role_signal_conflict" })), null);
});

test("classifyMatch: 'evidence_pending' is informational — row stays in its score band", () => {
  // High score + informational reason → shortlist
  assert.equal(classifyMatch(m({ score: 70, hidden_reason: "evidence_pending" })), "shortlist");
  // Mid score + informational reason → worth_a_look
  assert.equal(classifyMatch(m({ score: 45, hidden_reason: "evidence_pending" })), "worth_a_look");
  // Low score + informational reason → still filtered (by score alone)
  assert.equal(classifyMatch(m({ score: 20, hidden_reason: "evidence_pending" })), null);
});
