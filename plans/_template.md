# Implementation Plan — {feature-name}

> Copy to `plans/<feature-slug>.md`. References the matching `specs/<feature-slug>.md`.
> Plans answer **how**; specs answer **what** and **why**. Keep this file
> short: bullet the phases, leave the prose for the spec.

## Linked spec

`specs/<feature-slug>.md`

## Phases

Order matters. Each phase ships independently and is reviewable on its own.

### Phase 1 — {title}

- **Goal:**
- **Files touched:**
- **Risk:** low / medium / high
- **Validation gate:** typecheck + lint + new tests

### Phase 2 — {title}

- **Goal:**
- **Files touched:**
- **Risk:**
- **Validation gate:**

### Phase 3 — {title}

…

## Rollback plan

If this lands and breaks something, what's the smallest revert? Usually one
or two specific commits — list them. Schema rollbacks are NOT a thing:
add-column-if-not-exists is forward-only, so plan the rollback as a
follow-up that nullifies behaviour, not a `DROP COLUMN`.

## Open questions

Things you want a second opinion on before the first phase merges.
