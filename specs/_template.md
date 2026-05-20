# Feature Spec — {feature-name}

> Copy this file to `specs/<feature-slug>.md` for every new feature. Fill in
> every section; sections that don't apply get "N/A" with a one-line reason.
> The PR template (`.github/PULL_REQUEST_TEMPLATE.md`) checks these.

## Constitution touchpoints

Tick every rule in `specs/prodmatch-constitution.md` that this feature touches:

- [ ] 1. 18 approved companies only
- [ ] 2. Official career pages / APIs only
- [ ] 3. No demo / synthetic jobs
- [ ] 4. Schema changes are idempotent + in `supabase/schema.sql` only
- [ ] 5. No PII / token / key logging
- [ ] 6. Resume artifacts stay owner-scoped (RLS)
- [ ] 7. Mobile-first UX is the primary acceptance path
- [ ] 8. New LLM calls declare an operation policy
- [ ] 9. Provider URLs / models stay in code, not env
- [ ] 10. Crawler/matching degrade gracefully when LLMs exhaust

## Problem

What does the user (or operator) currently struggle with?
What signal triggered this? (analytics, support ticket, your own dogfood, etc.)

## User outcome

- **Primary persona:**
- **Mobile-first journey** (step-by-step screen path):
- **Done-when** acceptance criteria:

## Data model

- Tables / views touched (`public.*`):
- Storage buckets touched:
- RLS policies added or modified:
- New columns (idempotent `ADD COLUMN IF NOT EXISTS`):

## LLM impact

- New `LlmOperationId`(s) added to `packages/shared/src/llm/operations.ts`:
- Capability (text_json / pdf_json / embedding):
- Sensitivity (public_jd / derived_resume_facts / resume_pii):
- Deterministic fallback (available / partial / unavailable):
- Estimated calls per active user per day:

## Privacy

- Inputs to LLMs (list the fields):
- Anything logged (assert against constitution rule 5):
- DPDP disclosures to update? Y / N — link to the diff if yes:

## Abuse / rate-limit story

- Per-user rate limit (and where it's enforced):
- Per-request size cap:
- Cost ceiling if the request goes through paid providers:

## Tests required

- Unit tests touching parser / scoring / mapper:
- E2E (Playwright) covering the mobile-first happy path:
- A test that proves the company-source invariant still holds (if crawler touched):

## Out of scope

What this spec explicitly does NOT cover. Link the follow-up spec if there is one.
