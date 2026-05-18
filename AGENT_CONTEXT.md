# ProdMatch.ai — Complete Agent Context

---

## What This Product Is

**ProdMatch.ai** is a live, production India-first AI SaaS platform that matches Indian software engineers to high-package roles at exactly 18 approved product companies. It is NOT a job board. It is a personalised matching engine — upload your resume, get ranked matches with explainable scores (strengths, gaps, reasoning), track applications, and receive weekly email digests of new relevant roles.

**Live monorepo:** `c:\Users\user\.antigravity\productcompanies`  
**Platform:** Vercel (Next.js web app) + GitHub Actions (daily crawler)  
**Database:** Supabase (PostgreSQL, region `ap-south-1`)  
**Owner:** Madhan

---

## Hard Rules (NEVER violate)

1. **Only 18 approved companies** — Google, Microsoft, Meta, Amazon, Apple, Atlassian, Nvidia, Oracle, Salesforce, SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart. No others. No service/outsourcing companies. Ever.
2. **Official career pages only** as job source. No aggregators (LinkedIn, Naukri, Indeed, Glassdoor).
3. **No demo/seed jobs.** The `jobs` table starts empty. All jobs come from the daily Crawlee+Playwright crawler.
4. **Idempotent SQL only.** All schema lives in `supabase/schema.sql`. Use `IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO ...`. Safe to re-run multiple times in the Supabase SQL editor.
5. **Single SQL file.** Never split schema into migrations. Everything is `supabase/schema.sql`.
6. **DPDP Act 2023 compliance.** Granular per-purpose consent, right-to-export, right-to-erasure, append-only audit trail. Never log PII, resume content, or parsed profile fields.
7. **India-first.** Compensation in LPA. Hubs: Bengaluru, Hyderabad, Pune, Gurugram, Noida, Delhi NCR, Mumbai, Chennai, Remote-India.
8. **Explainability.** Every match shows `strengths`, `gaps`, `reasoning`. Never show an opaque score.
9. **Animations respect `prefers-reduced-motion`.** All Framer Motion components must check it.
10. **TypeScript strict mode.** No `any` without justification. Server components by default; `"use client"` only when needed.

---

## Repo Layout

```
productcompanies/
├── apps/web/                    Next.js 15 app (UI + API routes)
├── packages/crawler/            Crawlee + Playwright job ingestion
├── packages/shared/             Zod schemas + shared TS types + Gemini client
├── supabase/schema.sql          Complete idempotent DB schema
├── .github/workflows/crawl.yml  Daily crawler (02:00 IST, 5 parallel groups)
├── CLAUDE.md                    Hard project rules
└── AGENT_CONTEXT.md             This file
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS, shadcn/ui, Framer Motion, next-themes (dark default) |
| Auth | Supabase Auth (Google OAuth + magic link) |
| Database | PostgreSQL via Supabase, ap-south-1 region |
| Storage | Supabase Storage (private bucket `resumes`, only owner can read) |
| LLM | Google Gemini API (free tier) — Gemini 2.0 Flash (resume parse, fit cards), Flash-Lite (bulk JD parse, scoring), `text-embedding-004` (semantic embeddings) |
| Crawler | Crawlee + Playwright, GitHub Actions, daily 02:00 IST, 5 parallel matrix groups |
| Email | Resend + React Email templates |
| Hosting | Vercel (Next.js app + cron jobs) |
| Testing | Playwright E2E |
| Monorepo | pnpm workspaces |
| Package manager | pnpm |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Gemini — comma-separated for round-robin key rotation
GEMINI_API_KEY=key1,key2,key3

# Resend (email)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=ProdMatch.ai <noreply@yourdomain.com>

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# DPDP — increment when privacy policy changes
DPDP_POLICY_VERSION=1

# Cron auth (Bearer token for /api/cron/* routes)
CRON_SECRET=<openssl rand -hex 32>

# Crawler-specific (set in GitHub Actions secrets)
APP_URL=https://your-app.vercel.app
PARSE_BUDGET_PER_RUN=150   # optional: max Gemini parses per crawler group run
```

---

## Database Schema (key tables)

All schema is in `supabase/schema.sql` — one idempotent file, safe to re-run.

### `companies`
18 rows, seeded by `schema.sql`. Contains: `id`, `slug`, `name`, `careers_url`, `logo_url`, `hubs text[]`, `crawler_config jsonb`.

### `jobs`
Core table. Every crawled job. Key columns:
- `id uuid`, `company_id uuid → companies`
- `external_id text` — company's own job ID (for dedup)
- `signature text` — SHA256 of description (detects changes)
- `title`, `description`, `apply_url`, `location`, `hubs text[]`, `remote boolean`
- `seniority seniority_level` — enum: `intern, junior, mid, senior, staff, principal, lead, manager, director, vp`
- `min_experience_years`, `max_experience_years`, `comp_lpa_min`, `comp_lpa_max`
- `tech_stack text[]`
- `is_active boolean` — false when not seen in recent crawl
- `last_seen_at timestamptz`
- `jd_parsed_at timestamptz` — null until Gemini parses it
- `jd_summary`, `must_have_skills text[]`, `nice_to_have_skills text[]`, `responsibilities text[]`, `role_function_jd`, `jd_seniority_signal`, `jd_min_years`, `jd_max_years`, `work_mode`, `team_context`, `tech_stack_explicit text[]`, `is_boilerplate boolean`
- `embedding vector(768)` — Gemini text-embedding-004
- `embedding_at timestamptz` — when embedding was last generated

### `profiles`
One row per user. Key columns:
- `id uuid → auth.users`
- `display_name`, `current_role`, `years_experience`
- `resume_storage_path text` — path in Supabase Storage bucket
- `resume_text text` — extracted text from PDF (never logged)
- `product_dna_score integer` — 0–100, how well resume fits product-company hiring
- `skills text[]`, `tech_stack text[]`, `role_functions text[]`
- `preferred_hubs text[]`, `min_comp_lpa numeric`, `max_comp_lpa numeric`
- `seniority_level seniority_level`
- `embedding vector(768)` — semantic embedding of parsed resume
- `embedding_at timestamptz`
- `last_match_compute_at timestamptz` — used for incremental matching

### `matches`
One row per (user, job) pair. Key columns:
- `user_id uuid → auth.users`, `job_id uuid → jobs`
- `score numeric` — 0–100 composite match score
- `verdict text` — `strong_fit | good_fit | partial_fit | weak_fit`
- `reasoning text` — why this match scored this way
- `strengths text[]`, `gaps text[]`
- `fit_card_generated_at timestamptz` — when Fit Card explanation was generated
- `computed_at timestamptz`
- `seen_at timestamptz` — null until user visits /matches (drives "New" badge + dashboard banner)

### `applications`
User's tracked job applications. Key columns:
- `id uuid`, `user_id uuid`, `job_id uuid → jobs`
- `status application_status` — enum: `saved, applied, interviewing, offer, rejected, withdrawn`
- `applied_at timestamptz`, `notes text`, `interview_date timestamptz`
- `offer_comp_lpa numeric`, `offer_details text`

### `consents`
DPDP per-purpose consent records. Key columns:
- `user_id uuid`, `purpose consent_purpose` — enum: `account, matching, digest_email, analytics`
- `policy_version integer`, `granted boolean`, `granted_at timestamptz`, `revoked_at timestamptz`
- Unique on `(user_id, purpose, policy_version)`

### `digest_subscriptions`
- `user_id uuid`, `frequency text` (`weekly`), `next_send_at timestamptz`, `last_sent_at timestamptz`

### `dpdp_events`
Append-only audit trail. Events: `consent_granted`, `consent_revoked`, `export_requested`, `export_delivered`, `erasure_requested`, `erasure_completed`.

### `crawl_runs`
One row per crawler execution per company. Tracks `jobs_seen`, `jobs_new`, `jobs_updated`, `jobs_marked_stale`, `status`, `error`.

---

## Supabase Client Usage

Three separate clients — use the right one:

```typescript
// Server components, server actions, API routes (respects RLS, uses session cookie)
import { createSupabaseServerClient } from "@/lib/supabase/server";
const supabase = await createSupabaseServerClient();

// API routes that need to bypass RLS (cron jobs, admin ops, DPDP erasure)
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
const admin = createSupabaseAdminClient();

// Client components only
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
```

---

## Gemini LLM Usage

All Gemini calls go through `packages/shared/src/llm/gemini.ts`. Never instantiate `GoogleGenerativeAI` directly.

```typescript
import { runWithRetry } from "@prodmatch/shared";

// Use "light" tier for high-volume bulk tasks (JD parse, scoring)
// Use "heavy" tier for quality-critical tasks (resume parse, fit cards)
const result = await runWithRetry("light", async (model) => {
  const resp = await model.generateContent({ ... });
  return resp.response.text();
});
```

**Key behaviour:**
- Rotates across all keys in `GEMINI_API_KEY` (comma-separated)
- Cascades through model variants when one hits quota (e.g., `gemini-flash-lite-latest` → `gemini-flash-latest` → `gemini-2.5-flash-lite` → ...)
- `maxRateLimitWaitMs` default 60s, crawler overrides to 10s (fast-fail on quota exhaustion)
- Throws `LlmRunError` with `.detail.kind` = `"rate_limited" | "quota_disabled" | "model_unavailable" | "auth" | "unknown"`

**Embeddings:**
```typescript
import { embedBatch, buildJobEmbedText } from "@prodmatch/shared";
const vectors = await embedBatch(["text1", "text2", ...]); // returns number[][]
```

---

## Crawler Architecture

**Location:** `packages/crawler/`  
**Entry:** `packages/crawler/index.ts`  
**Run:** `pnpm --filter @prodmatch/crawler start -- --slugs=google,amazon`

### Pipeline per company (sequential):

```
Playwright crawl → normalize → fetchExistingMeta → decideWork → parseWithWorkers → embedJobsBatched → upsertJobs → markStaleJobs
```

1. **Crawl** (`companies/<slug>.ts`) — Playwright scrapes listing pages + detail pages. Each company has a `crawl()` function returning `RawJob[]`.
2. **Normalize** (`pipeline/normalize.ts`) — standardise fields, detect India hubs, compute SHA256 signature.
3. **decideWork** (`pipeline/parse.ts`) — skip jobs whose description hash hasn't changed (already parsed); queue new/changed jobs for parse.
4. **parseWithWorkers** (`pipeline/parse.ts`) — Gemini parses each JD: extracts seniority, skills, responsibilities, experience range, compensation hints. Worker pool of `min(NUM_KEYS × 2, 9)`. Fast-fails with `maxRateLimitWaitMs=10_000`. Bails the entire queue if rolling error rate > 80% with ≥5 prior successes (quota exhausted). Stops at `PARSE_BUDGET_PER_RUN` (default 150) successful parses per run.
5. **embedJobsBatched** — Gemini `text-embedding-004`, batches of 100. Soft-fail (jobs still upserted without embedding).
6. **upsertJobs** (`pipeline/upsert.ts`) — `ON CONFLICT (company_id, external_id) DO UPDATE`. Writes parse fields + embedding atomically.
7. **markStaleJobs** — Sets `is_active=false` for jobs not seen in this crawl run.

### GitHub Actions matrix (`.github/workflows/crawl.yml`):

5 parallel groups run daily at 02:00 IST (20:30 UTC previous day):

| Group | Companies | Why grouped |
|---|---|---|
| `amazon` | amazon | Alone — ~2,500 jobs, no detail-page fetch |
| `google-microsoft` | google, microsoft | Both need heavy detail-page enrichment |
| `meta-apple-atlassian-salesforce` | meta, apple, atlassian, salesforce | Workday-style heavy enrich |
| `nvidia-oracle-sap` | nvidia, oracle, sap-labs | Workday/SAP enrich |
| `in-startups` | razorpay, phonepe, zerodha, cred, groww, swiggy, zomato, flipkart | Greenhouse/fast adapters |

After all crawl groups finish (success or failure), a `recompute_matches` job calls `POST /api/cron/recompute-matches` in a loop until all users are processed.

### Crawler flags:
```bash
--slugs=google,amazon      # Only crawl these companies
--dry-run                  # Crawl + normalize, no DB writes
--dry-run-parse            # Crawl + parse 5 sample JDs, print output, no DB writes
```

---

## Matching Engine

**Location:** `apps/web/lib/matching/engine.ts`  
**Entry point:** `computeMatchesForUser(userId, { forceFull?: boolean })`  
**Called from:** `/matches` page action (manual), `/api/cron/recompute-matches` (daily after crawl)

### Two modes:

**Full** (when resume just uploaded, or `forceFull=true`):
- Score every active job via dot-product of profile embedding vs job embedding + rule-based adjustments
- Generate Fit Cards for top-K jobs (within 45s wall-clock budget, max 25)
- Mark all match rows `seen_at=NULL` (fresh for user)

**Incremental** (subsequent daily runs):
- Only score jobs whose `embedding_at > profile.last_match_compute_at`
- Re-rank in-memory combining new scores with existing scores
- Generate Fit Cards lazily only for jobs that entered top-K since last run
- Only mark newly-affected rows `seen_at=NULL`

### Scoring dimensions (total 0–100):

| Dimension | Max pts | Notes |
|---|---|---|
| Semantic alignment | 35 | Cosine similarity of profile vs job embeddings — dominant signal |
| Tech stack (must/nice) | 22 | Skill overlap with JD's must-have + nice-to-have lists |
| Role function | 18 | Exact match + adjacent function credit |
| Experience | 12 | Asymmetric: under-qualified penalised harder than over-qualified |
| Seniority alignment | 7 | Profile seniority vs JD seniority signal |
| Location preference | 4 | Hub match |
| Compensation | 2 | LPA range overlap |

**Verdict buckets:**
- `strong_fit` — score ≥ 75
- `good_fit` — score ≥ 55
- `partial_fit` — score ≥ 35
- `weak_fit` — score < 35

### Fit Cards:
Generated by Gemini (heavy tier) for top-K matches. Produces `strengths[]`, `gaps[]`, `reasoning` text. Gated behind 45s budget per run to avoid burning quota.

---

## API Routes

All in `apps/web/app/api/`:

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/health` | GET | none | Health check |
| `/api/cron/digest` | POST | `Bearer CRON_SECRET` | Send weekly digest emails to all eligible subscribers |
| `/api/cron/recompute-matches` | POST | `Bearer CRON_SECRET` | Recompute matches for all consented users (fan-out, loops until done) |
| `/api/export` | GET | session | DPDP data export — zip with profile JSON + resume PDF |
| `/api/applications/calendar` | POST | session | Export applications as iCal |
| `/api/insights/export` | GET | session | Export analytics as CSV |
| `/api/admin/parse-jds` | POST | `Bearer CRON_SECRET` | Parse unparsed JDs (admin backfill) |
| `/api/admin/backfill-jobs` | POST | `Bearer CRON_SECRET` | Backfill job table from external source |

### Cron schedule (`vercel.json`):
```json
{ "crons": [
  { "path": "/api/cron/recompute-matches", "schedule": "30 20 * * *" },
  { "path": "/api/cron/digest", "schedule": "0 2 * * 1" }
]}
```

---

## App Pages (all under `apps/web/app/(app)/`)

| Route | File | Purpose |
|---|---|---|
| `/dashboard` | `dashboard/page.tsx` | Home: DNA score, stats, recent matches, pipeline, "N new strong fits" banner |
| `/matches` | `matches/page.tsx` | All computed matches. "New" pills for unseen. Compute button triggers full recompute. |
| `/jobs` | `jobs/page.tsx` | Browse all active jobs with filters |
| `/jobs/[id]` | `jobs/[id]/page.tsx` | Job detail + Fit Card + apply bar |
| `/applications` | `applications/page.tsx` | Kanban-style application tracker |
| `/applications/[id]` | `applications/[id]/page.tsx` | Single app detail: notes, STAR stories, interview dates, offer comparison |
| `/profile` | `profile/page.tsx` | Resume upload, DNA score display, profile form |
| `/coach` | `coach/page.tsx` | AI interview prep coach — generates tailored prep plans |
| `/insights` | `insights/page.tsx` | Analytics: hiring trends, skills in demand, match quality over time |
| `/settings` | `settings/page.tsx` | User settings |
| `/settings/privacy` | `settings/privacy/page.tsx` | DPDP: manage consents, request data export, request erasure |
| `/consent` | `consent/page.tsx` | Initial consent form (shown once after signup) |
| `/unsubscribe` | `unsubscribe/page.tsx` | Email unsubscribe via HMAC token |

---

## DPDP Compliance

All consent logic is in `apps/web/lib/dpdp/consent.ts`.

**Four consent purposes:**
- `account` — required, cannot be revoked (stores profile, operates service)
- `matching` — required to use AI matching and Fit Cards
- `digest_email` — required to receive weekly digest
- `analytics` — optional, anonymised usage data

**Flow:**
1. After Google OAuth, user is redirected to `/consent` page if no consents on record
2. User grants/revokes per-purpose
3. `saveConsents()` upserts `consents` table + inserts `dpdp_events` audit rows
4. All features check `getUserConsents()` before proceeding
5. Cron digest route checks `digest_email` consent before sending
6. Matching engine checks `matching` consent before computing

**Right to export:** `GET /api/export` produces a zip with:
- `profile.json` — all profile fields
- `matches.json` — all match records
- `applications.json` — all applications
- `resume.<ext>` — original uploaded resume

**Right to erasure:** `settings/privacy/actions.ts` → deletes all user data including storage files, then calls `auth.admin.deleteUser()`

---

## Email System

**Location:** `apps/web/lib/email.ts`  
**Templates:** `apps/web/emails/*.ts` (React Email HTML generators)  
**Provider:** Resend

Three email functions:
```typescript
sendWeeklyDigest({ to, name, matches, unsubscribeUrl })
sendExportReady({ to, name })
sendErasureConfirmed({ to, name })
```

Weekly digest is delta-aware (Phase K): only sends matches that appeared AFTER `last_sent_at` on the subscription. Falls back to top-5 by score if no new matches exist (e.g., first digest).

Unsubscribe link uses HMAC-SHA256 signed with `CRON_SECRET` — `token = HMAC(userId)` — validated server-side before clearing the subscription.

---

## Key Shared Types (`packages/shared/src/`)

```typescript
// packages/shared/src/schemas/job.ts
type Seniority = "intern" | "junior" | "mid" | "senior" | "staff" | "principal" | "lead" | "manager" | "director" | "vp";

interface RawJob {
  externalId: string;
  title: string;
  description: string;
  applyUrl: string | null;
  location: string | null;
  postedAt: string | null;
  // ... more raw fields
}

interface NormalizedJob extends RawJob {
  signature: string;       // SHA256 of description
  hubs: string[];          // detected India hubs
  seniority: Seniority | null;
  // ...
}

// packages/shared/src/llm/jd-parse.ts
interface ParsedJD {
  jd_summary: string;
  must_have_skills: string[];
  nice_to_have_skills: string[];
  responsibilities: string[];
  qualifications_required: string[];
  qualifications_preferred: string[];
  tech_stack_explicit: string[];
  role_function_jd: string | null;
  jd_seniority_signal: string | null;
  jd_min_years: number | null;
  jd_max_years: number | null;
  work_mode: "onsite" | "hybrid" | "remote" | null;
  team_context: string | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
  is_boilerplate: boolean;
  ghost_reasons: string[];
}
```

---

## Company Crawler Patterns

Each company file in `packages/crawler/companies/<slug>.ts` exports a `CompanyConfig`:

```typescript
interface CompanyConfig {
  slug: string;
  crawl: (ctx: { page: Page; log: Logger }) => Promise<RawJob[]>;
}
```

**Adapter types by company:**
- **Amazon** — Custom REST API (`/search?base_pay_min=...&country_code=IND`). ~2,500 India jobs. Full description in listing — no detail-page fetch.
- **Google** — Custom REST API + detail-page fetch for full description. ~370 India jobs.
- **Microsoft** — Custom REST API. Detail-page fetch.
- **Meta** — Workday-style. Detail-page fetch.
- **Apple** — Workday-style. Detail-page fetch.
- **Atlassian, Salesforce** — Greenhouse API. Fast, no detail-page needed.
- **Nvidia, Oracle, SAP Labs** — Workday/SAP. Detail-page fetch.
- **Indian startups (Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart)** — Mix of Greenhouse, custom APIs, and Playwright scraping.

---

## Scoring & Matching Files

```
apps/web/lib/matching/
├── engine.ts        # computeMatchesForUser() — orchestrates full/incremental
├── score.ts         # scoreJob(profile, job) → number — all scoring dimensions
├── ghost.ts         # isGhostJob(job) → boolean — detect boilerplate/expired JDs
└── resume-score.ts  # productDnaScore(parsedResume) → 0–100
```

---

## LLM Prompt Files

```
apps/web/lib/llm/prompts/
├── resume-parse.ts    # Parse PDF resume → skills, experience, seniority, DNA score
├── jd-parse.ts        # Parse JD text → structured fields (also in packages/shared)
├── fit-card.ts        # Generate strengths/gaps/reasoning for a match
├── match-explain.ts   # Natural language explanation of a score
└── coach-plan.ts      # Generate interview prep plan for a role
```

---

## Notable Patterns & Conventions

### Server Actions
All mutations from the UI use Next.js Server Actions (`"use server"` + `revalidatePath`). Never expose service-role key to the client.

### Error handling
- DB errors: log with `cLog(msg, "warn")` in crawler, return `{ ok: false, error }` from server actions.
- LLM errors: catch `LlmRunError`, check `.detail.kind`, surface user-facing message.
- Crawler: per-company try/catch — one company failing doesn't stop others.

### Content security
- Resumes stored in `resumes` private bucket. RLS policy: `auth.uid() = user_id`. Only the owner can read/write.
- Service-role key only used server-side: `createSupabaseAdminClient()` in API routes and cron jobs.

### Incremental matching optimisation
`profiles.last_match_compute_at` is stamped after each successful compute run. Next run queries: `jobs WHERE embedding_at > last_match_compute_at`. Daily delta after initial seeding is ~100 new/updated jobs — matching completes in seconds.

### "New" match tracking
`matches.seen_at` is `NULL` until user visits `/matches`. Dashboard shows count of `seen_at IS NULL AND verdict = 'strong_fit'` as the "N new strong fits" banner. `/matches` page calls `markMatchesSeen()` server action which stamps `seen_at = now()` for all null rows.

### Parse budget per crawl run
`PARSE_BUDGET_PER_RUN` env var (default 150). 5 parallel groups × 150 = 750 parses/day, safely within Gemini free-tier (3 keys × ~200 RPD = 600 RPD budget with headroom). After budget hit, remaining jobs are deferred to next crawl's incremental delta. A rolling-window bail-out (12 consecutive errors + ≥5 prior successes) detects daily quota exhaustion and drains the queue immediately.

---

## Key Files Reference

| File | Purpose |
|---|---|
| `supabase/schema.sql` | Complete DB schema — run this in Supabase SQL editor |
| `apps/web/lib/matching/engine.ts` | Matching engine (full + incremental) |
| `apps/web/lib/matching/score.ts` | Scoring algorithm (7 dimensions, 0–100) |
| `packages/shared/src/llm/gemini.ts` | Gemini client (key rotation, model cascade, retry) |
| `packages/shared/src/llm/jd-parse.ts` | JD parsing logic + `parseJobDescription()` |
| `packages/shared/src/llm/embed.ts` | `embedBatch()` — Gemini text-embedding-004 |
| `packages/crawler/pipeline/parse.ts` | Crawler parse step (worker pool, budget cap, quota bail-out) |
| `packages/crawler/pipeline/upsert.ts` | DB upsert for crawled jobs |
| `packages/crawler/companies/index.ts` | Company registry (18 companies) |
| `apps/web/lib/dpdp/consent.ts` | DPDP consent management |
| `apps/web/lib/email.ts` | Email sending (Resend) |
| `apps/web/app/api/cron/digest/route.ts` | Weekly digest cron |
| `apps/web/app/api/cron/recompute-matches/route.ts` | Post-crawl fan-out matching |
| `.github/workflows/crawl.yml` | Daily crawler workflow (5-group matrix) |
| `CLAUDE.md` | Hard project rules — read before any change |

---

## Current Status

All phases implemented and deployed:
- ✅ DB schema (companies, jobs, profiles, matches, applications, consents, dpdp_events, crawl_runs, digest_subscriptions)
- ✅ 18 company crawlers (Playwright + Crawlee, all adapters working)
- ✅ Inline JD parse during crawl (Gemini Flash-Lite, worker pool, quota-safe)
- ✅ Resume upload + Gemini parse + Product DNA score
- ✅ Matching engine (full + incremental, semantic-led scoring, Phase K)
- ✅ Fit Cards (Gemini explanations, top-K, lazy regen, 45s budget)
- ✅ Post-crawl fan-out recompute (GH Actions → recompute-matches loop)
- ✅ "New" match tracking (seen_at, unseen count on dashboard)
- ✅ Weekly digest (delta-aware, HMAC unsubscribe)
- ✅ Application tracker (Kanban, STAR stories, offer comparison)
- ✅ AI interview coach
- ✅ Analytics/insights dashboard
- ✅ DPDP compliance (consent, export, erasure, audit trail)
- ✅ Crawler performance: fast-fail on quota exhaustion, 10s max wait, 150/run budget

Branch: `main`. Deployed to Vercel.
