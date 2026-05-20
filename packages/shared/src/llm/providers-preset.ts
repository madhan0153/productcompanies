// Hardcoded OpenAI-compatible provider presets.
//
// The ProdMatch LLM router auto-includes any preset whose `keysEnvVar` is set,
// so the operator only ever configures **API keys** in env vars — never URLs,
// model names, or capability flags. When a provider's first model rate-limits
// or 429s, the router tries the next model in that provider's cascade (each
// model has its own quota counter at most providers), then rolls to the next
// provider in `PROVIDER_PRESETS` order.
//
// Free-tier expectations (as of 2026-05; verify against each provider's
// dashboard if quotas matter to your run):
//
//   groq        OpenAI /v1, very fast, ~14k RPD on Llama 3.3-70B, no embeddings.
//   openrouter  OpenAI /v1, ":free" model suffix routes through their hosted
//                free pool. Lower RPD but covers fallback for Groq.
//   cerebras    OpenAI /v1, very fast Llama-3 inference, free dev tier.
//   together    OpenAI /v1, monthly free credits, also offers embeddings.
//   freellmapi  Self-hosted proxy. Picked up only when its env keys are set.
//
// Adding a new provider:
//   1. Append an entry below.
//   2. Set its `keysEnvVar` to a unique name (e.g. `MYPROVIDER_API_KEY`).
//   3. The operator sets that env var on Vercel — done. No URL or model env
//      vars needed.

export interface ProviderPreset {
  id: string;
  /** Human-friendly label for the AI Ops UI. */
  label: string;
  baseUrl: string;
  /** Env var name holding comma-separated API keys for this provider. */
  keysEnvVar: string;
  /**
   * Text-generation models in fallback order. Each (model x key) pair has
   * its own dead-key tracker entry, so cascading buys both:
   *   - independent quota counters per model
   *   - graceful recovery if a single model is removed by the upstream.
   */
  textModels: string[];
  /** Embedding model, or null if the provider doesn't offer one. */
  embeddingModel: string | null;
  /** Provider supports OpenAI's `response_format: { type: "json_object" }`. */
  supportsJson: boolean;
  /**
   * Provider accepts PDF as `inline_data` in chat messages. Almost no free
   * provider does this today. Resume PDF parsing therefore still prefers
   * Gemini; when Gemini fails the resume features fall back through the
   * deterministic path or, if you've opted in, the *text-only* path.
   */
  supportsPdf: boolean;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keysEnvVar: "GROQ_API_KEY",
    textModels: [
      // Highest-quality first; fallbacks favour latency over IQ since they
      // only fire when a daily limit is hit.
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "gemma2-9b-it",
      "mixtral-8x7b-32768",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keysEnvVar: "OPENROUTER_API_KEY",
    textModels: [
      // ":free" suffix routes through OpenRouter's hosted free pool.
      "meta-llama/llama-3.3-70b-instruct:free",
      "google/gemini-2.0-flash-exp:free",
      "deepseek/deepseek-chat-v3-0324:free",
      "qwen/qwen-2.5-72b-instruct:free",
      "nvidia/llama-3.1-nemotron-70b-instruct:free",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "cerebras",
    label: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    keysEnvVar: "CEREBRAS_API_KEY",
    textModels: [
      "llama-3.3-70b",
      "llama-3.1-8b",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "together",
    label: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    keysEnvVar: "TOGETHER_API_KEY",
    textModels: [
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    ],
    // Together provides an OpenAI-compatible /v1/embeddings endpoint.
    embeddingModel: "togethercomputer/m2-bert-80M-32k-retrieval",
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "freellmapi",
    label: "FreeLLMAPI proxy",
    // Self-hosted proxy. Operator must also set FREELLMAPI_BASE_URL when
    // they run their own instance — see resolvePresetBaseUrl().
    baseUrl: "http://localhost:8000/v1",
    keysEnvVar: "FREELLMAPI_API_KEY",
    textModels: ["gpt-3.5-turbo"],
    embeddingModel: "text-embedding-3-small",
    supportsJson: true,
    supportsPdf: false,
  },
];

/**
 * Allow operators to override the baseUrl for a preset via env var. This is
 * useful for FreeLLMAPI (self-hosted) but also for ops running a private
 * mirror of Together / OpenRouter behind a firewall.
 *
 * Env var name: <PROVIDER_ID_UPPERCASE>_BASE_URL  (e.g. `FREELLMAPI_BASE_URL`).
 */
export function resolvePresetBaseUrl(preset: ProviderPreset): string {
  const envKey = `${preset.id.toUpperCase()}_BASE_URL`;
  return (process.env[envKey] ?? preset.baseUrl).replace(/\/+$/, "");
}

export function readPresetKeys(preset: ProviderPreset): string[] {
  const raw = process.env[preset.keysEnvVar] ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}
