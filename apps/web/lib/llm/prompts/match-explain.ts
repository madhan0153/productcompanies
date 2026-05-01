import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";

export interface MatchExplanation {
  score: number; // 0–40 Gemini contribution
  strengths: string[];
  gaps: string[];
  reasoning: string;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    score: { type: SchemaType.NUMBER },
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    gaps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    reasoning: { type: SchemaType.STRING },
  },
  required: ["score", "strengths", "gaps", "reasoning"],
};

interface JobSnapshot {
  title: string;
  company: string;
  location: string;
  description: string;
  tech_stack: string[];
  seniority?: string;
  min_exp?: number;
  max_exp?: number;
}

function buildPrompt(resume: ParsedResume, job: JobSnapshot): string {
  return `You are a senior engineering recruiter assessing a candidate's fit for a role.

CANDIDATE PROFILE:
- Role: ${resume.current_role}
- Years of experience: ${resume.total_years_experience}
- Tech stack: ${resume.tech_stack.slice(0, 15).join(", ")}
- Product DNA score: ${resume.product_dna_score}/100
- Summary: ${resume.summary.slice(0, 400)}
- Companies: ${resume.companies.map((c) => `${c.name} (${c.role}, ${c.years}y, product=${c.is_product_company})`).slice(0, 4).join("; ")}

JOB:
- Title: ${job.title} at ${job.company}
- Location: ${job.location}
- Tech stack required: ${(job.tech_stack ?? []).slice(0, 15).join(", ")}
- Experience required: ${job.min_exp ?? "?"}–${job.max_exp ?? "?"}+ years
- Seniority: ${job.seniority ?? "not specified"}
- Description excerpt: ${job.description.slice(0, 600)}

Assess the match. Return:
- score: integer 0–40 representing how strong this match is from a holistic perspective (40=perfect fit)
- strengths: up to 3 short bullet points (max 12 words each) on what makes the candidate a good fit
- gaps: up to 3 short bullet points (max 12 words each) on key gaps or risks
- reasoning: one concise sentence (max 25 words) explaining the overall match quality`;
}

export async function explainMatch(resume: ParsedResume, job: JobSnapshot): Promise<MatchExplanation> {
  // 'light' tier prioritises lite/8b models (cheaper, separate quotas).
  const text = await runWithRetry("light", async (model) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(resume, job) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.2,
      },
    });
    return result.response.text();
  });

  const raw = JSON.parse(text) as MatchExplanation;
  return {
    score: Math.max(0, Math.min(40, Math.round(raw.score))),
    strengths: (raw.strengths ?? []).slice(0, 3),
    gaps: (raw.gaps ?? []).slice(0, 3),
    reasoning: raw.reasoning ?? "",
  };
}
