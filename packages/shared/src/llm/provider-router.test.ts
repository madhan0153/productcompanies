import test from "node:test";
import assert from "node:assert/strict";
import {
  deterministicEmbedding,
  LLM_OPERATION_POLICIES,
  mayUseFreeProviderByDefault,
  PROVIDER_PRESETS,
  getConfiguredOpenAiProviders,
  describeLlmRuntime,
} from "../index";

test("deterministic embeddings are stable and cosine-safe", () => {
  const a = deterministicEmbedding("backend java kafka postgres");
  const b = deterministicEmbedding("backend java kafka postgres");
  const c = deterministicEmbedding("frontend react css");

  assert.equal(a.length, 768);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
});

test("every operation defaults to allowed for free provider fallback", () => {
  for (const policy of Object.values(LLM_OPERATION_POLICIES)) {
    assert.equal(
      policy.freeProviderDefault,
      "allowed",
      `${policy.id} should default to allowed under the current product policy`,
    );
  }

  // Sanity check sample operations.
  assert.equal(mayUseFreeProviderByDefault("jd_parse"), true);
  assert.equal(mayUseFreeProviderByDefault("resume_pdf_parse"), true);
  assert.equal(mayUseFreeProviderByDefault("fit_card"), true);
  assert.equal(mayUseFreeProviderByDefault("tailored_resume"), true);
});

test("PROVIDER_PRESETS includes the documented free providers in fallback order", () => {
  const ids = PROVIDER_PRESETS.map((p) => p.id);
  // Order matters: Groq first (fastest free tier), then OpenRouter as the
  // wide-net backup, then Cerebras / Together / FreeLLMAPI.
  assert.deepEqual(ids, ["groq", "openrouter", "cerebras", "together", "freellmapi"]);
});

test("each preset declares at least one text model and a key env var name", () => {
  for (const p of PROVIDER_PRESETS) {
    assert.ok(p.textModels.length > 0, `${p.id} must declare at least one text model`);
    assert.ok(p.keysEnvVar.length > 0, `${p.id} must declare a keysEnvVar`);
    assert.ok(p.baseUrl.startsWith("http"), `${p.id} baseUrl must be absolute`);
  }
});

test("provider auto-detection: zero configured when no env keys are set", (t) => {
  // Snapshot original env values and clear them.
  const saved: Record<string, string | undefined> = {};
  for (const p of PROVIDER_PRESETS) {
    saved[p.keysEnvVar] = process.env[p.keysEnvVar];
    delete process.env[p.keysEnvVar];
  }
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 0);

  const runtime = describeLlmRuntime();
  assert.equal(runtime.providers.length, 0);
  // All presets should still be reported, marked unconfigured.
  assert.equal(runtime.presets.length, PROVIDER_PRESETS.length);
  for (const p of runtime.presets) {
    assert.equal(p.configured, false);
  }
});

test("provider auto-detection: setting GROQ_API_KEY surfaces Groq with its hardcoded models", (t) => {
  const saved: Record<string, string | undefined> = {};
  for (const p of PROVIDER_PRESETS) {
    saved[p.keysEnvVar] = process.env[p.keysEnvVar];
    delete process.env[p.keysEnvVar];
  }
  process.env.GROQ_API_KEY = "test-key-1,test-key-2";
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 1);
  assert.equal(configured[0].id, "groq");
  assert.equal(configured[0].apiKeys.length, 2);
  assert.ok(configured[0].textModels.includes("llama-3.3-70b-versatile"));
  assert.equal(configured[0].baseUrl, "https://api.groq.com/openai/v1");
});

test("kill switch LLM_FORCE_BLOCK_FREE_PROVIDERS empties the chain", (t) => {
  const saved: Record<string, string | undefined> = {};
  for (const p of PROVIDER_PRESETS) {
    saved[p.keysEnvVar] = process.env[p.keysEnvVar];
    delete process.env[p.keysEnvVar];
  }
  const savedKill = process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS;
  process.env.GROQ_API_KEY = "test-key";
  process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS = "true";
  t.after(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    if (savedKill === undefined) delete process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS;
    else process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS = savedKill;
  });

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 0);
});
