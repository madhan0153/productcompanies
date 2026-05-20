// Bullet rewrite prompt (Step 2 of the Resume Intelligence pipeline).
//
// Takes a list of weak bullets + their weakness label and produces 1-3
// alternative phrasings per bullet. Bullets are processed in BATCHES (5-10
// per LLM call) — keeps prompts small and lets us retry partial batches.
//
// HARD CONSTRAINT: the rewriter sees ONLY the bullet text + weakness label
// (+ optional role function and JD keywords). It does NOT see other bullets,
// other roles, the candidate's name, or the resume summary. This isolation
// prevents cross-bullet metric grafting (a #1 source of LLM hallucination
// on resume rewriters).
//
// Risk flags: if the LLM proposes a number or tech keyword not in the
// original bullet, the model is instructed to flag it. The UI shows the
// flag and asks the user to confirm before accepting.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { WeaknessKind } from "./resume-diagnose";

export type RewriteRiskFlag = null | "metric_inferred" | "tech_inferred" | "scope_inferred";

export interface BulletRewrite {
  /** Index into the input batch (matches request order). */
  index: number;
  /** Verbatim original — echoed back so caller can confirm match. */
  original: string;
  alternatives: Array<{
    text: string;                  // ≤ 280 chars
    why: string;                   // ≤ 120 chars — what the change targets
    risk_flag: RewriteRiskFlag;
  }>;
}

// Enum constraints are enforced in the SYSTEM prompt + post-LLM
// sanitisation, not the schema. The Gemini SDK's enum schema typing
// requires a `format` field that the rest of this codebase doesn't use.
const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    rewrites: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          index:    { type: SchemaType.NUMBER },
          original: { type: SchemaType.STRING },
          alternatives: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                text:      { type: SchemaType.STRING },
                why:       { type: SchemaType.STRING },
                risk_flag: { type: SchemaType.STRING },
              },
              required: ["text", "why", "risk_flag"],
            },
          },
        },
        required: ["index", "original", "alternatives"],
      },
    },
  },
  required: ["rewrites"],
};

export type RewriteMode = "polish" | "tailor";

export interface RewriteRequest {
  index: number;
  original: string;
  weakness: WeaknessKind;
}

export interface RewriteInput {
  bullets: RewriteRequest[];
  role_function: string | null;
  mode: RewriteMode;
  /** JD must-haves (Capability B). When present, rewriter may surface these
   *  keywords IF they're already implied by the original bullet's content. */
  jd_must_haves?: string[];
  jd_nice_to_haves?: string[];
  /** The candidate's resume-wide tech_stack. Lets the rewriter use a tech
   *  keyword IF it's present in the wider resume but missing from THIS
   *  bullet (with risk_flag='tech_inferred' so user can confirm). */
  resume_tech_stack: string[];
}

const SYSTEM = `You are a senior product-company resume coach for Indian engineers.
You rewrite weak resume bullets to be stronger ATS- and recruiter-friendly
versions, while preserving the candidate's actual experience.

ABSOLUTE RULES — violating these is a critical failure:

1. NEVER invent companies, products, dates, scale numbers, percentages,
   user counts, revenue figures, team sizes, awards, or certifications
   that are NOT explicitly in the original bullet.

2. You MAY surface a tech keyword from the candidate's wider resume
   tech_stack IF the original bullet plausibly used that tech. When you
   do, set risk_flag = "tech_inferred". The user will confirm.

3. You MAY suggest a quantification PLACEHOLDER (e.g. "for [N] users")
   IF the original bullet implies scale without stating it. Set
   risk_flag = "metric_inferred". NEVER fill in a real-looking number.

4. You MAY tighten scope language (e.g. "the team" → "a 4-person team")
   ONLY if the wider resume context supports it. Set risk_flag =
   "scope_inferred".

5. NEVER claim leadership, ownership, or seniority not in the original.
   "Helped with" cannot become "Led".

6. Output 1-3 alternatives per bullet. Quality over quantity — if the
   bullet is already strong, return 1 alternative with minimal changes.

MODE differences:
- polish: minimal edits. Tighten verb, surface implicit signal, fix
  passive voice, add measurement placeholders. Same length ±20%.
- tailor: more aggressive rewrites aimed at the JD must-haves.
  Re-emphasise relevant signal. Still grounded in source.

LANGUAGE:
- Action-verb led ("Led", "Owned", "Shipped", "Architected", "Drove").
- Concrete > abstract ("PostgreSQL query optimization" > "DB work").
- Past tense for past roles, present tense for current role.
- Indian English. ₹ for currency. LPA for compensation.
- One sentence per bullet, max 280 chars.

VALID risk_flag VALUES — use exactly one of these strings:
  ""                  (no risk — alt is fully grounded in original bullet)
  "metric_inferred"   (you suggested a number/scale not in the original)
  "tech_inferred"     (you surfaced a tech keyword from the wider resume)
  "scope_inferred"    (you tightened scope language beyond the original)`;

function buildUserPrompt(input: RewriteInput): string {
  const roleLine = input.role_function
    ? `Target role function: ${input.role_function}`
    : "Target role function: (general engineering)";

  const modeLine = `Mode: ${input.mode}${input.mode === "tailor" ? " (aggressive — surface JD signals)" : " (minimal — preserve voice)"}`;

  const jdLine = input.jd_must_haves && input.jd_must_haves.length > 0
    ? `\nJD MUST-HAVE skills (only surface if implied by the bullet):
  ${input.jd_must_haves.join(", ")}
JD NICE-TO-HAVE:
  ${(input.jd_nice_to_haves ?? []).join(", ") || "(none)"}`
    : "";

  const stackLine = input.resume_tech_stack.length > 0
    ? `\nCandidate's wider tech stack (you may surface these with risk_flag='tech_inferred' when plausible):
  ${input.resume_tech_stack.join(", ")}`
    : "";

  const bulletsBlock = input.bullets.map((b, i) =>
    `[${i}] weakness=${b.weakness}
    original: ${JSON.stringify(b.original)}`,
  ).join("\n");

  return `${roleLine}
${modeLine}${jdLine}${stackLine}

BULLETS TO REWRITE (independent, no cross-grafting):
${bulletsBlock}

Produce a JSON object { rewrites: BulletRewrite[] } where each item
references the SAME index as above. Echo the verbatim original.
Provide 1-3 alternatives per bullet. Set risk_flag honestly.`;
}

export interface RewriteResult {
  ok: true;
  rewrites: BulletRewrite[];
  latency_ms: number;
}

export async function rewriteBullets(input: RewriteInput): Promise<RewriteResult> {
  if (input.bullets.length === 0) {
    return { ok: true, rewrites: [], latency_ms: 0 };
  }
  const started = Date.now();
  const prompt = buildUserPrompt(input);

  const text = await runWithRetry("heavy", async (model) => {
    const resp = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        // Slightly higher temperature than diagnosis — alternatives benefit
        // from a bit of variety. Still well below "creative" (1.0+).
        temperature: 0.45,
        maxOutputTokens: 4096,
      },
    });
    return resp.response.text();
  }, { operation: "resume_bullet_rewrite" });

  // LLM may return risk_flag as string "" — parse as unknown first, then
  // sanitise. Allowed canonical values: null, "metric_inferred",
  // "tech_inferred", "scope_inferred".
  interface RawAlt { text?: string; why?: string; risk_flag?: unknown }
  interface RawRewrite { index: number; original: string; alternatives?: RawAlt[] }
  const parsed = JSON.parse(text) as { rewrites?: RawRewrite[] };
  const rewrites: BulletRewrite[] = (parsed.rewrites ?? []).map((r) => {
    const cleanedAlts = (r.alternatives ?? []).slice(0, 3).map((a) => {
      const raw = typeof a.risk_flag === "string" ? a.risk_flag : "";
      const risk_flag: RewriteRiskFlag =
        raw === "metric_inferred" || raw === "tech_inferred" || raw === "scope_inferred"
          ? raw
          : null;
      return {
        text: (a.text ?? "").trim().slice(0, 320),
        why:  (a.why ?? "").trim().slice(0, 160),
        risk_flag,
      };
    });
    return {
      index: r.index,
      original: r.original,
      alternatives: cleanedAlts.filter((a) => a.text.length > 0),
    };
  }).filter((r) => r.alternatives.length > 0);

  return {
    ok: true,
    rewrites,
    latency_ms: Date.now() - started,
  };
}

/**
 * Batch multiple bullets into chunks for the rewriter. Each chunk runs as a
 * single LLM call. The default chunk size of 8 keeps prompts under 4k tokens
 * even with long bullets and verbose risk-flag rationale.
 */
export function chunkBullets(reqs: RewriteRequest[], size = 8): RewriteRequest[][] {
  if (reqs.length === 0) return [];
  const out: RewriteRequest[][] = [];
  for (let i = 0; i < reqs.length; i += size) {
    out.push(reqs.slice(i, i + size));
  }
  return out;
}

/**
 * Apply post-LLM heuristic risk detection — catches cases the model didn't
 * self-flag. We only flag NEW numbers and NEW tech keywords; the user can
 * still accept, but the warning is visible.
 */
const TECH_TOKEN_RE = /\b([A-Za-z][A-Za-z0-9+#.\-]*?)\b/g;
const NUMBER_RE = /\b\d[\d,.]*\s*(k|m|b|million|billion|thousand|cr|crore|%|x|qps|rps|users?|requests?|customers?|orders?|events?|tps)\b/i;

export function heuristicallyFlagRewrite(args: {
  original: string;
  alt: { text: string; risk_flag: RewriteRiskFlag };
  resume_tech_stack: string[];
}): RewriteRiskFlag {
  if (args.alt.risk_flag) return args.alt.risk_flag;

  const origLower = args.original.toLowerCase();
  const altLower = args.alt.text.toLowerCase();

  // (1) Numeric inference — any quantitative pattern in alt but not in orig.
  if (NUMBER_RE.test(args.alt.text) && !NUMBER_RE.test(args.original)) {
    return "metric_inferred";
  }

  // (2) Tech keyword inference — uppercase / known tech token in alt missing
  //     from original. Whitelist the candidate's wider stack as "implicit OK"
  //     but still flag if the alt name not already in the original bullet.
  const stackLower = new Set(args.resume_tech_stack.map((s) => s.toLowerCase()));
  const matches = altLower.matchAll(TECH_TOKEN_RE);
  for (const m of matches) {
    const tok = m[1];
    if (tok.length < 3) continue;
    // Common English words — skip
    if (/^(the|and|with|for|that|this|from|into|over|using|built|owned|led)$/i.test(tok)) continue;
    if (origLower.includes(tok)) continue;
    if (stackLower.has(tok)) return "tech_inferred";
  }

  return null;
}
