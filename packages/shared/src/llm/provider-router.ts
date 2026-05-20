// Privacy-aware OpenAI-compatible provider router.
//
// All baseUrls, model cascades and capabilities are hardcoded in
// `providers-preset.ts`. The operator configures **only API keys** in env.
// A preset is auto-included whenever its `keysEnvVar` is set; the router
// then rolls through (provider × model × key) combinations on rate-limit /
// quota / unsupported errors and remembers dead combos process-wide.
//
// Single kill-switch:
//   LLM_FORCE_BLOCK_FREE_PROVIDERS=true   blocks the entire chain regardless
//                                          of operation policy. Use this if
//                                          you ever need an emergency stop
//                                          on third-party LLM usage.

import {
  getLlmOperationPolicy,
  LLM_OPERATION_POLICIES,
  type LlmCapability,
  type LlmOperationId,
  type LlmSensitivity,
} from "./operations";
import {
  PROVIDER_PRESETS,
  readPresetKeys,
  resolvePresetBaseUrl,
  type ProviderPreset,
} from "./providers-preset";

interface ProviderConfig {
  id: string;
  label: string;
  baseUrl: string;
  apiKeys: string[];
  textModels: string[];
  embeddingModel: string | null;
  supportsJson: boolean;
  supportsPdf: boolean;
}

interface GeminiLikePart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiLikeContent {
  role?: string;
  parts?: GeminiLikePart[];
}

interface GeminiLikeGenerateRequest {
  contents?: GeminiLikeContent[];
  systemInstruction?: { parts?: GeminiLikePart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
  };
}

type ProviderFailureKind = "auth" | "rate_limited" | "quota" | "unsupported" | "unknown";

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: unknown } }>;
}

interface OpenAiEmbeddingResponse {
  data?: Array<{ embedding?: unknown }>;
}

// Dead (provider × model × key × capability) combos. Reset on process exit;
// Vercel's per-invocation memory keeps this small.
const deadUntil = new Map<string, number>();
const loggedProviderStates = new Set<string>();

function envBool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

function maskKey(key: string): string {
  if (key.length <= 6) return "***";
  return `...${key.slice(-6)}`;
}

function deadComboKey(providerId: string, model: string, keyIdx: number, capability: LlmCapability): string {
  return `${providerId}|${capability}|${model}|${keyIdx}`;
}

function isDead(key: string): boolean {
  const until = deadUntil.get(key);
  if (!until) return false;
  if (until <= Date.now()) {
    deadUntil.delete(key);
    return false;
  }
  return true;
}

function markDead(key: string, ms: number): void {
  deadUntil.set(key, Date.now() + ms);
}

function classifyProviderFailure(status: number, body: string): ProviderFailureKind {
  if (status === 401 || status === 403 || /invalid.*key|unauthorized|forbidden|permission/i.test(body)) return "auth";
  if (status === 402 || /quota|insufficient.*credits|exhausted|daily.*limit/i.test(body)) return "quota";
  if (status === 408 || status === 409 || status === 425 || status === 429) return "rate_limited";
  if (status === 400 || status === 404 || /model.*not.*found|unsupported|not supported/i.test(body)) return "unsupported";
  return "unknown";
}

function logProviderStateOnce(key: string, message: string): void {
  if (loggedProviderStates.has(key)) return;
  loggedProviderStates.add(key);
  // eslint-disable-next-line no-console
  console.log(message);
}

export function resetLlmProviderRuntimeState(): void {
  deadUntil.clear();
  loggedProviderStates.clear();
}

/** Convert a preset to a runtime ProviderConfig if its env keys are set. */
function presetToConfig(preset: ProviderPreset): ProviderConfig | null {
  const apiKeys = readPresetKeys(preset);
  if (apiKeys.length === 0) return null;
  return {
    id: preset.id,
    label: preset.label,
    baseUrl: resolvePresetBaseUrl(preset),
    apiKeys,
    textModels: [...preset.textModels],
    embeddingModel: preset.embeddingModel,
    supportsJson: preset.supportsJson,
    supportsPdf: preset.supportsPdf,
  };
}

/**
 * All providers eligible for this run. The kill-switch
 * `LLM_FORCE_BLOCK_FREE_PROVIDERS=true` short-circuits the whole chain.
 */
export function getConfiguredOpenAiProviders(): ProviderConfig[] {
  if (envBool("LLM_FORCE_BLOCK_FREE_PROVIDERS", false)) return [];
  return PROVIDER_PRESETS
    .map(presetToConfig)
    .filter((p): p is ProviderConfig => p !== null);
}

/**
 * Per-operation policy gate. Every operation defaults to "allowed" (see
 * /specs/prodmatch-constitution.md). The `requires_opt_in` and `blocked`
 * branches are kept for future granular control but are not exercised by
 * the current policy set.
 */
function operationAllowsExternalProvider(operation: LlmOperationId): boolean {
  const policy = getLlmOperationPolicy(operation);
  if (policy.freeProviderDefault === "blocked") return false;
  if (policy.freeProviderDefault === "requires_opt_in") {
    // Backwards-compatible env opt-in still works for ops who later flip
    // their policy back to `requires_opt_in` in operations.ts.
    if (policy.sensitivity === "resume_pii") return envBool("LLM_ALLOW_FREE_PROVIDER_RESUME_PII", false);
    if (policy.sensitivity === "derived_resume_facts") return envBool("LLM_ALLOW_FREE_PROVIDER_DERIVED_RESUME", false);
    return false;
  }
  return true; // "allowed"
}

function providersFor(operation: LlmOperationId, capability: LlmCapability): ProviderConfig[] {
  if (!operationAllowsExternalProvider(operation)) return [];
  return getConfiguredOpenAiProviders().filter((p) => {
    if (capability === "embedding") return Boolean(p.embeddingModel);
    if (capability === "pdf_json") return p.textModels.length > 0 && p.supportsPdf;
    return p.textModels.length > 0;
  });
}

function extractTextAndFiles(request: GeminiLikeGenerateRequest): {
  system: string;
  userText: string;
  files: Array<{ mimeType: string; data: string }>;
} {
  const system = (request.systemInstruction?.parts ?? [])
    .map((p) => p.text ?? "")
    .filter(Boolean)
    .join("\n");

  const textParts: string[] = [];
  const files: Array<{ mimeType: string; data: string }> = [];
  for (const content of request.contents ?? []) {
    for (const part of content.parts ?? []) {
      if (part.text) textParts.push(part.text);
      if (part.inlineData?.data) {
        files.push({
          mimeType: part.inlineData.mimeType ?? "application/octet-stream",
          data: part.inlineData.data,
        });
      }
    }
  }
  return { system, userText: textParts.join("\n\n"), files };
}

function buildOpenAiMessages(args: {
  system: string;
  userText: string;
  files: Array<{ mimeType: string; data: string }>;
  includeFiles: boolean;
}): Array<{ role: "system" | "user"; content: unknown }> {
  const messages: Array<{ role: "system" | "user"; content: unknown }> = [];
  if (args.system) messages.push({ role: "system", content: args.system });
  if (args.files.length > 0 && args.includeFiles) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: args.userText },
        ...args.files.map((f) => ({
          type: "file",
          file: {
            filename: f.mimeType === "application/pdf" ? "resume.pdf" : "input.bin",
            file_data: `data:${f.mimeType};base64,${f.data}`,
          },
        })),
      ],
    });
  } else {
    messages.push({ role: "user", content: args.userText });
  }
  return messages;
}

async function postJson(url: string, apiKey: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    err.name = String(res.status);
    throw err;
  }
  return JSON.parse(text) as unknown;
}

function getStatus(err: unknown): number {
  if (err instanceof Error && /^\d+$/.test(err.name)) return Number(err.name);
  return 0;
}

function getErrorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export function createExternalGenerativeModel(operation: LlmOperationId): {
  generateContent(request: GeminiLikeGenerateRequest): Promise<{ response: { text(): string } }>;
} {
  return {
    async generateContent(request: GeminiLikeGenerateRequest) {
      const text = await runOpenAiCompatibleJson(operation, request);
      return { response: { text: () => text } };
    },
  };
}

/**
 * Try every (provider × textModel × key) combination until one succeeds.
 *   - auth / quota errors → mark combo dead for 24h.
 *   - rate-limited        → mark combo dead for 60s.
 *   - unsupported         → mark combo dead for 6h.
 * Skips already-dead combos in O(1). Logs at most one diagnostic line per
 * (combo × outcome) per process.
 */
export async function runOpenAiCompatibleJson(
  operation: LlmOperationId,
  request: GeminiLikeGenerateRequest,
): Promise<string> {
  const policy = getLlmOperationPolicy(operation);
  const providers = providersFor(operation, policy.capability);
  if (providers.length === 0) {
    throw new Error(`No external provider configured or allowed for ${operation}`);
  }

  const { system, userText, files } = extractTextAndFiles(request);
  let lastError: unknown = null;

  for (const provider of providers) {
    if (files.length > 0 && !provider.supportsPdf) continue;

    // Inner cascade: try each model in this provider, then each key against
    // that model. A 429 on (model A × key 0) doesn't preclude (model B × key 0)
    // because each pinned model has its own quota counter at most providers.
    for (const model of provider.textModels) {
      for (let keyIdx = 0; keyIdx < provider.apiKeys.length; keyIdx++) {
        const key = provider.apiKeys[keyIdx];
        const deadKey = deadComboKey(provider.id, model, keyIdx, policy.capability);
        if (isDead(deadKey)) continue;

        try {
          const json = await postJson(`${provider.baseUrl}/chat/completions`, key, {
            model,
            messages: buildOpenAiMessages({
              system,
              userText,
              files,
              includeFiles: provider.supportsPdf,
            }),
            temperature: request.generationConfig?.temperature ?? 0.2,
            max_tokens: request.generationConfig?.maxOutputTokens,
            ...(provider.supportsJson && request.generationConfig?.responseMimeType === "application/json"
              ? { response_format: { type: "json_object" } }
              : {}),
          });
          const content = (json as OpenAiChatResponse).choices?.[0]?.message?.content;
          if (typeof content !== "string" || content.trim().length === 0) {
            throw new Error("External provider returned empty content");
          }
          logProviderStateOnce(
            `${provider.id}|${model}|${keyIdx}|ok`,
            `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) model=${model} first call ok`,
          );
          return content;
        } catch (err) {
          lastError = err;
          const status = getStatus(err);
          const raw = getErrorText(err);
          const kind = classifyProviderFailure(status, raw);
          const logKey = `${provider.id}|${model}|${keyIdx}|${kind}`;
          if (kind === "auth") {
            markDead(deadKey, 24 * 60 * 60_000);
            logProviderStateOnce(logKey, `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) disabled for auth`);
          } else if (kind === "quota") {
            markDead(deadKey, 24 * 60 * 60_000);
            logProviderStateOnce(logKey, `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) exhausted for ${model}`);
          } else if (kind === "rate_limited") {
            markDead(deadKey, 60_000);
          } else if (kind === "unsupported") {
            markDead(deadKey, 6 * 60 * 60_000);
            logProviderStateOnce(logKey, `[llm-provider] ${provider.id} model ${model} unsupported for ${operation}`);
          }
        }
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`All external providers failed for ${operation}`);
}

export async function runOpenAiCompatibleEmbedding(
  operation: Extract<LlmOperationId, "job_embedding" | "resume_embedding">,
  texts: string[],
): Promise<number[][] | null> {
  const providers = providersFor(operation, "embedding");
  if (providers.length === 0) return null;

  let lastError: unknown = null;
  for (const provider of providers) {
    if (!provider.embeddingModel) continue;

    for (let keyIdx = 0; keyIdx < provider.apiKeys.length; keyIdx++) {
      const key = provider.apiKeys[keyIdx];
      const deadKey = deadComboKey(provider.id, provider.embeddingModel, keyIdx, "embedding");
      if (isDead(deadKey)) continue;

      try {
        const json = await postJson(`${provider.baseUrl}/embeddings`, key, {
          model: provider.embeddingModel,
          input: texts,
        });
        const vectors = ((json as OpenAiEmbeddingResponse).data ?? [])
          .map((item) => item.embedding)
          .filter((v: unknown): v is number[] => Array.isArray(v));
        if (vectors.length !== texts.length) throw new Error("Embedding count mismatch");
        logProviderStateOnce(
          `${provider.id}|${provider.embeddingModel}|${keyIdx}|embedding-ok`,
          `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) embedding model=${provider.embeddingModel} first call ok`,
        );
        return vectors;
      } catch (err) {
        lastError = err;
        const status = getStatus(err);
        const raw = getErrorText(err);
        const kind = classifyProviderFailure(status, raw);
        if (kind === "auth" || kind === "quota") markDead(deadKey, 24 * 60 * 60_000);
        else if (kind === "rate_limited") markDead(deadKey, 60_000);
        else if (kind === "unsupported") markDead(deadKey, 6 * 60 * 60_000);
      }
    }
  }

  if (lastError) return null;
  return null;
}

export function shouldUseDeterministicFallback(): boolean {
  return envBool("LLM_ENABLE_DETERMINISTIC_FALLBACKS", true);
}

export function describeLlmRuntime(): {
  providers: Array<{
    id: string;
    label: string;
    baseUrl: string;
    keyCount: number;
    textModels: string[];
    embeddingModel: string | null;
    supportsPdf: boolean;
    keysEnvVar: string;
  }>;
  presets: Array<{
    id: string;
    label: string;
    keysEnvVar: string;
    configured: boolean;
  }>;
  operations: Array<{
    id: string;
    label: string;
    capability: LlmCapability;
    sensitivity: LlmSensitivity;
    externalFallback: "allowed" | "opt_in_required" | "blocked_or_unconfigured";
    deterministicFallback: string;
  }>;
} {
  const configured = new Set(getConfiguredOpenAiProviders().map((p) => p.id));
  const providers = PROVIDER_PRESETS
    .filter((p) => configured.has(p.id))
    .map((preset) => {
      const cfg = presetToConfig(preset)!;
      return {
        id: cfg.id,
        label: cfg.label,
        baseUrl: cfg.baseUrl,
        keyCount: cfg.apiKeys.length,
        textModels: cfg.textModels,
        embeddingModel: cfg.embeddingModel,
        supportsPdf: cfg.supportsPdf,
        keysEnvVar: preset.keysEnvVar,
      };
    });

  return {
    providers,
    presets: PROVIDER_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      keysEnvVar: p.keysEnvVar,
      configured: configured.has(p.id),
    })),
    operations: Object.values(LLM_OPERATION_POLICIES).map((policy) => ({
      id: policy.id,
      label: policy.label,
      capability: policy.capability,
      sensitivity: policy.sensitivity,
      externalFallback: providersFor(policy.id, policy.capability).length > 0
        ? "allowed"
        : policy.freeProviderDefault === "requires_opt_in"
          ? "opt_in_required"
          : "blocked_or_unconfigured",
      deterministicFallback: policy.deterministicFallback,
    })),
  };
}
