// Shared Gemini runtime — used by both apps/web (for resume parsing,
// fit cards, etc.) and packages/crawler (for inline JD parse during ingest).
//
// Reads GEMINI_API_KEY directly from process.env so the module is portable
// across Next.js server runtime AND a plain Node CLI without a tsconfig path
// alias for `@/lib/env`. Comma-separated for key rotation.
//
// Strategy:
//   1. Try first model in cascade with each key in rotation.
//   2. On 429: respect server-suggested retryDelay (capped at 30s for inline
//      crawler use; apps/web overrides via the same retry hook).
//   3. On 'model_unavailable' or after all keys 429 on a model, drop to next
//      model in the cascade — every (project × pinned model) has its own
//      free-tier counter, and the *-latest aliases use a separate counter
//      from pinned versions, so cascading buys headroom both ways.
//   4. On 'quota_disabled' (limit:0) or 'auth' surface immediately rather
//      than thrashing every model with a key we already know is broken.

import {
  GoogleGenerativeAI,
  SchemaType,
  type GenerativeModel,
  type Schema,
} from "@google/generative-ai";

let _keyIndex = 0;

function allKeys(): string[] {
  const raw = process.env.GEMINI_API_KEY ?? "";
  return raw.split(",").map((k: string) => k.trim()).filter(Boolean);
}

// Mask all but the last 6 chars of an API key. Last 6 is enough to distinguish
// keys at a glance ("…abc123" vs "…xyz789") without leaking the secret if logs
// are shared or screenshotted.
function maskKey(key: string): string {
  if (key.length <= 6) return "***";
  return `…${key.slice(-6)}`;
}

// Per-process set of (keyIdx) that have logged their first successful call.
// First use per key proves the key is real, the rotation reaches it, and —
// most importantly — its quota counter is independent (each "first use ok"
// landed on a separate per-project quota). Without this, you can't tell from
// logs alone whether 3 keys means 3× headroom or 1× with rotation theatre.
const _firstUseLogged = new Set<number>();

// Per-process set of "(modelName||keyIdx)" combos that have already logged
// their quota-exhaustion reason. Surfaces what Google actually said the
// first time a key+model is marked dead, then stays silent so the log
// doesn't spam on every subsequent retry attempt that finds the combo
// already exhausted.
const _quotaDisabledLogged = new Set<string>();

function logKeyFirstUse(keyIdx: number, modelName: string, key: string): void {
  if (_firstUseLogged.has(keyIdx)) return;
  _firstUseLogged.add(keyIdx);
  // Plain console.log so this interleaves with the crawler's structured JSON
  // logs on stdout. Prefix is greppable and stable across runs.
  // eslint-disable-next-line no-console
  console.log(`[gemini-key] key #${keyIdx} (${maskKey(key)}) first call ok → model=${modelName}`);
}

/**
 * Logs a one-line roster of every configured Gemini key with its masked
 * suffix and index, intended to be called once at process start. Lets you
 * verify in the run log that the env var actually parsed to N keys (not 1
 * key with embedded commas, or 4 keys where you expected 3).
 */
export function logKeyRoster(): void {
  const keys = allKeys();
  if (keys.length === 0) {
    // eslint-disable-next-line no-console
    console.log(`[gemini-key] roster: 0 keys configured (GEMINI_API_KEY is not set)`);
    return;
  }
  const tails = keys.map((k, i) => `#${i}=${maskKey(k)}`).join(", ");
  // eslint-disable-next-line no-console
  console.log(`[gemini-key] roster: ${keys.length} key(s) configured: ${tails}`);
}

function client(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// ── Model factories (kept for backwards compatibility with apps/web) ────────

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

// ── Error classification ────────────────────────────────────────────────────

export type LlmError =
  | { kind: "rate_limited"; retryAfterMs: number; raw: string }
  | { kind: "quota_disabled"; raw: string }   // limit:0 → API not enabled / billing
  | { kind: "model_unavailable"; raw: string } // 404 / not supported
  | { kind: "auth"; raw: string }
  | { kind: "unknown"; raw: string };

export class LlmRunError extends Error {
  constructor(public detail: LlmError) {
    super(detail.kind);
  }
}

function classify(err: unknown): LlmError {
  const msg = err instanceof Error ? err.message : String(err);

  // 404 / unavailable: hard-permanent for this model name, applies to all keys.
  if (/\b404\b|not found|is not supported|is not found for API|model.*does not exist|UNSUPPORTED/i.test(msg)) {
    return { kind: "model_unavailable", raw: msg };
  }

  // Auth: permanent for this key, applies to all models.
  if (/\b401\b|API key not valid|PERMISSION_DENIED|API_KEY_INVALID/i.test(msg)) {
    return { kind: "auth", raw: msg };
  }

  // Quota / rate limits. Differentiate three cases:
  //
  //   (a) True per-day exhaustion: "per day" wording or a QuotaFailure
  //       payload with limit==0 AND quota_metric indicating "_per_day_".
  //       Marks (key × model) dead for the rest of this run.
  //
  //   (b) Per-minute / TPM throttling: "per minute", "TPM", or a
  //       retryDelay hint. Recovers — caller should sleep + retry,
  //       NOT mark dead.
  //
  //   (c) "limit:0" without explicit per-day wording: ambiguous. Prefer
  //       the transient interpretation — better to retry once than burn
  //       the key for the run on a misclassified transient.
  //
  // Prior version of this code matched `/limit:\s*0/i` first and treated
  // every match as permanent. That caused 12 healthy keys to be marked
  // dead for the rest of the Microsoft parse in the 16:23 UTC run after
  // a brief RPM burst — the regex fired on transient throttles too.
  const isQuotaShaped = /\b429\b|Too Many Requests|RESOURCE_EXHAUSTED|quota/i.test(msg);
  if (isQuotaShaped) {
    const explicitPerDay = /per\s*day|requests?\s*per\s*day|daily quota|_per_day_/i.test(msg);
    const explicitPerMinute = /per\s*minute|requests?\s*per\s*minute|_per_minute_|TPM|tokens.*per.*minute/i.test(msg);

    // Pull a retry-after hint if Google supplied one.
    const m = msg.match(/retry in ([\d.]+)s/i) ?? msg.match(/"retryDelay":\s*"(\d+)s"/);
    const seconds = m ? parseFloat(m[1]) : 30;

    if (explicitPerDay && !explicitPerMinute) {
      // Permanent for this (model × key) until the next UTC day rollover.
      return { kind: "quota_disabled", raw: msg };
    }
    // Everything else: rotate / wait / retry.
    return { kind: "rate_limited", retryAfterMs: Math.min(seconds * 1000, 30_000), raw: msg };
  }

  return { kind: "unknown", raw: msg };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Cascades ────────────────────────────────────────────────────────────────
//
// IMPORTANT: Google's free-tier daily quota is per (project × pinned model
// name). Calls to "gemini-2.5-flash" share one daily counter; calls to the
// alias "gemini-flash-latest" use a SEPARATE counter that auto-routes to
// whichever underlying model is alive. We've observed all pinned-name
// quotas burn out in production while the -latest aliases stay responsive
// — aliases stay first.
//
// 2026 model availability (per Google's docs):
//   - 1.5 family:      removed from v1beta May 2026 (404).
//   - 2.0 family:      DEPRECATED, dropped from cascade.
//   - 2.5 family:      stable production.
//   - 3.x family:      preview / stable, SEPARATE quota pool from 2.5.
//
// gemini-3-flash-preview was added because it's quota-independent from the
// 2.5 family and the -latest aliases. When the 2.5 daily quota is burned
// for a key, the 3.x preview pool is still untouched.
//
// HEAVY_MODELS — used for resume parsing (PDF input, structured output).
const HEAVY_MODELS = [
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
  "gemini-3-flash-preview",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
] as const;

// LIGHT_MODELS — used for high-volume JD parse / Fit Cards / explanations.
const LIGHT_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
] as const;

export type ModelTier = "heavy" | "light";

const CASCADES: Record<ModelTier, readonly string[]> = {
  heavy: HEAVY_MODELS,
  light: LIGHT_MODELS,
};

export interface RetryOptions {
  /** Hard cap on rate-limit waits across the whole call (default 60s). */
  maxRateLimitWaitMs?: number;
  /** Override which key to start with (round-robin from this offset). */
  startKeyIndex?: number;
}

/**
 * Run a Gemini call with key rotation + 429 retry + cascading model fallback.
 * Optionally pin which key to start with (used by the crawler worker pool to
 * pre-distribute load across keys).
 */
export async function runWithRetry<T>(
  tierOrModel: ModelTier | string,
  fallbackOrBuild: string | null | ((model: GenerativeModel) => Promise<T>),
  maybeBuildOrOpts?: ((model: GenerativeModel) => Promise<T>) | RetryOptions,
  maybeOpts?: RetryOptions,
): Promise<T> {
  let cascade: readonly string[];
  let build: (model: GenerativeModel) => Promise<T>;
  let opts: RetryOptions = {};

  if (typeof fallbackOrBuild === "function") {
    cascade = CASCADES[tierOrModel as ModelTier] ?? CASCADES.heavy;
    build = fallbackOrBuild;
    if (maybeBuildOrOpts && typeof maybeBuildOrOpts !== "function") opts = maybeBuildOrOpts;
  } else {
    const primary = tierOrModel;
    const fallback = fallbackOrBuild;
    build = maybeBuildOrOpts as (model: GenerativeModel) => Promise<T>;
    cascade = fallback ? [primary, fallback] : [primary];
    if (maybeOpts) opts = maybeOpts;
  }

  const keys = allKeys();
  if (keys.length === 0) {
    throw new LlmRunError({ kind: "auth", raw: "GEMINI_API_KEY is not set" });
  }

  const startIdx = opts.startKeyIndex ?? _keyIndex;
  const maxWait = opts.maxRateLimitWaitMs ?? 60_000;
  let totalWaited = 0;
  let lastError: LlmError | null = null;

  // Track which (model × key) combinations have exhausted daily quota so we
  // don't retry them across model loops. quota_disabled is per-key-per-model
  // (Gemini's daily limit is keyed by project × pinned-model), so if model A
  // returns quota_disabled with key 1, model B with key 1 might still work.
  const exhausted = new Set<string>(); // "modelName||keyIdx"
  const exhaustedKey = (m: string, i: number) => `${m}||${i}`;

  for (const modelName of cascade) {
    let modelUnavailable = false;
    let allKeysExhaustedForModel = true;

    for (let attempt = 0; attempt < keys.length; attempt++) {
      const keyIdx = (startIdx + attempt) % keys.length;
      if (exhausted.has(exhaustedKey(modelName, keyIdx))) continue;

      const key = keys[keyIdx];
      const model = client(key).getGenerativeModel({ model: modelName });
      try {
        const result = await build(model);
        // First-success-per-key diagnostic — proves each key index actually
        // gets used AND lands on a separate quota counter. One log line per
        // key per process lifetime; silent thereafter.
        logKeyFirstUse(keyIdx, modelName, key);
        _keyIndex = (keyIdx + 1) % keys.length;
        return result;
      } catch (err) {
        const classified = classify(err);
        lastError = classified;

        // AUTH = permanent error on this key; skip it for ALL models.
        if (classified.kind === "auth") {
          for (const m of cascade) exhausted.add(exhaustedKey(m, keyIdx));
          continue; // try next key
        }

        // QUOTA_DISABLED = daily quota for this (model × key). Mark this combo
        // exhausted and try the next key — DON'T break out, the other keys
        // may still have their own daily quota intact. This was the bug:
        // before, one quota_disabled response would break the entire key
        // loop, so we'd repeatedly hammer key 0 only.
        if (classified.kind === "quota_disabled") {
          // First time this (key × model) is marked dead in this process,
          // log the raw Google error so the next run can be diagnosed
          // from logs alone. Truncated to 240 chars to keep log lines
          // readable; the full classification reason is included.
          const combo = exhaustedKey(modelName, keyIdx);
          if (!_quotaDisabledLogged.has(combo)) {
            _quotaDisabledLogged.add(combo);
            // eslint-disable-next-line no-console
            console.log(
              `[gemini-key] key #${keyIdx} (${maskKey(key)}) × ${modelName}: ` +
              `marked exhausted (RPD). reason="${classified.raw.slice(0, 240).replace(/\s+/g, " ")}"`,
            );
          }
          exhausted.add(combo);
          continue;
        }

        // MODEL_UNAVAILABLE = whole model is gone (404). No point trying
        // other keys on this model.
        if (classified.kind === "model_unavailable") {
          modelUnavailable = true;
          for (let i = 0; i < keys.length; i++) exhausted.add(exhaustedKey(modelName, i));
          break;
        }

        // RATE_LIMITED = per-minute throttle. Wait per server retry-after
        // hint (capped) then try next key. The next key likely has its own
        // RPM counter, so this is usually fast.
        if (classified.kind === "rate_limited") {
          allKeysExhaustedForModel = false;
          const wait = classified.retryAfterMs;
          if (totalWaited + wait <= maxWait) {
            totalWaited += wait;
            await sleep(wait);
          }
          continue;
        }

        // UNKNOWN error — don't burn other keys on it, but don't mark
        // exhausted either. Try the next key with the same model.
        allKeysExhaustedForModel = false;
        continue;
      }
    }

    // Inter-model wait — gives the prior model's per-minute window a chance
    // to recover before we hammer the next one with the same keys.
    if (!modelUnavailable && lastError?.kind === "rate_limited" && !allKeysExhaustedForModel) {
      await sleep(400);
    }
  }

  throw new LlmRunError(lastError ?? { kind: "unknown", raw: "All Gemini calls failed" });
}

export { SchemaType, type Schema, type GenerativeModel };
