import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";
import { serverEnv } from "@/lib/env";

// Model availability changes over time and by region. Free tier for
// gemini-2.0-flash has been spotty for India-region projects (we've
// observed 'limit: 0' errors). Default to 2.5-flash (current production
// with broad free-tier coverage), and cascade down through older models
// before giving up so a single misconfigured project doesn't break parsing.

let _keyIndex = 0;

function allKeys(): string[] {
  const raw = serverEnv.GEMINI_API_KEY;
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

function client(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// ── Public model factories (kept for backwards compatibility) ────────────────

export function geminiFlash(): GenerativeModel {
  const keys = allKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY is not set");
  const key = keys[_keyIndex++ % keys.length];
  return client(key).getGenerativeModel({ model: HEAVY_MODELS[0] });
}

export function geminiFlashLite(): GenerativeModel {
  const keys = allKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY is not set");
  const key = keys[_keyIndex++ % keys.length];
  return client(key).getGenerativeModel({ model: LIGHT_MODELS[0] });
}

// ── Retry-aware runner ───────────────────────────────────────────────────────

export type LlmError =
  | { kind: "rate_limited"; retryAfterMs: number; raw: string }
  | { kind: "quota_disabled"; raw: string }   // limit: 0 → API not enabled / billing
  | { kind: "model_unavailable"; raw: string } // model name not found / 404 / not supported
  | { kind: "auth"; raw: string }
  | { kind: "unknown"; raw: string };

export class LlmRunError extends Error {
  constructor(public detail: LlmError) {
    super(detail.kind);
  }
}

function classify(err: unknown): LlmError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/limit:\s*0/i.test(msg)) {
    return { kind: "quota_disabled", raw: msg };
  }
  if (/\b404\b|not found|is not supported|is not found for API|model.*does not exist|UNSUPPORTED/i.test(msg)) {
    return { kind: "model_unavailable", raw: msg };
  }
  if (/\b429\b|Too Many Requests|RESOURCE_EXHAUSTED/i.test(msg)) {
    const m = msg.match(/retry in ([\d.]+)s/i) ?? msg.match(/"retryDelay":\s*"(\d+)s"/);
    const seconds = m ? parseFloat(m[1]) : 5;
    return { kind: "rate_limited", retryAfterMs: Math.min(seconds * 1000, 8_000), raw: msg };
  }
  if (/\b401\b|API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(msg)) {
    return { kind: "auth", raw: msg };
  }
  return { kind: "unknown", raw: msg };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Cascade order: try the "best" model first, fall back through older /
// cheaper variants. Each model has its own quota bucket so this also
// works around per-model rate limits.
//
// Model cascade.
//
// IMPORTANT: Google's free-tier daily quota is per (project × pinned model
// name). Calls to a specific version like "gemini-2.5-flash" share a 20/day
// counter; calls to the alias "gemini-flash-latest" use a SEPARATE counter
// AND auto-route to whichever underlying model is alive. We've seen all
// pinned-name quotas burn out in production while the -latest aliases stay
// responsive — so the aliases are first in cascade.
//
// 1.5 family is gone from the v1beta endpoint as of May 2026 (404). Removed.
//
// HEAVY_MODELS — used for resume parsing (PDF input, structured output).
const HEAVY_MODELS = [
  "gemini-flash-latest",       // alias: separate quota, current best for PDFs
  "gemini-flash-lite-latest",  // alias: lighter, also separate quota
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
] as const;

// LIGHT_MODELS — used for high-volume match explanations / Fit Cards.
// Start with the lite alias (cheapest, separate quota), then pinned lites,
// then escalate to heavier variants if everything else is exhausted.
const LIGHT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

export type ModelTier = "heavy" | "light";

const CASCADES: Record<ModelTier, readonly string[]> = {
  heavy: HEAVY_MODELS,
  light: LIGHT_MODELS,
};

/**
 * Run a Gemini call with key rotation + 429 retry + cascading model fallback.
 *
 * Strategy:
 *  1. Try the first model in the tier with each key in rotation.
 *  2. On 429: respect server-suggested retryDelay (capped at 8s), advance
 *     to the next key, retry.
 *  3. On 'model_unavailable' or after all keys 429 on a model, move to the
 *     next model in the cascade (different quota bucket entirely).
 *  4. On 'quota_disabled' (limit:0 — project-level misconfig) or 'auth',
 *     surface immediately rather than thrashing every model with a key
 *     we already know is broken.
 */
export async function runWithRetry<T>(
  tierOrModel: ModelTier | string,
  fallbackOrBuild: string | null | ((model: GenerativeModel) => Promise<T>),
  maybeBuild?: (model: GenerativeModel) => Promise<T>,
): Promise<T> {
  // Backwards-compat: support the old (primary, fallback, build) signature.
  let cascade: readonly string[];
  let build: (model: GenerativeModel) => Promise<T>;

  if (typeof fallbackOrBuild === "function") {
    // (tier, build) — new ergonomic shape
    cascade = CASCADES[tierOrModel as ModelTier] ?? CASCADES.heavy;
    build = fallbackOrBuild;
  } else {
    // (primary, fallback, build) — legacy shape
    const primary = tierOrModel;
    const fallback = fallbackOrBuild;
    build = maybeBuild!;
    cascade = fallback ? [primary, fallback] : [primary];
  }

  const keys = allKeys();
  if (keys.length === 0) {
    throw new LlmRunError({ kind: "auth", raw: "GEMINI_API_KEY is not set" });
  }

  let lastError: LlmError | null = null;

  for (const modelName of cascade) {
    let modelUnavailable = false;

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[(_keyIndex + attempt) % keys.length];
      const model = client(key).getGenerativeModel({ model: modelName });
      try {
        const result = await build(model);
        _keyIndex = (_keyIndex + attempt + 1) % keys.length;
        return result;
      } catch (err) {
        const classified = classify(err);
        lastError = classified;

        if (classified.kind === "quota_disabled" || classified.kind === "auth") {
          // Per-key project-level issue. Don't try other keys with the same
          // problem on the same model, but DO try the next model in cascade —
          // a key may have one model enabled but not another.
          break;
        }
        if (classified.kind === "model_unavailable") {
          // No point hammering other keys — this model just isn't there.
          modelUnavailable = true;
          break;
        }
        if (classified.kind === "rate_limited" && attempt < keys.length - 1) {
          await sleep(classified.retryAfterMs);
          continue;
        }
        // Otherwise (last attempt 429, or unknown error): move to next model.
        break;
      }
    }

    // Slight pause between models if we burned through keys, in case the
    // platform is mid-incident; cheap insurance.
    if (!modelUnavailable && lastError?.kind === "rate_limited") {
      await sleep(400);
    }
  }

  throw new LlmRunError(lastError ?? { kind: "unknown", raw: "All Gemini calls failed" });
}

export { SchemaType, type Schema, type GenerativeModel };
