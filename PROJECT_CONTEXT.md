# ProdMatch.ai Project Context

Last updated: 2026-05-20

This file is a handoff brief for any coding agent taking over the repo.
It summarizes the product rules, current architecture, operational setup, and
branch state. Do not put secrets, API keys, resume content, or user PII in this
file.

## Product

ProdMatch.ai is an India-first AI SaaS that matches Indian engineers to
high-package software/product engineering roles at exactly 18 approved product
companies.

Approved companies only:

Google, Microsoft, Meta, Amazon, Apple, Atlassian, NVIDIA, Oracle, Salesforce,
SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart.

Hard constraints:

- Jobs must come only from official career pages.
- No aggregators such as LinkedIn, Naukri, Indeed, or Glassdoor.
- No demo or seed jobs. `jobs` starts empty and is populated by the crawler.
- Compensation is in LPA and the product is India-first.
- Every match must be explainable with strengths, gaps, reasoning, and score
  evidence.
- Never log resume text, parsed resume fields, auth tokens, service-role keys,
  or PII.
- Resumes and generated resume artifacts live in private Supabase Storage
  buckets with owner-only access.
- All schema lives in one idempotent SQL file: `supabase/schema.sql`.

## Repo Shape

- `apps/web`: Next.js App Router app, UI, API routes, server actions, auth,
  resume parsing, matching, DPDP settings, emails, cron endpoints.
- `packages/crawler`: Playwright-based official career page crawler and ingest
  pipeline.
- `packages/shared`: shared Zod schemas, LLM response schemas, scoring helpers,
  and cross-boundary TypeScript types.
- `supabase/schema.sql`: single consolidated idempotent schema.
- `.github/workflows/crawl.yml`: daily crawler and post-crawl recompute job.
- `apps/web/vercel.json`: Vercel cron config.

## Tech Stack

- Monorepo package manager: `pnpm@9.12.0`
- Node: `>=20`
- Web: Next.js 16.2.4, React 19.2.5, TypeScript strict, Tailwind, shadcn-style
  components, Framer Motion, lucide icons.
- Database/Auth/Storage: Supabase Postgres, Auth, Storage, RLS.
- LLM: Google Gemini via `@google/generative-ai`, wrapped in `apps/web/lib/llm`
  and crawler pipeline modules.
- Email: Resend + React Email.
- Hosting: Vercel.
- Crawler: Playwright, daily GitHub Actions workflow.

## Current Branch State

Current checked-out branch at the time of this handoff:

- `main` at `82899c8` (`Harden enterprise match ranking`)

Important pushed feature branches:

- `phase-1-critical-resume-compute-hardening`
  - Head: `81cec8a`
  - Commit: `feat: add durable resume and match job state`
  - Adds durable resume/match job state foundations.

- `phase-2-mobile-reliability-ux`
  - Head: `022dfea`
  - Commit: `feat: harden resume matching reliability`
  - Adds mobile reliability UX, background job queue drain, PDF validation,
    structured logging, idempotency/rate-limit improvements, and role taxonomy
    benchmark coverage.
  - PR creation URL:
    `https://github.com/madhan0153/productcompanies/pull/new/phase-2-mobile-reliability-ux`

Local untracked files seen during this handoff:

- `AGENTS.md`
- `Donthula_sathwik_resume.pdf`
- `crawler_logs_today.txt`

Do not stage or modify those unless the user explicitly asks.

## Commands

Install:

```bash
pnpm install
```

Run web locally:

```bash
pnpm dev
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

Typecheck:

```bash
pnpm typecheck
```

Run crawler locally:

```bash
pnpm crawl
```

Web E2E:

```bash
pnpm --filter web test:e2e
```

## Validation History

Recent Phase 2-4 branch validation passed with:

- `pnpm install`
- `pnpm -r typecheck`
- `pnpm --filter web lint`
- `pnpm test:role-benchmarks`
- `pnpm --filter web test:e2e`
- `pnpm --filter web build`

Known lint/build notes:

- Existing lint warnings may appear; they were not blockers in the last pass.
- Next.js may warn that middleware convention is deprecated.
- Build artifacts such as `.next` and `tsconfig.tsbuildinfo` can appear after
  local builds. Avoid committing generated artifacts unless the repo already
  intentionally tracks them.

## Environment Variables

Client-side required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

Server-side optional/required depending on feature:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `CRON_SECRET`
- `DPDP_POLICY_VERSION`
- `ADMIN_EMAILS`

Never expose `SUPABASE_SERVICE_ROLE_KEY`, Gemini keys, Resend keys, or cron
secrets to the browser.

## Auth Setup

Supabase Auth is the app auth layer. The app supports:

- Google OAuth through Supabase.
- Email magic-link login as a fallback.

Current known Supabase project URL used locally:

- `https://wmnuinlnsisifalgrpui.supabase.co`

Google OAuth setup for this Supabase project:

- Google OAuth client type: Web application.
- Authorized redirect URI:
  `https://wmnuinlnsisifalgrpui.supabase.co/auth/v1/callback`
- Authorized JavaScript origins:
  - `https://prodmatchai.vercel.app`
  - `http://localhost:3000`
- Supabase Auth Provider: enable Google and paste the new Google client ID and
  client secret.
- Supabase Auth URL configuration:
  - Site URL: `https://prodmatchai.vercel.app`
  - Redirect URLs:
    - `https://prodmatchai.vercel.app/auth/callback`
    - `http://localhost:3000/auth/callback`

Important OAuth incident context:

- A previous Google Cloud/OAuth client returned `Error 401: disabled_client`.
- The visible Google Account restriction said Google Cloud Platform access was
  restricted as of 2026-05-20.
- The fix path was to use a compliant new Google Auth Platform/OAuth client and
  wire that client into Supabase Auth.
- If Google shows "OAuth access is restricted to the test users listed on your
  OAuth consent screen", that is normal for Testing mode. Add the user's email
  under OAuth consent screen test users, or publish/verify the app before public
  use.
- Gemini API keys are separate from Google OAuth credentials. Gemini powers
  parsing/scoring after login; Google OAuth powers login.

## Supabase Schema

All schema changes must go into `supabase/schema.sql` and remain idempotent.

Patterns to preserve:

- `create table if not exists`
- `alter table ... add column if not exists`
- `create index if not exists`
- `drop policy if exists` before policy recreation
- `create or replace function`
- enum additions with idempotent handling
- `on conflict` for seed/company upserts

Tables/features currently represented include:

- `companies`
- `jobs`
- `profiles`
- `consents`
- `matches`
- `applications`
- `interview_notes`
- `stories`
- `offers`
- `digest_subscriptions`
- `crawl_runs`
- `dpdp_events`
- resume versions and generated resume artifacts
- tailored resumes and negotiation memos
- enhanced resume intelligence tables
- cron locks
- match quality/confidence/feedback fields

Storage buckets include:

- `resumes`
- `tailored-resumes`
- `enhanced-resumes`

All resume buckets are private and owner-scoped by `auth.uid()` path prefix.

## Crawler

Crawler rules:

- Crawl only the 18 approved companies.
- Use only official careers pages or official company APIs.
- Never ingest aggregator jobs.
- The daily workflow runs at 02:00 IST (`30 20 * * *` UTC previous day).
- The crawler runs sequentially to avoid Gemini free-tier rate-limit bursts.
- `CRAWL_RUN_ID` is passed through GitHub Actions for log correlation.
- Optional drift alerts use `CRAWL_ALERT_WEBHOOK_URL`.

Crawler secrets required in GitHub Actions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

Optional:

- `CRAWL_ALERT_WEBHOOK_URL`

## Matching and Resume Flow

High-level flow:

1. User signs in through Supabase Auth.
2. User uploads resume PDF to private Supabase Storage.
3. Server parses resume with Gemini and persists structured profile/resume
   fields.
4. Matching engine compares resume/profile against active jobs.
5. Match rows include score, fit evidence, strengths, gaps, reasoning, verdicts,
   score breakdown, confidence, and optional hidden/dismissed state.
6. Job details and match cards explain why a role is a fit or gap.
7. Apply toolkit can generate tailored resume artifacts and negotiation memos.

Privacy requirements:

- No resume content in logs.
- No parsed resume PII in logs.
- Use service-role key only in server-side code.
- Generated resume files must stay owner-readable only.

## Cron and Background Work

Vercel cron config in `apps/web/vercel.json`:

- `/api/cron/digest`: weekly digest, Monday 02:30 UTC in current config.
- `/api/cron/recompute-matches`: daily recompute endpoint.

GitHub Actions also calls `/api/cron/recompute-matches` after crawler runs, using
`APP_URL` and `CRON_SECRET`.

Phase 2-4 branch adds `/api/cron/drain-background-jobs` for durable background
job queue draining. If adopting that branch, make sure Vercel cron and secrets
are aligned with the desired production queue behavior.

## UI Notes

- App routes live under `apps/web/app`.
- Auth routes live under `apps/web/app/auth`.
- Main authenticated app shell lives under `apps/web/app/(app)`.
- Mobile-first flows matter. Match cards, dashboard, profile, resume upload, and
  job detail pages should be checked on mobile widths.
- Framer Motion usage must respect `prefers-reduced-motion`.
- Use lucide icons where suitable.
- Do not add marketing-style landing pages when the task is app functionality.

## Agent Working Rules

When continuing work:

- Read existing code before editing.
- Keep changes scoped.
- Prefer repo patterns and shared utilities.
- Do not split SQL migrations.
- Do not add demo jobs.
- Do not expand beyond the 18 approved companies.
- Do not log PII.
- Do not revert user/unrelated changes.
- Use one branch for related phase work unless the user asks otherwise.
- Before pushing, run the narrowest useful validation plus typecheck/build when
  touching shared behavior.

Recommended pre-push checklist:

```bash
pnpm -r typecheck
pnpm --filter web lint
pnpm --filter web build
```

Add E2E or targeted tests when touching auth, resume upload, matching, crawler,
or job detail flows.
