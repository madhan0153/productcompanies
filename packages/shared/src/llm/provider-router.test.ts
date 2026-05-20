import test from "node:test";
import assert from "node:assert/strict";
import {
  deterministicEmbedding,
  LLM_OPERATION_POLICIES,
  mayUseFreeProviderByDefault,
} from "../index";

test("deterministic embeddings are stable and cosine-safe", () => {
  const a = deterministicEmbedding("backend java kafka postgres");
  const b = deterministicEmbedding("backend java kafka postgres");
  const c = deterministicEmbedding("frontend react css");

  assert.equal(a.length, 768);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("free providers are allowed by default only for public JD operations", () => {
  for (const policy of Object.values(LLM_OPERATION_POLICIES)) {
    if (policy.freeProviderDefault === "allowed") {
      assert.equal(policy.sensitivity, "public_jd", policy.id);
    }
  }

  assert.equal(mayUseFreeProviderByDefault("jd_parse"), true);
  assert.equal(mayUseFreeProviderByDefault("resume_pdf_parse"), false);
});
