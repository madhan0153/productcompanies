# ProdMatch.ai Constitution

Spec Kit inspired operating rules for future agents and human changes.

## Non-Negotiables

1. Jobs come only from the 18 approved companies in `AGENTS.md`.
2. Jobs come only from official career pages or official company APIs.
3. No demo jobs, synthetic jobs, aggregators or service-company expansion.
4. All Supabase schema changes stay in `supabase/schema.sql` and remain idempotent.
5. Resume PDFs, parsed resume fields, auth tokens, API keys and PII are never logged.
6. Private resume artifacts stay owner-scoped in Supabase Storage.
7. Mobile-first UX is the primary acceptance path.
8. Every LLM feature must declare an operation policy in `packages/shared/src/llm/operations.ts`.
9. External free-provider routing for resume-derived or raw resume data requires explicit env opt-in.
10. If LLM providers are exhausted, crawler and matching must degrade instead of blocking the product.

## Feature Spec Checklist

Before implementing a new feature, write down:

- User outcome and mobile-first screen path.
- Tables, storage buckets and RLS/policy impact.
- LLM operation id, data sensitivity and fallback mode.
- Abuse/rate-limit story.
- PII/logging story.
- Tests or scripts that prove the company-source invariant still holds.

## LLM Routing Policy

Gemini remains the primary provider for multimodal PDF parsing and structured generation.
OpenAI-compatible free providers may be configured as fallback for public JD parsing and
other operations where the env privacy gate allows it.

Raw resume PDF/text operations are disabled for external free providers by default. Enable
`LLM_ALLOW_FREE_PROVIDER_RESUME_PII=true` only after reviewing provider retention terms and
updating user-facing privacy disclosures.

## Degraded Mode

`LLM_ENABLE_DETERMINISTIC_FALLBACKS=true` keeps the crawler and matching useful when every
LLM key is exhausted:

- JD parse falls back to deterministic extraction from title/body.
- Job/resume embeddings fall back to deterministic hash vectors.
- Match explanation and Fit Card fall back to rule-based summaries.

This is intentionally less rich than LLM output but keeps ProdMatch operational without
inventing jobs or leaking private data.
