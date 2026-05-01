import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";
import { serverEnv } from "@/lib/env";

// Multiple keys can be supplied as a comma-separated value; we rotate across them
// to spread load and recover from per-key 429s. Each free-tier key has its own
// quota bucket, so 3 keys gives ~3× the effective throughput.

let _keyIndex = 0;

function allKeys(): string[] {
  const raw = serverEnv.GEMINI_API_KEY;
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

function pickKeyAt(idx: number): string | null {
  const keys = allKeys();
  if (keys.length === 0) return null;
  return keys[idx % keys.length];
}

function client(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// ── Public model factories (kept for backwards compatibility) ────────────────

export function geminiFlash(): GenerativeModel {
  const key = pickKeyAt(_keyIndex++);
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return client(key).getGenerativeModel({ model: "gemini-2.0-flash" });
}

export function geminiFlashLite(): GenerativeModel {
  const key = pickKeyAt(_keyIndex++);
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return client(key).getGenerativeModel({ model: "gemini-2.0-flash-lite" });
}

// ── Retry-aware runner ───────────────────────────────────────────────────────

export type LlmError =
  | { kind: "rate_limited"; retryAfterMs: number; raw: string }
  | { kind: "quota_disabled"; raw: string }   // limit: 0 → API not enabled / billing
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

type ModelName = "gemini-2.0-flash" | "gemini-2.0-flash-lite";

/**
 * Run a Gemini call with key rotation + 429 retry + optional model fallback.
 *
 * Strategy:
 *  1. Try `primary` model with each key in rotation.
 *  2. On per-call 429: sleep up to 8s (capped from server-suggested retryDelay),
 *     advance to the next key, retry.
 *  3. If all keys 429 on the primary model AND a fallback is provided, retry
 *     once on the fallback model (different quota bucket).
 *  4. On `quota_disabled` (limit: 0 — project-level misconfig) we surface
 *     immediately rather than thrashing.
 */
export async function runWithRetry<T>(
  primary: ModelName,
  fallback: ModelName | null,
  build: (model: GenerativeModel) => Promise<T>,
): Promise<T> {
  const keys = allKeys();
  if (keys.length === 0) {
    throw new LlmRunError({ kind: "auth", raw: "GEMINI_API_KEY is not set" });
  }

  let lastError: LlmError | null = null;

  for (const modelName of (fallback ? [primary, fallback] : [primary]) as ModelName[]) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[(_keyIndex + attempt) % keys.length];
      const model = client(key).getGenerativeModel({ model: modelName });
      try {
        const result = await build(model);
        // Advance the global rotation pointer past the key that succeeded so
        // the next caller starts on a different key.
        _keyIndex = (_keyIndex + attempt + 1) % keys.length;
        return result;
      } catch (err) {
        const classified = classify(err);
        lastError = classified;

        if (classified.kind === "quota_disabled" || classified.kind === "auth") {
          // Don't waste other keys on a project-level configuration issue.
          throw new LlmRunError(classified);
        }
        if (classified.kind === "rate_limited" && attempt < keys.length - 1) {
          await sleep(classified.retryAfterMs);
          continue;
        }
        // Move on to fallback model (if any) on the next outer iteration.
        break;
      }
    }
  }

  throw new LlmRunError(lastError ?? { kind: "unknown", raw: "All Gemini calls failed" });
}

export { SchemaType, type Schema, type GenerativeModel };
