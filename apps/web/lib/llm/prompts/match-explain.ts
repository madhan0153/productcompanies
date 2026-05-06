import { runWithRetry, SchemaType, type Schema } from "@/lib/llm/gemini";
import type { ParsedResume } from "./resume-parse";

// Gemini no longer contributes a numeric score to the match ranking.
// The rules engine (score.ts) owns the 0–100 score entirely.
// Gemini's job here is ONLY to produce human-readable explanations:
// strengths, gaps, and a one-line reasoning sentence.
export interface MatchExplanation {
  strengths: string[];
  gaps: string[];
  reasoning: string;
}

const SCHEMA: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    strengths: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    gaps:      { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    reasoning: { type: SchemaType.STRING },
  },
  required: ["strengths", "gaps", "reasoning"],
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
  role_function?: string;
}

function buildPrompt(resume: ParsedResume, job: JobSnapshot): string {
  const candidateFunctions = resume.target_role_functions?.join(", ") ?? resume.role_function ?? "unknown";

  return `You are a senior engineering recruiter writing a concise match assessment.

CANDIDATE:
- Current role: ${resume.current_role}
- Role function: ${resume.role_function ?? "unknown"} → targeting: ${candidateFunctions}
- Years of experience: ${resume.total_years_experience}
- Tech stack: ${resume.tech_stack.slice(0, 18).join(", ")}
- Product DNA score: ${resume.product_dna_score}/100
- Summary: ${resume.summary.slice(0, 400)}
- Work history: ${resume.companies.map((c) => `${c.name} (${c.role}, ${c.years}y, product_co=${c.is_product_company})`).slice(0, 4).join("; ")}

JOB:
- Title: ${job.title} at ${job.company}
- Role function: ${job.role_function ?? "not classified"}
- Location: ${job.location}
- Tech required: ${(job.tech_stack ?? []).slice(0, 15).join(", ")}
- Experience required: ${job.min_exp ?? "?"}–${job.max_exp ?? "?"}+ years
- Seniority: ${job.seniority ?? "not specified"}
- Description: ${job.description.slice(0, 700)}

INSTRUCTIONS:
1. The numerical score has already been computed by a rules engine — do NOT produce a score.
2. Focus your assessment on ROLE FIT: does the candidate's actual work experience align with what this job needs?
3. Over-qualification is NOT a gap. Being senior for a role is an asset.
4. Gaps should only flag skills explicitly required by the JD that the candidate clearly lacks.
5. Strengths should highlight genuine alignment — domain match, relevant tools, appropriate seniority.

Return:
- strengths: up to 3 bullet points (max 14 words each) — why this candidate fits
- gaps: up to 3 bullet points (max 14 words each) — genuine gaps based on JD requirements only  
- reasoning: one sentence (max 30 words) summarising the overall fit quality`;
}

export async function explainMatch(
  resume: ParsedResume,
  job: JobSnapshot,
): Promise<MatchExplanation> {
  const text = await runWithRetry("light", async (model) => {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildPrompt(resume, job) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SCHEMA,
        temperature: 0.15,
      },
    });
    return result.response.text();
  });

  const raw = JSON.parse(text) as MatchExplanation;
  return {
    strengths: (raw.strengths ?? []).slice(0, 3),
    gaps:      (raw.gaps ?? []).slice(0, 3),
    reasoning: raw.reasoning ?? "",
  };
}
