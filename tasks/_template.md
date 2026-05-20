# Task Breakdown — {feature-name}

> Copy to `tasks/<feature-slug>.md`. One row per discrete task. Tasks
> should be small enough to fit in a single PR / single agent session.

## Linked plan

`plans/<feature-slug>.md`

## Task list

| # | Task | Owner | Status | Files touched | Notes |
|---|------|-------|--------|---------------|-------|
| 1 | … | claude / human | pending / in_progress / done | `path/to/file.ts` | … |
| 2 | … | | | | |
| 3 | … | | | | |

## Definition of done (per task)

- [ ] Code change compiles (`pnpm -r typecheck`)
- [ ] Lint clean (`pnpm --filter web lint`)
- [ ] Relevant tests run green
- [ ] No new dependency added without note in the spec
- [ ] No PII / token / key in the diff
- [ ] No aggregator domain string introduced
- [ ] All `LlmOperationId` references resolved
