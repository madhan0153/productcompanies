import test from "node:test";
import assert from "node:assert/strict";
import {
  deterministicEmbedding,
  LLM_OPERATION_POLICIES,
  mayUseFreeProviderByDefault,
  PROVIDER_PRESETS,
  getConfiguredOpenAiProviders,
  describeLlmRuntime,
  resolvePresetBaseUrl,
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

  assert.equal(mayUseFreeProviderByDefault("jd_parse"), true);
  assert.equal(mayUseFreeProviderByDefault("resume_pdf_parse"), true);
  assert.equal(mayUseFreeProviderByDefault("fit_card"), true);
  assert.equal(mayUseFreeProviderByDefault("tailored_resume"), true);
});

test("PROVIDER_PRESETS includes every documented free provider", () => {
  const ids = PROVIDER_PRESETS.map((p) => p.id);
  // Snapshot test — adding a provider should be an intentional change.
  assert.deepEqual(ids, [
    "groq",
    "cerebras",
    "sambanova",
    "nvidia",
    "mistral",
    "fireworks",
    "deepinfra",
    "together",
    "openrouter",
    "cloudflare",
    "github-models",
    "huggingface",
    "cohere",
    "voyage",
    "jina",
    "freellmapi",
  ]);
});

test("each preset declares either text models or an embedding model + key env var", () => {
  for (const p of PROVIDER_PRESETS) {
    assert.ok(p.keysEnvVar.length > 0, `${p.id} must declare a keysEnvVar`);
    assert.ok(
      p.textModels.length > 0 || p.embeddingModel !== null,
      `${p.id} must declare at least one text model or an embedding model`,
    );
    // baseUrl may contain ${ENV_VAR} tokens; without substitution it must
    // still be an http(s)-shaped string.
    assert.ok(
      p.baseUrl.startsWith("http") || p.baseUrl.startsWith("${"),
      `${p.id} baseUrl must be absolute or templated`,
    );
  }
});

function clearProviderEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const p of PROVIDER_PRESETS) {
    saved[p.keysEnvVar] = process.env[p.keysEnvVar];
    delete process.env[p.keysEnvVar];
    for (const v of p.requiredEnvVars ?? []) {
      saved[v] = process.env[v];
      delete process.env[v];
    }
  }
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

test("provider auto-detection: zero configured when no env keys are set", (t) => {
  const saved = clearProviderEnv();
  t.after(() => restoreEnv(saved));

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 0);

  const runtime = describeLlmRuntime();
  assert.equal(runtime.providers.length, 0);
  assert.equal(runtime.presets.length, PROVIDER_PRESETS.length);
  for (const p of runtime.presets) {
    assert.equal(p.state, "idle");
  }
});

test("setting GROQ_API_KEY surfaces Groq with its hardcoded models", (t) => {
  const saved = clearProviderEnv();
  process.env.GROQ_API_KEY = "test-key-1,test-key-2,test-key-3";
  t.after(() => restoreEnv(saved));

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 1);
  assert.equal(configured[0].id, "groq");
  assert.equal(configured[0].apiKeys.length, 3);
  assert.ok(configured[0].textModels.includes("llama-3.3-70b-versatile"));
  assert.equal(configured[0].baseUrl, "https://api.groq.com/openai/v1");
});

test("Cloudflare preset stays partial when key is set but CLOUDFLARE_ACCOUNT_ID is missing", (t) => {
  const saved = clearProviderEnv();
  process.env.CLOUDFLARE_API_KEY = "cf-key";
  t.after(() => restoreEnv(saved));

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 0);

  const runtime = describeLlmRuntime();
  const cf = runtime.presets.find((p) => p.id === "cloudflare")!;
  assert.equal(cf.state, "partial");
  assert.ok(cf.missingEnvVars.includes("CLOUDFLARE_ACCOUNT_ID"));
});

test("Cloudflare preset activates when both CLOUDFLARE_API_KEY and CLOUDFLARE_ACCOUNT_ID are set", (t) => {
  const saved = clearProviderEnv();
  process.env.CLOUDFLARE_API_KEY = "cf-key";
  process.env.CLOUDFLARE_ACCOUNT_ID = "abc123";
  t.after(() => restoreEnv(saved));

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 1);
  assert.equal(configured[0].id, "cloudflare");
  assert.equal(
    configured[0].baseUrl,
    "https://api.cloudflare.com/client/v4/accounts/abc123/ai/v1",
  );
});

test("kill switch LLM_FORCE_BLOCK_FREE_PROVIDERS empties the chain", (t) => {
  const saved = clearProviderEnv();
  const savedKill = process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS;
  process.env.GROQ_API_KEY = "test-key";
  process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS = "true";
  t.after(() => {
    restoreEnv(saved);
    if (savedKill === undefined) delete process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS;
    else process.env.LLM_FORCE_BLOCK_FREE_PROVIDERS = savedKill;
  });

  const configured = getConfiguredOpenAiProviders();
  assert.equal(configured.length, 0);
});

test("embeddings-only providers (Voyage, Jina) carry no text models but a valid embedding model", () => {
  for (const id of ["voyage", "jina"] as const) {
    const preset = PROVIDER_PRESETS.find((p) => p.id === id)!;
    assert.equal(preset.textModels.length, 0, `${id} should be embeddings-only`);
    assert.ok(preset.embeddingModel !== null, `${id} must declare an embedding model`);
  }
});

test("resolvePresetBaseUrl honours overrides via <ID>_BASE_URL", (t) => {
  const saved: Record<string, string | undefined> = {};
  saved.GROQ_BASE_URL = process.env.GROQ_BASE_URL;
  process.env.GROQ_BASE_URL = "https://my-internal-mirror.example.com/v1";
  t.after(() => restoreEnv(saved));

  const groq = PROVIDER_PRESETS.find((p) => p.id === "groq")!;
  assert.equal(resolvePresetBaseUrl(groq), "https://my-internal-mirror.example.com/v1");
});
