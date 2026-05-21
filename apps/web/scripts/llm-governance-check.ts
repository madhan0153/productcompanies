// LLM governance check.
//
// Runs in CI to catch drift between the product policy in
// /specs/prodmatch-constitution.md and the actual operations table.
//
// Current policy (per the constitution):
//   - Every LLM call site declares an operation policy.
//   - Every operation may roll over to OpenAI-compatible free providers.
//   - Every operation declares its deterministic fallback availability.
//   - Provider URLs/models live in code, not env vars.

import {
  LLM_OPERATION_POLICIES,
  PROVIDER_PRESETS,
  describeLlmRuntime,
  type LlmOperationId,
} from "@prodmatch/shared";

const REQUIRED: LlmOperationId[] = [
  "jd_parse",
  "match_explanation",
  "fit_card",
  "resume_pdf_parse",
  "resume_text_parse",
  "resume_content_extract",
  "resume_text_content_extract",
  "resume_diagnosis",
  "resume_bullet_rewrite",
  "resume_gap_fill",
  "tailored_resume",
  "negotiation_memo",
  "coach_plan",
  "job_embedding",
  "resume_embedding",
  "interview_story_generate",
  "interview_story_polish",
  "interview_readiness_score",
  "interview_project_translate",
];

const missing = REQUIRED.filter((id) => !LLM_OPERATION_POLICIES[id]);
if (missing.length > 0) {
  throw new Error(`Missing LLM operation policy: ${missing.join(", ")}`);
}

// Every operation must be either "allowed" or have an explicit reason.
// We allow "blocked" / "requires_opt_in" but require deterministicFallback to
// be declared explicitly so the UI can render a sane degraded state.
const undeclaredFallback = Object.values(LLM_OPERATION_POLICIES).filter(
  (policy) => !["available", "partial", "unavailable"].includes(policy.deterministicFallback),
);
if (undeclaredFallback.length > 0) {
  throw new Error(
    `Operations missing deterministicFallback: ${undeclaredFallback.map((p) => p.id).join(", ")}`,
  );
}

// Presets must each declare either text models OR an embedding model, plus
// a key env var. Embedding-only presets (Voyage, Jina) are valid — they're
// used by runOpenAiCompatibleEmbedding and skipped by the text router.
for (const preset of PROVIDER_PRESETS) {
  if (preset.textModels.length === 0 && preset.embeddingModel === null) {
    throw new Error(`Provider preset '${preset.id}' has neither text models nor an embedding model`);
  }
  if (!preset.keysEnvVar) {
    throw new Error(`Provider preset '${preset.id}' has no keysEnvVar`);
  }
  if (!preset.baseUrl.startsWith("http") && !preset.baseUrl.startsWith("${")) {
    throw new Error(`Provider preset '${preset.id}' baseUrl must be absolute or templated`);
  }
}

const runtime = describeLlmRuntime();
console.log(
  `llm-governance passed: ${REQUIRED.length} operations, ` +
  `${PROVIDER_PRESETS.length} presets, ` +
  `${runtime.providers.length} provider(s) configured at runtime`,
);
