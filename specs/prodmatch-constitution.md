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
9. **Provider URLs, model cascades, and capabilities live in code only.** Operators set API keys in env vars; nothing else.
10. If LLM providers are exhausted, crawler and matching must degrade instead of blocking the product.

## Feature Spec Checklist

Before implementing a new feature, write down:

- User outcome and mobile-first screen path.
- Tables, storage buckets and RLS/policy impact.
- LLM operation id and fallback mode.
- Abuse/rate-limit story.
- PII/logging story.
- Tests or scripts that prove the company-source invariant still holds.

## LLM Routing Policy

Gemini remains the primary provider for multimodal PDF parsing and structured generation.
When Gemini's daily quotas are exhausted, every operation may roll over to any configured
OpenAI-compatible free provider (Groq, OpenRouter, Cerebras, Together, FreeLLMAPI).

The product owner has accepted that:

- Resume PDFs (when the provider supports PDF input), parsed resume facts, and derived
  resume artifacts may flow through any provider in the configured chain.
- The candidate is the data principal and has already consented to sharing their resume
  with prospective employers; routing through an inference provider for matching is a
  derived processor use.
- DPDP disclosures must list the configured providers so users can see where their data
  may be processed when Gemini is exhausted.

Operational controls remain:

- `LLM_FORCE_BLOCK_FREE_PROVIDERS=true` — emergency kill switch; disables the entire
  OpenAI-compatible chain regardless of which keys are set.
- Not providing API keys for a provider keeps it out of the chain.

## Configuration Surface

Providers, URLs, model cascades and capabilities live in
`packages/shared/src/llm/providers-preset.ts`. To add a new provider, append an entry to
`PROVIDER_PRESETS` with its `keysEnvVar` and a model cascade — the router will
auto-include it the moment an operator sets the env var. No URL, model or capability
env vars exist by design.

## Degraded Mode

`LLM_ENABLE_DETERMINISTIC_FALLBACKS=true` (default) keeps the crawler and matching
useful when every Gemini and free-provider key is exhausted:

- JD parse falls back to deterministic extraction from title/body.
- Job/resume embeddings fall back to deterministic hash vectors.
- Match explanation and Fit Card fall back to rule-based summaries.

This is intentionally less rich than LLM output but keeps ProdMatch operational without
inventing jobs or leaking private data.
