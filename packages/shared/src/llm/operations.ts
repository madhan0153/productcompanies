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
  | "resume_text_parse"
  | "resume_content_extract"
  | "resume_text_content_extract"
  | "resume_diagnosis"
  | "resume_bullet_rewrite"
  | "resume_gap_fill"
  | "tailored_resume"
  | "negotiation_memo"
  | "coach_plan"
  | "job_embedding"
  | "resume_embedding"
  | "interview_story_generate"
  | "interview_story_polish"
  | "interview_readiness_score"
  | "interview_project_translate";

export interface LlmOperationPolicy {
  id: LlmOperationId;
  label: string;
  capability: LlmCapability;
  sensitivity: LlmSensitivity;
  preferredTier: "light" | "heavy" | "embedding";
  /**
   * Whether the operation may roll over from Gemini to OpenAI-compatible
   * free providers (Groq, OpenRouter, Cerebras, Together, etc.).
   *
   * Product decision (recorded in /specs/prodmatch-constitution.md):
   *
   *   All operations default to "allowed". The product owner accepts that:
   *     - Resume PDFs, parsed facts, and derived artifacts may flow through
   *       any OpenAI-compatible provider in the configured chain when
   *       Gemini's daily quotas are exhausted.
   *     - The candidate is the data principal and has already consented to
   *       sharing their resume with prospective employers; routing through
   *       an inference provider for matching is a derived processor use.
   *
   *   Operators who later want to enforce stricter routing can either:
   *     1. Stop providing API keys for the providers they want to exclude, OR
   *     2. Set `LLM_FORCE_BLOCK_FREE_PROVIDERS=true` in env (kill switch).
   */
  freeProviderDefault: "allowed" | "requires_opt_in" | "blocked";
  /**
   * Does a non-LLM heuristic fallback exist?
   *   "available"  — full feature still works without LLM.
   *   "partial"    — feature degraded but usable.
   *   "unavailable" — feature blocked; user sees a "try again later" state.
   */
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
    notes: "Official job descriptions are public; safe to route through any free provider.",
  },
  match_explanation: {
    id: "match_explanation",
    label: "Generic match explanation",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Uses parsed resume facts. Rolls to free providers when Gemini exhausts.",
  },
  fit_card: {
    id: "fit_card",
    label: "Fit Card",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Rule-based summary kept as last-resort fallback to keep the UI useful.",
  },
  resume_pdf_parse: {
    id: "resume_pdf_parse",
    label: "Resume PDF parsing",
    capability: "pdf_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Multimodal PDF parse. Prefers Gemini; only providers with PDF support are attempted on rollover. Falls through to resume_text_parse when no PDF-capable provider is available.",
  },
  resume_text_parse: {
    id: "resume_text_parse",
    label: "Resume parsing (text fallback)",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Text-only resume parse. Server extracts text from the PDF first, then any text-capable provider can fulfil it. Lower quality than multimodal Gemini (no table / layout signal) but keeps resume parse working when Gemini exhausts.",
  },
  resume_content_extract: {
    id: "resume_content_extract",
    label: "Resume content extraction",
    capability: "pdf_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Extracts verbatim resume bullets from PDF; requires PDF-capable provider on rollover. Falls through to resume_text_content_extract when no PDF-capable provider is available.",
  },
  resume_text_content_extract: {
    id: "resume_text_content_extract",
    label: "Resume content extraction (text fallback)",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Text-only verbatim bullet extraction. Used when no PDF-capable provider is available.",
  },
  resume_diagnosis: {
    id: "resume_diagnosis",
    label: "Resume diagnosis",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Text-only; rolls to any free provider when Gemini exhausts.",
  },
  resume_bullet_rewrite: {
    id: "resume_bullet_rewrite",
    label: "Resume bullet rewrite",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Bullet-level rewrite using parsed text; rolls freely.",
  },
  resume_gap_fill: {
    id: "resume_gap_fill",
    label: "Resume gap fill",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Whole-resume gap analysis; rolls freely.",
  },
  tailored_resume: {
    id: "tailored_resume",
    label: "Tailored resume",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Per-job rewrite; rolls freely.",
  },
  negotiation_memo: {
    id: "negotiation_memo",
    label: "Negotiation memo",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Comp + parsed resume facts; rolls freely.",
  },
  coach_plan: {
    id: "coach_plan",
    label: "Coach plan",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Market aggregates + candidate stack/seniority.",
  },
  job_embedding: {
    id: "job_embedding",
    label: "Job embedding",
    capability: "embedding",
    sensitivity: "public_jd",
    preferredTier: "embedding",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Public JD text; falls back through Together → deterministic hash vector.",
  },
  resume_embedding: {
    id: "resume_embedding",
    label: "Resume embedding",
    capability: "embedding",
    sensitivity: "derived_resume_facts",
    preferredTier: "embedding",
    freeProviderDefault: "allowed",
    deterministicFallback: "available",
    notes: "Derived resume facts (not raw PDF); rolls freely.",
  },
  interview_story_generate: {
    id: "interview_story_generate",
    label: "Interview Lab — STAR story generation",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "heavy",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Generates 8-10 STAR stories from parsed resume + extracted bullets. One call per user, cached on resume_signature.",
  },
  interview_story_polish: {
    id: "interview_story_polish",
    label: "Interview Lab — single-story polish",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Per-story polish when the user edits the situation/task/action/result.",
  },
  interview_readiness_score: {
    id: "interview_readiness_score",
    label: "Interview Lab — readiness score",
    capability: "text_json",
    sensitivity: "derived_resume_facts",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "partial",
    notes: "Returns 4 sub-scores (DSA / SD / Behavioral / Domain) and weekly actions. Deterministic fallback uses parsed-resume facts only.",
  },
  interview_project_translate: {
    id: "interview_project_translate",
    label: "Interview Lab — project translator",
    capability: "text_json",
    sensitivity: "resume_pii",
    preferredTier: "light",
    freeProviderDefault: "allowed",
    deterministicFallback: "unavailable",
    notes: "Rewrites a service-co bullet for product-co interview register. Per click; small output.",
  },
};

export function getLlmOperationPolicy(id: LlmOperationId): LlmOperationPolicy {
  return LLM_OPERATION_POLICIES[id];
}

export function mayUseFreeProviderByDefault(id: LlmOperationId): boolean {
  return getLlmOperationPolicy(id).freeProviderDefault === "allowed";
}
