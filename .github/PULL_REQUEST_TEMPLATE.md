# PR — {short-imperative-title}

> Asserts the ProdMatch constitution
> (`specs/prodmatch-constitution.md`). Reviewers will check the boxes
> below before approving.

## Summary

What changed and why, in 1–3 sentences. Link the spec if there is one.

- Spec: `specs/<feature-slug>.md` (or N/A — explain why)
- Plan: `plans/<feature-slug>.md` (or N/A)

## Constitution checklist

The non-negotiables. Tick every item; the reviewer will spot any that lie.

- [ ] **R1 · 51 approved companies only** — no unapproved companies added, no aggregator domains introduced
- [ ] **R2 · Official career pages / APIs only** — no LinkedIn / Naukri / Indeed / Glassdoor / Foundit / Monster strings anywhere
- [ ] **R3 · No demo / synthetic / seed jobs** — the `jobs` table still starts empty, populated only by the crawler
- [ ] **R4 · Schema is idempotent + single file** — all Supabase changes are in `supabase/schema.sql`, every new artifact uses `IF NOT EXISTS` / `CREATE OR REPLACE` / the `duplicate_object` catch
- [ ] **R5 · No PII / token / key logging** — `git diff` reviewed for `console.log(` near resume fields, auth tokens, prompts, responses, API keys
- [ ] **R6 · Resume artifacts stay owner-scoped** — RLS on every new `resume_*` / user-data table; never queried with service-role on a path the user can hit
- [ ] **R7 · Mobile-first** — every new screen tested at 375 × 667; reduced-motion path checked
- [ ] **R8 · LLM operations declared** — every new Gemini / OpenAI-compatible call declares an `LlmOperationId` in `packages/shared/src/llm/operations.ts`
- [ ] **R9 · Provider URLs / models in code** — no new `LLM_PROVIDER_*_BASE_URL` / `*_MODEL` env var added; everything is in `providers-preset.ts`
- [ ] **R10 · Degrades gracefully** — if every LLM provider is dead, the crawler still ingests jobs and the matching still ranks (deterministic fallback exercised by tests or noted in the spec)

## Validation

Tick what was actually run on this branch (paste the last line of output if non-obvious):

- [ ] `pnpm -r typecheck`
- [ ] `pnpm --filter web lint`
- [ ] `pnpm --filter web build`
- [ ] `pnpm test:crawler` — fingerprint / adaptive / parser
- [ ] `pnpm test:resilience` — admin scoring
- [ ] `pnpm test:resume-mapper` — JSON Resume mapper
- [ ] `pnpm test:llm-runtime` — provider router + deterministic embed
- [ ] `pnpm test:llm-governance` — operation policies + presets
- [ ] `pnpm test:crawler-invariants` — 51-company boundary, banned domains
- [ ] `pnpm --filter web test:e2e` — golden path (if UI touched)

## Out-of-scope follow-ups

Anything you noticed but explicitly did NOT touch. Open a tracking issue or a TODO in `tasks/`.

## Risk + rollback

- Risk class: low / medium / high
- Smallest revert: `git revert <sha>` of …
- Anything operators need to do post-merge (run schema, set env var, etc.):
