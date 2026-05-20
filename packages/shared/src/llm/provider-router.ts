import {
  getLlmOperationPolicy,
  LLM_OPERATION_POLICIES,
  type LlmCapability,
  type LlmOperationId,
  type LlmSensitivity,
} from "./operations";

type ProviderKind = "openai_compatible";

interface ProviderConfig {
  id: string;
  kind: ProviderKind;
  baseUrl: string;
  apiKeys: string[];
  textModel: string | null;
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

const deadUntil = new Map<string, number>();
const loggedProviderStates = new Set<string>();

function envBool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

function splitCsv(raw: string | undefined): string[] {
  return (raw ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

function providerEnvId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
}

function maskKey(key: string): string {
  if (key.length <= 6) return "***";
  return `...${key.slice(-6)}`;
}

function providerDeadKey(providerId: string, model: string, keyIdx: number, capability: LlmCapability): string {
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

export function getConfiguredOpenAiProviders(): ProviderConfig[] {
  const chain = splitCsv(process.env.LLM_PROVIDER_CHAIN);
  const ids = chain.length > 0 ? chain.filter((id) => id.toLowerCase() !== "gemini") : [];

  if (ids.length === 0 && (process.env.FREE_LLM_API_BASE_URL || process.env.FREE_LLM_API_KEYS)) {
    ids.push("freellmapi");
  }

  return ids.map((id) => {
    const envId = providerEnvId(id);
    const fallbackPrefix = id.toLowerCase() === "freellmapi" ? "FREE_LLM_API" : `LLM_PROVIDER_${envId}`;
    const baseUrl = process.env[`LLM_PROVIDER_${envId}_BASE_URL`] ?? process.env[`${fallbackPrefix}_BASE_URL`] ?? "";
    const apiKeys = splitCsv(process.env[`LLM_PROVIDER_${envId}_API_KEYS`] ?? process.env[`${fallbackPrefix}_KEYS`]);
    const textModel = process.env[`LLM_PROVIDER_${envId}_TEXT_MODEL`]
      ?? process.env[`${fallbackPrefix}_MODEL`]
      ?? null;
    const embeddingModel = process.env[`LLM_PROVIDER_${envId}_EMBEDDING_MODEL`]
      ?? process.env[`${fallbackPrefix}_EMBEDDING_MODEL`]
      ?? null;

    return {
      id,
      kind: "openai_compatible" as const,
      baseUrl: baseUrl.replace(/\/+$/, ""),
      apiKeys,
      textModel,
      embeddingModel,
      supportsJson: envBool(`LLM_PROVIDER_${envId}_SUPPORTS_JSON`, true),
      supportsPdf: envBool(`LLM_PROVIDER_${envId}_SUPPORTS_PDF`, false),
    };
  }).filter((p) => p.baseUrl && p.apiKeys.length > 0 && (p.textModel || p.embeddingModel));
}

function operationAllowsExternalProvider(operation: LlmOperationId): boolean {
  const policy = getLlmOperationPolicy(operation);
  if (policy.freeProviderDefault === "allowed") return true;
  if (policy.sensitivity === "resume_pii") return envBool("LLM_ALLOW_FREE_PROVIDER_RESUME_PII", false);
  if (policy.sensitivity === "derived_resume_facts") return envBool("LLM_ALLOW_FREE_PROVIDER_DERIVED_RESUME", false);
  return false;
}

function providersFor(operation: LlmOperationId, capability: LlmCapability): ProviderConfig[] {
  if (!operationAllowsExternalProvider(operation)) return [];
  return getConfiguredOpenAiProviders().filter((p) => {
    if (capability === "embedding") return Boolean(p.embeddingModel);
    if (capability === "pdf_json") return Boolean(p.textModel && p.supportsPdf);
    return Boolean(p.textModel);
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
    if (!provider.textModel) continue;
    if (files.length > 0 && !provider.supportsPdf) continue;

    for (let attempt = 0; attempt < provider.apiKeys.length; attempt++) {
      const keyIdx = attempt % provider.apiKeys.length;
      const key = provider.apiKeys[keyIdx];
      const deadKey = providerDeadKey(provider.id, provider.textModel, keyIdx, policy.capability);
      if (isDead(deadKey)) continue;

      try {
        const json = await postJson(`${provider.baseUrl}/chat/completions`, key, {
          model: provider.textModel,
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
          `${provider.id}|${provider.textModel}|${keyIdx}|ok`,
          `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) first call ok -> model=${provider.textModel}`,
        );
        return content;
      } catch (err) {
        lastError = err;
        const status = getStatus(err);
        const raw = getErrorText(err);
        const kind = classifyProviderFailure(status, raw);
        const logKey = `${provider.id}|${provider.textModel}|${keyIdx}|${kind}`;
        if (kind === "auth") {
          markDead(deadKey, 24 * 60 * 60_000);
          logProviderStateOnce(logKey, `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) disabled for auth`);
        } else if (kind === "quota") {
          markDead(deadKey, 24 * 60 * 60_000);
          logProviderStateOnce(logKey, `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) exhausted for ${provider.textModel}`);
        } else if (kind === "rate_limited") {
          markDead(deadKey, 60_000);
        } else if (kind === "unsupported") {
          markDead(deadKey, 6 * 60 * 60_000);
          logProviderStateOnce(logKey, `[llm-provider] ${provider.id} model ${provider.textModel} unsupported for ${operation}`);
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

    for (let attempt = 0; attempt < provider.apiKeys.length; attempt++) {
      const keyIdx = attempt % provider.apiKeys.length;
      const key = provider.apiKeys[keyIdx];
      const deadKey = providerDeadKey(provider.id, provider.embeddingModel, keyIdx, "embedding");
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
          `[llm-provider] ${provider.id} key #${keyIdx} (${maskKey(key)}) embedding call ok -> model=${provider.embeddingModel}`,
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
    baseUrl: string;
    keyCount: number;
    textModel: string | null;
    embeddingModel: string | null;
    supportsPdf: boolean;
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
  const providers = getConfiguredOpenAiProviders();
  return {
    providers: providers.map((p) => ({
      id: p.id,
      baseUrl: p.baseUrl,
      keyCount: p.apiKeys.length,
      textModel: p.textModel,
      embeddingModel: p.embeddingModel,
      supportsPdf: p.supportsPdf,
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
