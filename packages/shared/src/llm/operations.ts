export type LlmCapability = "text_json" | "pdf_json" | "embedding";

export type LlmSensitivity =
  | "public_jd"
  | "derived_resume_facts"
  | "resume_pii";

export type LlmOperationId =
  | "jd_parse"
  | "match_explanation"
  | "fit_card"
  | "resume_pdf_parse"
  | "resume_content_extract"
  | "resume_diagnosis"
  | "resume_bullet_rewrite"
  | "resume_gap_fill"
  | "tailored_resume"
  | "negotiation_memo"
  | "coach_plan"
  | "job_embedding"
  | "resume_embedding";

export interface LlmOperationPolicy {
  id: LlmOperationId;
  label: string;
  capability: LlmCapability;
  sensitivity: LlmSensitivity;
  preferredTier: "light" | "heavy" | "embedding";
  freeProviderDefault: "allowed" | "requires_opt_in" | "blocked";
  deterministicFallback: "available" | "partial" | "unavailable";
  notes: string;
}

export const LLM_OPERATION_POLICIES: Record<LlmOperationId, LlmOperationPolicy> = {
  jd_parse: {
    id: "jd_parse",
    label: "JD parse",
    capability: "text_json",
    sensitivity: "public_jd",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Official job descriptions are public source data; safe to route through approved free text providers.",
  },
  match_explanation: {
    id: "match_explanation",
    label: "Generic match explanation",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "available",
    notes: "Uses parsed resume facts. Enable external fallback only after accepting provider privacy terms.",
  },
  fit_card: {
    id: "fit_card",
    label: "Fit Card",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "available",
    notes: "Uses parsed resume facts plus public JD facts. Deterministic fallback preserves UX if LLM quota is gone.",
  },
  resume_pdf_parse: {
    id: "resume_pdf_parse",
    label: "Resume PDF parsing",
    capability: "pdf_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "unavailable",
    notes: "Raw PDF is PII. Only route to non-Gemini providers when explicitly opted in and provider supports PDF input.",
  },
  resume_content_extract: {
    id: "resume_content_extract",
    label: "Resume content extraction",
    capability: "pdf_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "unavailable",
    notes: "Extracts verbatim resume bullets from PDF; keep providers tightly controlled.",
  },
  resume_diagnosis: {
    id: "resume_diagnosis",
    label: "Resume diagnosis",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Includes raw resume text. External fallback is privacy-sensitive and disabled by default.",
  },
  resume_bullet_rewrite: {
    id: "resume_bullet_rewrite",
    label: "Resume bullet rewrite",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Contains individual resume bullets. Requires explicit opt-in for free-provider routing.",
  },
  resume_gap_fill: {
    id: "resume_gap_fill",
    label: "Resume gap fill",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Uses resume-wide structure and should stay on trusted providers unless explicitly opted in.",
  },
  tailored_resume: {
    id: "tailored_resume",
    label: "Tailored resume",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Generates a user-owned artifact from resume facts; external fallback requires privacy opt-in.",
  },
  negotiation_memo: {
    id: "negotiation_memo",
    label: "Negotiation memo",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "heavy",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Uses comp fields and parsed resume facts; external fallback requires opt-in.",
  },
  coach_plan: {
    id: "coach_plan",
    label: "Coach plan",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "partial",
    notes: "Uses aggregate market data plus candidate stack/seniority.",
  },
  job_embedding: {
    id: "job_embedding",
    label: "Job embedding",
    capability: "embedding",
    sensitivity: "public_jd",
    preferredTier: "embedding",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Public JD text can use embedding providers; deterministic vector fallback keeps matching online.",
  },
  resume_embedding: {
    id: "resume_embedding",
    label: "Resume embedding",
    capability: "embedding",
    sensitivity: "derived_resume_facts",
    preferredTier: "embedding",
    freeProviderDefault: "requires_opt_in",
    deterministicFallback: "available",
    notes: "Embeds derived resume facts, not raw PDF text; external fallback still requires explicit opt-in.",
  },
};

export function getLlmOperationPolicy(id: LlmOperationId): LlmOperationPolicy {
  return LLM_OPERATION_POLICIES[id];
}

export function mayUseFreeProviderByDefault(id: LlmOperationId): boolean {
  return getLlmOperationPolicy(id).freeProviderDefault === "allowed";
}
