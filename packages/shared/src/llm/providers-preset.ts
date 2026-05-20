// Hardcoded OpenAI-compatible provider presets.
//
// The ProdMatch LLM router auto-includes any preset whose `keysEnvVar` is set
// (and whose `requiredEnvVars`, if any, are also set), so the operator only
// ever configures **API keys** in env vars — never URLs, model names, or
// capability flags. When a provider's first model rate-limits or 429s, the
// router tries the next model in that provider's cascade (each model has its
// own quota counter at most providers), then rolls to the next provider in
// `PROVIDER_PRESETS` order.
//
// `baseUrl` may contain `${ENV_VAR}` template tokens. Tokens are substituted
// from `process.env` at runtime; a preset is silently skipped when any
// required env var is missing (Cloudflare Workers AI requires both an API
// key AND an account id — it stays idle until both are set).
//
// Adding a new provider:
//   1. Append an entry below.
//   2. Set its `keysEnvVar` to a unique env var name.
//   3. Operator sets that env var on Vercel — done.
//
// Verified OpenAI-compatible providers as of 2026-05. Free-tier rate limits
// shift constantly; check each provider's dashboard for the current numbers.
// The router treats every provider as best-effort and tolerates 429s.

export interface ProviderPreset {
  id: string;
  /** Human-friendly label for the AI Ops UI. */
  label: string;
  /**
   * Base URL of the OpenAI-compatible endpoint. May contain `${ENV_VAR}`
   * template tokens that are substituted from process.env at resolve time.
   */
  baseUrl: string;
  /** Env var name holding comma-separated API keys for this provider. */
  keysEnvVar: string;
  /**
   * Additional env vars that must be present (typically referenced inside
   * baseUrl). Listed here so the AI Ops UI can show what's still missing.
   */
  requiredEnvVars?: string[];
  /**
   * Text-generation models in fallback order. Empty means embeddings-only
   * (Voyage / Jina). Each (model x key) pair has its own dead-key entry.
   */
  textModels: string[];
  /** Embedding model, or null if the provider doesn't offer one. */
  embeddingModel: string | null;
  /** Provider supports OpenAI's `response_format: { type: "json_object" }`. */
  supportsJson: boolean;
  /**
   * Provider accepts PDF as `inline_data` in chat messages. Almost no free
   * provider does this; resume PDF parsing prefers Gemini.
   */
  supportsPdf: boolean;
}

export const PROVIDER_PRESETS: readonly ProviderPreset[] = [
  // ── Fast LPU/wafer-scale providers (lowest latency, generous RPD) ────
  {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    keysEnvVar: "GROQ_API_KEY",
    textModels: [
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
    id: "sambanova",
    label: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    keysEnvVar: "SAMBANOVA_API_KEY",
    textModels: [
      "Meta-Llama-3.3-70B-Instruct",
      "Meta-Llama-3.1-405B-Instruct",
      "Meta-Llama-3.1-70B-Instruct",
      "Meta-Llama-3.1-8B-Instruct",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },

  // ── Cloud GPU providers with free starter credits ────────────────────
  {
    id: "nvidia",
    label: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    keysEnvVar: "NVIDIA_API_KEY",
    textModels: [
      "meta/llama-3.3-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "mistralai/mixtral-8x22b-instruct-v0.1",
      "meta/llama-3.1-8b-instruct",
    ],
    embeddingModel: "nvidia/llama-3.2-nv-embedqa-1b-v2",
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "mistral",
    label: "Mistral AI",
    baseUrl: "https://api.mistral.ai/v1",
    keysEnvVar: "MISTRAL_API_KEY",
    textModels: [
      "mistral-large-latest",
      "mistral-small-latest",
      "open-mixtral-8x22b",
      "open-mixtral-8x7b",
      "open-mistral-7b",
    ],
    embeddingModel: "mistral-embed",
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "fireworks",
    label: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    keysEnvVar: "FIREWORKS_API_KEY",
    textModels: [
      "accounts/fireworks/models/llama-v3p3-70b-instruct",
      "accounts/fireworks/models/mixtral-8x22b-instruct",
      "accounts/fireworks/models/llama-v3p1-8b-instruct",
      "accounts/fireworks/models/deepseek-v3",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "deepinfra",
    label: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    keysEnvVar: "DEEPINFRA_API_KEY",
    textModels: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "mistralai/Mixtral-8x22B-Instruct-v0.1",
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
    ],
    embeddingModel: "BAAI/bge-large-en-v1.5",
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
    embeddingModel: "togethercomputer/m2-bert-80M-32k-retrieval",
    supportsJson: true,
    supportsPdf: false,
  },

  // ── Broad-net aggregators + free-tier text providers ─────────────────
  {
    id: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    keysEnvVar: "OPENROUTER_API_KEY",
    textModels: [
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
    id: "cloudflare",
    label: "Cloudflare Workers AI",
    // The account ID is part of the URL path — substituted at runtime.
    // If CLOUDFLARE_ACCOUNT_ID is unset the preset stays idle even if a key
    // is provided.
    baseUrl: "https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/v1",
    keysEnvVar: "CLOUDFLARE_API_KEY",
    requiredEnvVars: ["CLOUDFLARE_ACCOUNT_ID"],
    textModels: [
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-3.1-70b-instruct",
      "@cf/meta/llama-3.1-8b-instruct",
      "@cf/mistral/mistral-7b-instruct-v0.1",
    ],
    embeddingModel: "@cf/baai/bge-large-en-v1.5",
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "github-models",
    label: "GitHub Models",
    // GitHub Models exposes an OpenAI-compatible endpoint hosted on Azure.
    // Auth uses a GitHub fine-grained token with `models:read` scope.
    baseUrl: "https://models.inference.ai.azure.com",
    keysEnvVar: "GITHUB_MODELS_API_KEY",
    textModels: [
      "Meta-Llama-3.1-70B-Instruct",
      "Meta-Llama-3.1-8B-Instruct",
      "Phi-3.5-mini-instruct",
      "gpt-4o-mini",
    ],
    embeddingModel: "text-embedding-3-small",
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "huggingface",
    label: "Hugging Face Router",
    baseUrl: "https://router.huggingface.co/v1",
    keysEnvVar: "HF_API_KEY",
    textModels: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "deepseek-ai/DeepSeek-V3",
      "mistralai/Mistral-Nemo-Instruct-2407",
    ],
    embeddingModel: null,
    supportsJson: true,
    supportsPdf: false,
  },
  {
    id: "cohere",
    label: "Cohere",
    baseUrl: "https://api.cohere.ai/compatibility/v1",
    keysEnvVar: "COHERE_API_KEY",
    textModels: [
      "command-r-plus",
      "command-r",
      "command",
      "command-light",
    ],
    embeddingModel: "embed-english-v3.0",
    supportsJson: true,
    supportsPdf: false,
  },

  // ── Dedicated embedding providers (textModels: []) ───────────────────
  {
    id: "voyage",
    label: "Voyage AI (embeddings)",
    baseUrl: "https://api.voyageai.com/v1",
    keysEnvVar: "VOYAGE_API_KEY",
    textModels: [],
    embeddingModel: "voyage-3-lite",
    supportsJson: false,
    supportsPdf: false,
  },
  {
    id: "jina",
    label: "Jina AI (embeddings)",
    baseUrl: "https://api.jina.ai/v1",
    keysEnvVar: "JINA_API_KEY",
    textModels: [],
    embeddingModel: "jina-embeddings-v3",
    supportsJson: false,
    supportsPdf: false,
  },

  // ── Self-hosted fallback (must run your own proxy) ───────────────────
  {
    id: "freellmapi",
    label: "FreeLLMAPI proxy",
    baseUrl: "${FREELLMAPI_BASE_URL}",
    keysEnvVar: "FREELLMAPI_API_KEY",
    requiredEnvVars: ["FREELLMAPI_BASE_URL"],
    textModels: ["gpt-3.5-turbo"],
    embeddingModel: "text-embedding-3-small",
    supportsJson: true,
    supportsPdf: false,
  },
];

const TEMPLATE_TOKEN_RE = /\$\{([A-Z0-9_]+)\}/g;

/**
 * Resolve the runtime baseUrl for a preset. Supports:
 *   - `${ENV_VAR}` substitution within the baseUrl
 *   - per-preset baseUrl override via `<PROVIDER_ID_UPPERCASE>_BASE_URL`
 * Returns null when any referenced env var is unset — caller skips this
 * preset rather than firing a request to a malformed URL.
 */
export function resolvePresetBaseUrl(preset: ProviderPreset): string | null {
  const overrideKey = `${preset.id.toUpperCase().replace(/-/g, "_")}_BASE_URL`;
  let url = process.env[overrideKey] ?? preset.baseUrl;

  // Substitute every ${ENV_VAR} token. If any required token is missing,
  // the preset cannot be activated yet — return null.
  let missing = false;
  url = url.replace(TEMPLATE_TOKEN_RE, (_, name: string) => {
    const value = process.env[name];
    if (value == null || value.trim() === "") {
      missing = true;
      return "";
    }
    return value.trim();
  });
  if (missing) return null;

  return url.replace(/\/+$/, "");
}

export function readPresetKeys(preset: ProviderPreset): string[] {
  const raw = process.env[preset.keysEnvVar] ?? "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

/** Names of every env var an operator must set to activate this preset. */
export function presetRequiredEnvVars(preset: ProviderPreset): string[] {
  return [preset.keysEnvVar, ...(preset.requiredEnvVars ?? [])];
}
