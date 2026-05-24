import type { ExtractedResumeContent } from "@/lib/llm/prompts/extract-resume-content";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";

export function buildDeterministicTailoredDiagnosis(input: {
  resume: ParsedResume;
  extracted: ExtractedResumeContent | null;
  jdTitle: string;
  jdMustHaves: string[];
  jdNiceToHaves: string[];
}): ResumeDiagnosis {
  const evidence = normalise(JSON.stringify({
    summary: input.resume.summary,
    tech_stack: input.resume.tech_stack,
    companies: input.resume.companies,
    products_built: input.resume.products_built,
    extracted: input.extracted,
  }));

  const missingKeywords = [...input.jdMustHaves, ...input.jdNiceToHaves]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword, index, arr) => arr.findIndex((item) => normalise(item) === normalise(keyword)) === index)
    .filter((keyword) => {
      const key = normalise(keyword);
      return key.length > 0 && !evidence.includes(key);
    })
    .slice(0, 8)
    .map((keyword) => ({
      keyword,
      presence: "absent" as const,
      rationale: "Not visible in the current resume evidence, so it was not added to the generated resume.",
    }));

  const atsRisks = input.extracted || (input.resume.companies ?? []).length > 0
    ? []
    : [{
        severity: 2 as const,
        issue: "Resume has limited extracted work-history detail, so tailoring is conservative.",
        where: "Experience",
      }];

  return {
    overall_grade: missingKeywords.length > 4 ? "C" : "B",
    headline: `Generated a conservative JD-aligned resume for ${input.jdTitle}.`,
    ats_risks: atsRisks,
    weak_bullets: [],
    missing_keywords: missingKeywords,
    recruiter_concerns: missingKeywords.length > 0
      ? ["Some JD keywords were not added because they were not backed by resume evidence."]
      : [],
  };
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").trim();
}
