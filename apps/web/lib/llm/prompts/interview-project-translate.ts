// Interview Lab — Project Translator.
//
// Rewrites a single bullet from an IT-services candidate's resume into
// product-company interview register. Short, one-shot, runs per-click on
// the resume editor surface.
//
// PRIVACY: the input bullet is `resume_pii`. Logged only as char count.

import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import { parseJsonObject } from "@prodmatch/shared";

export interface TranslatedBullet {
  /** Rewritten bullet — single sentence, 12-28 words. */
  rewritten: string;
  /** When the source bullet is vague on metrics / scale, ask the candidate
   *  for clarifications they can edit into a stronger bullet next time. */
  follow_ups: string[];
  /** What changed: a 1-line diff-style explanation the user can read. */
  rationale: string;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    rewritten:  { type: SchemaType.STRING },
    follow_ups: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    rationale:  { type: SchemaType.STRING },
  },
  required: ["rewritten", "follow_ups", "rationale"],
};

const PROMPT = `You are an interview-prep coach helping Indian engineers translate
service-company resume bullets into product-company interview register.

Service-company bullets sound passive ("Was responsible for", "Worked on",
"Helped with"). Product-company bullets sound active, scaled, and outcome-
oriented ("Built", "Owned end-to-end", "Shipped", "Drove", "Scaled to").

INVARIANTS:
1. NEVER invent metrics, technologies, or scale that aren't already implied.
2. Single sentence, 12-28 words.
3. Start with an active verb (built / owned / shipped / drove / scaled /
   designed / migrated / cut / improved).
4. If the source has a metric (latency, throughput, users, $$), KEEP IT
   prominent. If not, leave the metric slot blank rather than fabricating.
5. follow_ups: 1-2 short questions the candidate can answer to make this
   bullet stronger next time ("What was the latency before vs after?",
   "How many users did this serve?"). Skip if the bullet is already strong.
6. rationale: ONE line explaining the rewrite.

CONTEXT-SENSITIVE RULES:
- If "Java + Spring" is mentioned, surface scale (req/sec, DB rows) when
  reasonable.
- If "ETL pipeline" is mentioned, surface throughput or business impact.
- If a banking / finance / healthcare domain word is in the source, keep
  it — domain expertise matters at product companies too.

Return ONLY the JSON object. No prose around it.`;

export async function translateProjectBullet(input: {
  bullet: string;
  /** Optional: role title and company name for grounding. */
  role?: string;
  company?: string;
  target_role_function?: string;
}): Promise<TranslatedBullet> {
  if (!input.bullet.trim()) {
    throw new Error("Empty bullet");
  }
  const ctx = [
    input.role ? `Role: ${input.role}` : null,
    input.company ? `Company: ${input.company}` : null,
    input.target_role_function ? `Target role function: ${input.target_role_function}` : null,
  ].filter(Boolean).join("\n");

  const text = await runWithRetry("light", async (model) => {
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{
            text: `${PROMPT}\n\n=== INPUT ===\n${ctx}\n\nBullet to translate:\n${input.bullet.trim()}`,
          }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 600,
      },
    });
    return result.response.text();
  }, { operation: "interview_project_translate" });

  const parsed = parseJsonObject<TranslatedBullet>(text);
  return {
    rewritten: (parsed.rewritten ?? "").trim(),
    follow_ups: (parsed.follow_ups ?? []).map((q) => q.trim()).filter((q) => q.length > 3).slice(0, 2),
    rationale: (parsed.rationale ?? "").trim(),
  };
}
