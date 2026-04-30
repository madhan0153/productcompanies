import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";
import { serverEnv } from "@/lib/env";

// Support comma-separated keys for round-robin rotation across Gemini free-tier limits.
// Each key has 15 RPM / 1M TPD; rotating across 3 keys gives ~45 RPM effective capacity.
let _keyIndex = 0;

function pickKey(): string {
  const raw = serverEnv.GEMINI_API_KEY;
  if (!raw) throw new Error("GEMINI_API_KEY is not set");
  const keys = raw.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) throw new Error("GEMINI_API_KEY contains no valid keys");
  const key = keys[_keyIndex % keys.length];
  _keyIndex = (_keyIndex + 1) % keys.length;
  return key;
}

function client() {
  return new GoogleGenerativeAI(pickKey());
}

export function geminiFlash() {
  return client().getGenerativeModel({ model: "gemini-2.0-flash" });
}

export function geminiFlashLite() {
  return client().getGenerativeModel({ model: "gemini-2.0-flash-lite" });
}

export { SchemaType, type Schema };
