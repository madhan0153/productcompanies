// Phase I — Semantic embeddings (Gemini text-embedding-004, 768-dim).
//
// Used for JD↔resume similarity at match time. We store embeddings as
// float8[] columns rather than pgvector so the schema stays portable; cosine
// is computed in TS at scoring time. With ~3 000 jobs × 768 floats this is
// ~18 MB to load — negligible for a per-user compute that already pulls the
// jobs row by row.
//
// Why not pgvector + HNSW: we don't need k-NN. Match compute already pulls
// every job to apply rules; once we have all the rows in memory adding the
// cosine is trivial.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { serverEnv } from "@/lib/env";

// gemini-embedding-001 is the rename of the legacy text-embedding-004 (May
// 2026). The old name 404s on v1beta now. Cascade in case the alias gets
// deprecated again.
const MODEL_CASCADE = ["gemini-embedding-001", "gemini-embedding-2", "text-embedding-004"];

// gemini-embedding-001 returns 3072 dims by default. Per Google's Matryoshka
// design we can safely truncate to 768 — the leading components carry most
// of the semantic signal and we save 4× on storage + cosine compute.
const DIMS = 768;
function trim(v: number[]): number[] {
  return v.length > DIMS ? v.slice(0, DIMS) : v;
}

function allKeys(): string[] {
  const raw = serverEnv.GEMINI_API_KEY;
  if (!raw) return [];
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

let _keyIndex = 0;

function isModelMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b|not found|is not supported/i.test(msg);
}

/** Single embedding. ~768 floats. Cascades through model names + key rotation. */
export async function embed(text: string): Promise<number[]> {
  const keys = allKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY not set");
  const trimmed = text.replace(/\s+/g, " ").trim().slice(0, 8000);
  if (!trimmed) return [];

  let lastErr: unknown;
  for (const modelName of MODEL_CASCADE) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[(_keyIndex + attempt) % keys.length];
      try {
        const client = new GoogleGenerativeAI(key);
        const model = client.getGenerativeModel({ model: modelName });
        const res = await model.embedContent(trimmed);
        _keyIndex = (_keyIndex + attempt + 1) % keys.length;
        return trim(res.embedding.values ?? []);
      } catch (err) {
        lastErr = err;
        if (isModelMissing(err)) break; // skip remaining keys for this model
        // else 429 / quota → try next key
      }
    }
  }
  throw lastErr;
}

/** Batch embeddings — Gemini supports up to 100 in a single request. */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const keys = allKeys();
  if (keys.length === 0) throw new Error("GEMINI_API_KEY not set");

  const cleaned = texts.map((t) => t.replace(/\s+/g, " ").trim().slice(0, 8000) || " ");

  let lastErr: unknown;
  for (const modelName of MODEL_CASCADE) {
    for (let attempt = 0; attempt < keys.length; attempt++) {
      const key = keys[(_keyIndex + attempt) % keys.length];
      try {
        const client = new GoogleGenerativeAI(key);
        const model = client.getGenerativeModel({ model: modelName });
        const res = await model.batchEmbedContents({
          requests: cleaned.map((t) => ({
            model: `models/${modelName}`,
            content: { role: "user", parts: [{ text: t }] },
          })),
        });
        _keyIndex = (_keyIndex + attempt + 1) % keys.length;
        return (res.embeddings ?? []).map((e) => trim(e.values ?? []));
      } catch (err) {
        lastErr = err;
        if (isModelMissing(err)) break;
      }
    }
  }
  throw lastErr;
}

/** Build the canonical text fed to the embedding model for a job posting.
 *  Order matters: the most distinctive signal (must-haves) sits early. */
export function buildJobEmbedText(input: {
  title: string;
  company?: string | null;
  jd_summary?: string | null;
  must_have_skills?: string[] | null;
  nice_to_have_skills?: string[] | null;
  description?: string | null;
  role_function?: string | null;
  jd_seniority_signal?: string | null;
}): string {
  const must = (input.must_have_skills ?? []).join(", ");
  const nice = (input.nice_to_have_skills ?? []).join(", ");
  const parts = [
    `Title: ${input.title}`,
    input.company ? `Company: ${input.company}` : "",
    input.role_function ? `Function: ${input.role_function}` : "",
    input.jd_seniority_signal ? `Level: ${input.jd_seniority_signal}` : "",
    input.jd_summary ? `Summary: ${input.jd_summary}` : "",
    must ? `Must have: ${must}` : "",
    nice ? `Nice to have: ${nice}` : "",
    input.description ? `Description: ${input.description.slice(0, 4000)}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

/** Build the canonical text fed to the embedding model for a candidate. */
export function buildResumeEmbedText(parsed: {
  current_role?: string;
  role_function?: string;
  total_years_experience?: number;
  summary?: string;
  tech_stack?: string[];
  products_built?: string[];
  companies?: Array<{ name?: string; role?: string; years?: number }>;
}): string {
  const parts = [
    parsed.current_role ? `Role: ${parsed.current_role}` : "",
    parsed.role_function ? `Function: ${parsed.role_function}` : "",
    parsed.total_years_experience !== undefined
      ? `Years: ${parsed.total_years_experience}` : "",
    parsed.summary ? `Summary: ${parsed.summary.slice(0, 1000)}` : "",
    parsed.tech_stack?.length ? `Tech: ${parsed.tech_stack.slice(0, 30).join(", ")}` : "",
    parsed.products_built?.length
      ? `Products built: ${parsed.products_built.slice(0, 8).join(" | ")}`
      : "",
    parsed.companies?.length
      ? `Companies: ${parsed.companies.slice(0, 6).map((c) => `${c.role ?? "?"} at ${c.name ?? "?"} (${c.years ?? "?"}y)`).join("; ")}`
      : "",
  ].filter(Boolean);
  return parts.join("\n");
}

/** Cosine similarity between two equal-length numeric vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}
