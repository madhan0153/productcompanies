import {
  LLM_OPERATION_POLICIES,
  describeLlmRuntime,
  type LlmOperationId,
} from "@prodmatch/shared";

const REQUIRED: LlmOperationId[] = [
  "jd_parse",
  "match_explanation",
  "fit_card",
  "resume_pdf_parse",
  "resume_content_extract",
  "resume_diagnosis",
  "resume_bullet_rewrite",
  "resume_gap_fill",
  "tailored_resume",
  "negotiation_memo",
  "coach_plan",
  "job_embedding",
  "resume_embedding",
];

const missing = REQUIRED.filter((id) => !LLM_OPERATION_POLICIES[id]);
if (missing.length > 0) {
  throw new Error(`Missing LLM operation policy: ${missing.join(", ")}`);
}

const unsafeByDefault = Object.values(LLM_OPERATION_POLICIES).filter(
  (policy) => policy.sensitivity !== "public_jd" && policy.freeProviderDefault === "allowed",
);
if (unsafeByDefault.length > 0) {
  throw new Error(
    `Non-public operations allow free providers by default: ${unsafeByDefault.map((p) => p.id).join(", ")}`,
  );
}

const runtime = describeLlmRuntime();
const piiExternal = runtime.operations.filter(
  (op) => op.sensitivity === "resume_pii" && op.externalFallback === "allowed",
);

if (piiExternal.length > 0 && process.env.LLM_ALLOW_FREE_PROVIDER_RESUME_PII !== "true") {
  throw new Error("Resume PII external fallback appears enabled without explicit env opt-in");
}

console.log(`llm-governance passed: ${REQUIRED.length} operations, ${runtime.providers.length} external provider(s) configured`);
