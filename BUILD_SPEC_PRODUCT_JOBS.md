# Build Spec — Product-Company Job-Match Portal

> **Purpose of this document.** Hand this whole file to Claude Code (or any coding agent) and it should be able to build an end-to-end clone of the matching system used in `corejobs`, but tailored for **product-based companies only** (no service/staffing firms) with **resume → matches** as the primary user journey.
>
> Everything below is extracted from the live CoreJobs codebase. File paths in CoreJobs are referenced for reuse — you can copy those files verbatim except where noted.

---

## 0. What the user experiences (end-to-end)

```
1. Visitor lands → signs up (email + password) → verifies OTP
2. Onboarding: uploads PDF resume
3. PDF → text (pdf-parse)        ─┐
4. Text → structured JSON profile │  one-time, ~5–8s
   (Groq LLM: llama-3.3-70b)     │
5. Profile saved to UserProfile  ─┘
6. /matches page loads
7. Backend: pull ~500 candidate jobs (active, product-company only, India)
8. Score every job against the profile (pure function, in-memory)
9. Return top-30 strong matches (score ≥ 55) + up to 10 near matches
10. UI shows ranked cards with score badge + one-line reason
    User filters (full-time/intern, remote/hybrid/onsite)
    User saves/applies/discards → adjusts future result set
```

The job *catalog* is filled in the background by a scheduled scraper that runs in GitHub Actions (not in the web process).

---

## 1. Tech stack

| Layer | Pick | Version | Why |
|---|---|---|---|
| Framework | Next.js (App Router) | ^16 | `params` in dynamic routes are Promises — **must `await params`** |
| Language | TypeScript | ^5 | end-to-end |
| Styling | Tailwind CSS | ^4 | no `tailwind.config.js`; theme in `globals.css` via `@theme {}` |
| UI primitives | shadcn/ui + Radix | — | components live in `src/components/ui/` |
| DB | PostgreSQL | 15 | local: docker. prod: managed |
| ORM | Prisma | ^7 | **config in `prisma/prisma.config.ts`**, uses `@prisma/adapter-pg`, schema datasource has no `url` field |
| Auth | NextAuth.js | ^4 | credentials provider, JWT sessions, bcrypt hashed passwords |
| Scraper HTTP | Crawlee `gotScraping` | ^3 | rotates UA, spoofs TLS/JA3 — required to bypass basic bot blocks |
| Fallback browser | Playwright (Chromium) | latest | only used when a careers page is JS-rendered (Workday CSRF) |
| Parser | cheerio | ^1 | HTML extraction in iCIMS/TalentBrew/HTML scrapers |
| Scheduler | GitHub Actions cron | — | runs scraper out-of-process; web droplet stays light |
| LLM | Groq API | — | `llama-3.1-8b-instant` for classification; `llama-3.3-70b-versatile` for resume parsing |
| PDF | pdf-parse | ^1 | resume PDF → text |

**Hard rule:** *Never* import any file under `src/scraper/` from a Next.js page or API route. Crawlee/Playwright/cheerio are Node-only and will break the Next build. If a page needs a list of slugs, put it in a separate file with no scraper imports (CoreJobs has `src/scraper/scraper-slugs.ts` for this).

---

## 2. Database schema (Prisma)

Copy this and run `npx prisma migrate dev`.

```prisma
// prisma/schema.prisma  — minimal essentials. Add fields freely; don't remove.

enum CompanyType  { PRODUCT SERVICE OTHER }            // gate the catalog by this
enum CompanySize  { STARTUP SMALL MID LARGE BIGTECH }
enum JobType      { FULL_TIME INTERN CONTRACT }
enum LocationType { ONSITE HYBRID REMOTE }
enum ScrapeStatus { SUCCESS PARTIAL FAILED }
enum InteractionStatus { SAVED APPLIED RESPONDED INTERVIEW OFFER REJECTED DISCARDED }

model User {
  id              String   @id @default(cuid())
  email           String   @unique
  passwordHash    String
  name            String?
  emailVerified   DateTime?
  verificationToken String?
  passwordResetToken String?
  passwordResetExpiry DateTime?
  createdAt       DateTime @default(now())
  profile         UserProfile?
  interactions    UserJobInteraction[]
}

model UserProfile {
  id                 String   @id @default(cuid())
  userId             String   @unique
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  rawResumeText      String
  parsedAt           DateTime @default(now())
  parserVersion      String   @default("v1")

  preferredRoles     String[]
  skills             String[]
  skillsDetailed     Json?     // { tech, tools, soft, domains }
  experienceYears    Float    @default(0)
  experienceLevel    String   @default("fresher")
  achievements       String[]

  careerTrajectory   String?
  hasPivot           Boolean  @default(false)
  originalStream     String?   // e.g. "ECE" — optional for product-jobs use
  currentDomain      String?

  education          Json?
  graduationYear     Int?
  cgpa               Float?

  locationPreference String[]
  noticePeriodDays   Int?
  certifications     String[]
  projects           Json?

  lastMatchRunAt     DateTime?
  updatedAt          DateTime @updatedAt
}

model Company {
  id              String        @id @default(cuid())
  name            String
  slug            String        @unique
  website         String?
  careersUrl      String?
  logoUrl         String?
  companyType     CompanyType   @default(PRODUCT)   // ← KEY GATE
  sizeCategory    CompanySize?
  isActive        Boolean       @default(true)
  jobs            Job[]
  scrapeLogs      ScrapeLog[]
}

model Job {
  id              String        @id @default(cuid())
  externalId      String                              // ATS req id
  companyId       String
  company         Company       @relation(fields: [companyId], references: [id])

  title           String
  description     String        @db.Text
  location        String
  locationType    LocationType  @default(ONSITE)
  jobType         JobType       @default(FULL_TIME)
  experienceMin   Int?
  experienceMax   Int?
  requiredSkills  String[]
  applyUrl        String
  applyClickCount Int           @default(0)
  postedAt        DateTime?
  scrapedAt       DateTime      @default(now())
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  interactions    UserJobInteraction[]

  @@unique([companyId, externalId])
  @@index([isActive, scrapedAt])
  @@index([companyId])
}

model UserJobInteraction {
  id        String   @id @default(cuid())
  userId    String
  jobId     String
  status    InteractionStatus
  notes     String?
  appliedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  job       Job      @relation(fields: [jobId], references: [id], onDelete: Cascade)
  @@unique([userId, jobId])
}

model ScrapeLog {
  id              String        @id @default(cuid())
  companyId       String
  company         Company       @relation(fields: [companyId], references: [id])
  runAt           DateTime      @default(now())
  status          ScrapeStatus
  jobsFound       Int           @default(0)
  jobsAdded       Int           @default(0)
  jobsUpdated     Int           @default(0)
  jobsDeactivated Int           @default(0)
  errorMessage    String?
  durationMs      Int           @default(0)
}
```

Prisma 7 config (separate file):

```ts
// prisma/prisma.config.ts
import { defineConfig } from 'prisma/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  adapter: async () => new PrismaPg(new Pool({ connectionString: process.env.DATABASE_URL })),
})
```

Singleton client (`src/lib/prisma.ts`) — never `new PrismaClient()` anywhere else.

---

## 3. Scraper architecture (the catalog filler)

### 3.1. File layout

```
src/scraper/
├── base-scraper.ts          ← abstract class, the orchestrator
├── types.ts                 ← ScrapedJobSummary, ScrapedJobDetail, ScrapeResult
├── index.ts                 ← runScraper(slug?, testLimit?) + cron init
├── scraper-registry.ts      ← slug → ScraperConstructor map
├── scraper-slugs.ts         ← import-safe slug list for UI (no scraper deps)
├── utils/
│   ├── crawlee-client.ts    ← httpGet, httpGetHtml, httpPost, CookieJar
│   ├── rate-limiter.ts      ← per-domain token bucket (~4s gap)
│   ├── scrape-logger.ts     ← writes ScrapeLog rows
│   └── workday-base.ts      ← WorkdayBaseScraper (covers ~16 companies)
└── companies/
    ├── nvidia.ts            ← extends WorkdayBaseScraper, ~10 lines of config
    ├── amd.ts               ← iCIMS REST + cache map (req_id filter bug)
    ├── arm.ts               ← iCIMS TalentBrew HTML + cheerio
    ├── western-digital.ts   ← SmartRecruiters REST (country=IN broken server-side)
    ├── texas-instruments.ts ← Oracle HCM REST
    ├── ericsson.ts          ← Eightfold pcsx REST
    └── …one file per company
```

### 3.2. The contract (`base-scraper.ts`)

Every company scraper extends `BaseScraper` and implements **two methods**:

```ts
abstract scrapeListings(): Promise<ScrapedJobSummary[]>
abstract scrapeDetail(listingUrl: string, externalId: string): Promise<ScrapedJobDetail>
```

`ScrapedJobSummary` carries `{title, listingUrl, externalId, location, prefetched*?}`.
`ScrapedJobDetail` adds `{description, applyUrl, requiredSkills, experienceMin?, experienceMax?, jobType?, postedAt?}`.

The base class' `run(testLimit?)` does:

1. Look up the `Company` row.
2. Load the stream-id map (drop this if you don't use streams).
3. Call `scrapeListings()` → array of summaries.
4. Apply `testLimit` if set (smoke-test mode).
5. **Pre-load existing jobs for this company** into `Map<externalId, jobRow>`. This is the single biggest speed-up — most jobs on a re-scrape are already in DB.
6. For each listing:
   - **Fast path** (already in DB) — `UPDATE { isActive: true, scrapedAt: now() }` only.
   - **Slow path** (new) — call `scrapeDetail()` then normalize, classify, persist.
7. Normalization fallbacks (in order): listing's prefetched values → detail page → regex-extract experience range from `description + title`.
8. Auto-detect `INTERN` from title regex `\bintern(?!al)|\btrainee\b|\bapprentice\b` when scraper didn't set jobType.
9. Pre-classification: `cleanDescription()` strips boilerplate; `enrichTitleFromDescription()` upgrades generic titles like "Engineer" using description hints (`Job Area:`, `seeking a…`, `Role:`).
10. Classify into product-relevant tags (see §4). **If classifier returns `[]` (non-engineering), skip + deactivate any existing copy.** This filters out HR/Finance/EHS/Legal/Sales/Admin etc.
11. Persist: upsert `Job`, replace `JobStream` rows.
12. **Deactivation pass** at the end: jobs not seen in this run get `isActive: false` — but **only if coverage ≥ 60%** of currently active jobs were re-seen, else mark the whole run `PARTIAL` and skip deactivation. This guards against half-broken scrapes wiping the catalog.
13. Write a `ScrapeLog` row.

Copy `src/scraper/base-scraper.ts` directly. Two small tweaks for product-jobs:
- Drop the stream-classification block entirely, **or** swap it for a simpler "is this a software/product role?" gate (see §4).
- The fast-path/slow-path/deactivation logic must stay — it's load-bearing.

### 3.3. HTTP client (`crawlee-client.ts`)

Use `gotScraping` from Crawlee instead of plain `fetch`. It rotates UA strings, spoofs Chrome's TLS/JA3 fingerprint, and handles cookies via `tough-cookie`'s `CookieJar`. Copy file verbatim. Exports:

```ts
httpGet<T>(url, { jar?, headers?, timeout? }): Promise<T | null>
httpGetHtml(url, opts): Promise<string | null>
httpPost<T>(url, { jar?, json?, body?, headers?, ... }): Promise<T | null>
getCookieValue(jar, url, name): string
```

All return `null` on non-2xx (never throw) — scrapers should treat null as "skip and continue".

### 3.4. ATS patterns (the 90% of all coverage)

Each pattern below is implemented once in CoreJobs and reused across companies. **A new company is usually ~30–80 lines: pick the right pattern, fill in tenant/endpoint/parsing.**

| ATS pattern | Endpoint shape | Auth/CSRF | Files to copy |
|---|---|---|---|
| **Workday CXS** | `POST /wday/cxs/{tenant}/{board}/jobs` (paginated listing) + `GET /wday/cxs/{tenant}/{board}/job/{path}` (detail) | Double-submit cookie: `CALYPSO_CSRF_TOKEN` cookie echoed as `x-calypso-csrf-token` header | `utils/workday-base.ts` |
| **Eightfold pcsx** | `GET /api/pcsx/search?domain=&query=&location=india&start=N&num=20` then `GET /api/pcsx/position_details?position_id=` | none | `companies/ericsson.ts`, `lam-research.ts` |
| **Oracle HCM** | `GET /hcmRestApi/resources/latest/recruitingCEJobRequisitions?finder=findReqs;siteNumber=X,keyword=Y&offset=N&limit=25` | none | `companies/texas-instruments.ts`, `nokia.ts` |
| **iCIMS REST (Jibe)** | `GET /api/jobs?location=India&limit=50&offset=0` returns `{jobs:[{data:{…}}]}` | none | `companies/amd.ts` |
| **iCIMS TalentBrew HTML** | `GET /search-jobs/results?CurrentPage=N&RecordsPerPage=25` returns JSON with HTML string → parse with cheerio | none | `companies/arm.ts`, `synopsys.ts`, `cadence.ts` |
| **SmartRecruiters REST** | `GET https://api.smartrecruiters.com/v1/companies/{id}/postings?limit=100&offset=N` (filter country=IN **client-side** — server-side filter is broken) | none | `companies/western-digital.ts` |
| **Custom HTML** | one-off cheerio scrape | depends | `companies/lt.ts` |

### 3.5. The Workday base class — what makes it work

`src/scraper/utils/workday-base.ts` (~250 lines). A new Workday company is essentially:

```ts
// src/scraper/companies/nvidia.ts
export class NvidiaScraper extends WorkdayBaseScraper {
  constructor() { super('nvidia') }
  protected readonly wdConfig: WorkdayConfig = {
    tenant: 'nvidia',
    board: 'NVIDIAExternalCareerSite',
    host: 'nvidia.wd5.myworkdayjobs.com',
    useLocationFacet: true,
    searchPasses: ['india', 'bangalore', 'bengaluru', 'hyderabad', 'pune', 'intern', 'trainee'],
    isIndiaJob: (p) => /india|bengaluru|bangalore|hyderabad|pune|chennai|noida|delhi/i.test(p.locationsText ?? ''),
  }
}
```

Three production-critical Workday details (CoreJobs hit each of these in real outages):

1. **JS-rendered tenants.** Some Workday boards (Honeywell, Bosch, Emerson) ship a JS shell that never sets `CALYPSO_CSRF_TOKEN` on a plain `gotScraping` GET. Fallback: spin up a headless Playwright Chromium, navigate to the careers page, wait 2s, read **all** cookies, then inject **all** of them into the `CookieJar` for subsequent API calls. **Not just `CALYPSO_CSRF_TOKEN` — the session cookies matter too.** Without them the API returns `{jobPostings: []}` silently (no error).
2. **The India location hierarchy ID is universal across all Workday tenants:** `2fcb99c455831013ea52b82135ba3266`. Set `useLocationFacet: true` to pass it. Boards on `.wd5.` use facet key `locationHierarchy1`; others use `locationHierarchy`. The code branches on the hostname.
3. **`startDate` vs `postedOn`.** `postedOn` is human text ("Posted Today") — useless as a date. Use `jobPostingInfo.startDate` for the actual ISO date.

### 3.6. ATS-specific landmines (don't relearn these)

| Bug | Symptom | Fix |
|---|---|---|
| **AMD `req_id` filter ignored** | API returns 10 random jobs regardless of the requested id | Cache full job data from `scrapeListings()` in a class-level `Map<externalId, JobData>`. `scrapeDetail()` reads from the cache, never re-calls the API. |
| **Western Digital `country=IN` returns 0** | Empty results with server-side filter | Drop the filter, fetch all pages, filter `isIndiaPosting(p)` client-side. Country code lowercase `'in'`. |
| **SmartRecruiters `p.ref`** | Points to `api.smartrecruiters.com/...` (internal API), not the careers web URL | Always construct `https://careers.smartrecruiters.com/{companyId}/job/{id}` manually. |
| **Eightfold `/careers/job/{id}/apply` returns 404** | Apply button 404 | Use `/careers/job/{id}?domain=…` instead (the listing page hosts the apply button). |
| **Oracle HCM `offset` inside `finder` string** | Always returns page 0 | `offset` must be a standalone URL param, not embedded in `finder`. |
| **Workday partial cookie injection** | API returns 0 jobs despite Playwright success | Inject **all** cookies from Playwright into the jar, not just CALYPSO_CSRF_TOKEN. |

### 3.7. Per-domain rate limiting

`src/scraper/utils/rate-limiter.ts` — a token-bucket keyed by hostname with a default 3–5s gap. Every scraper calls `await this.rateLimiter.wait(url)` before each network request. Without this you get IP-banned within ~50 requests.

### 3.8. Discovering product companies & ATS-fingerprinting them

For the product-only portal, you need a curated list. Three sources, ranked:

1. **Manual allowlist (recommended)** — start with ~150 well-known product companies (Indian product startups + Indian R&D arms of MNCs: Razorpay, Zerodha, Cred, PhonePe, Atlassian Blr, Stripe Blr, Uber Blr, Adobe, Cisco, Nvidia, AMD, Arm, Synopsys, Cadence, Texas Instruments, Western Digital, Micron, Qualcomm, Samsung R&D, Adobe, Atlassian, MongoDB, Elastic, Confluent, Snowflake, Databricks, etc.). Each row gets `companyType: PRODUCT`.
2. **ATS fingerprint script** — given a `careersUrl`, detect which ATS the company uses by feature-sniffing the HTML (`window.workday`, `careers.smartrecruiters.com`, `myworkdayjobs.com`, `eightfold.ai`, `oraclecloud.com`, `icims.com`, `greenhouse.io`, `lever.co`, `workable.com`). Pipe the result into a "scraper template" picker. Add **Greenhouse** and **Lever** templates (very common for product companies; CoreJobs doesn't have them because IIT-core companies tend to be on Workday — for product companies these matter most).
3. **LLM company-classifier** — `companyType: PRODUCT|SERVICE|OTHER` given the company's About page text. Use only as a fallback.

Add these two ATS templates that CoreJobs doesn't have (write them, they're easy):

- **Greenhouse Job Board API** — `GET https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` → `{jobs:[{id, title, location:{name}, content:HTMLstring, absolute_url}]}`. No auth. Apply URL = `absolute_url`.
- **Lever Postings API** — `GET https://api.lever.co/v0/postings/{company}?mode=json` → array with `{id, text, categories:{location, commitment, team}, descriptionPlain, applyUrl, hostedUrl}`. No auth.

### 3.9. Running the scraper

```bash
# Smoke-test one company (3 jobs)
npx ts-node --project tsconfig.scripts.json scripts/run-scraper.ts razorpay --limit 3
# Full scrape one company
npx ts-node --project tsconfig.scripts.json scripts/run-scraper.ts razorpay
# Full scrape everything
npx ts-node --project tsconfig.scripts.json scripts/run-scraper.ts
```

`scripts/run-scraper.ts`:

```ts
import { runScraper } from '@/scraper'
const [, , slug, ...rest] = process.argv
const limit = Number(rest.find(a => a.startsWith('--limit='))?.split('=')[1] ?? 0)
runScraper(slug, limit).then(() => process.exit(0))
```

### 3.10. GitHub Actions schedule

`.github/workflows/scraper.yml` runs on cron — **never** on the web droplet (Playwright + Crawlee eats 1GB+ RAM):

```yaml
name: Scraper
on:
  schedule:
    - cron: '30 20 * * *'     # daily 2:00 AM IST — full scrape
    - cron: '0 */6 * * *'     # every 6h — priority companies only
  workflow_dispatch:
    inputs: { slug: {type: string}, limit: {type: string} }
jobs:
  scrape:
    runs-on: ubuntu-latest
    timeout-minutes: 90
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - uses: actions/cache@v4
        with:
          path: ~/.cache/ms-playwright
          key: playwright-${{ hashFiles('package-lock.json') }}
      - run: npx playwright install chromium --with-deps
      - run: npx prisma generate
      - run: npx ts-node --project tsconfig.scripts.json scripts/run-scraper.ts ${{ inputs.slug }} ${{ inputs.limit && format('--limit={0}', inputs.limit) || '' }}
        env:
          DATABASE_URL: ${{ secrets.SCRAPER_DATABASE_URL }}
          GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

Free private-repo Actions budget = 2000 min/mo. CoreJobs' actual usage ~690 min/mo.

---

## 4. JD parsing & classification

For the product-jobs portal you can simplify CoreJobs' stream-classifier to a single boolean: **"is this a product/software engineering role we should keep?"** Drop the B.Tech-stream taxonomy entirely.

### 4.1. The pipeline (runs once per *new* job, before persist)

```
raw JD html
  │
  ▼  strip <tags>, collapse whitespace
description (raw)
  │
  ▼  cleanDescription()  — strip boilerplate (see §4.2)
description (clean)
  │
  ▼  enrichTitleFromDescription()  — upgrade "Engineer" → "Engineer — Backend Platform"
title (enriched)
  │
  ▼  extractSkillsUniversal()  — regex over 200+ tech keywords if scraper gave us nothing
skills[]
  │
  ▼  classifyJobAsync(title, desc, skills)
       1. NON_ENGINEERING_TITLE_PATTERNS regex → if match, skip Groq, run keyword scorer only
       2. Else Groq llama-3.1-8b-instant → JSON tags
       3. On any failure → fallback keyword scorer
       4. If empty result → job is rejected (deactivated/skipped)
  │
  ▼ persist Job + tags
```

### 4.2. Boilerplate stripping (`description-cleaner.ts`)

A list of regexes that delete repetitive intro/EEO/legal blocks (`/As a leading technology innovator…connected future for all\.?/`, `/We are an equal opportunity employer[^.]{0,200}\./`, etc.). Cuts ~800 chars of noise from Qualcomm-style JDs so the classifier's 256-token window holds real signal. Copy from `src/lib/description-cleaner.ts`.

### 4.3. Universal skill extractor (`skill-extractor.ts`)

A flat array of `RegExp`s grouped by domain (programming langs, hardware, embedded, ML, mech CAD, civil, cloud/devops, databases, RF/telecom, power, biotech, standards, EDA). One `matchAll` over the description text; dedupe into a `Set`. Copy from `src/lib/skill-extractor.ts`. For product-jobs, you can shrink it to programming + cloud + databases + ML + frameworks (drop hardware/mech/biotech sections).

### 4.4. Title enrichment

When the raw title is in `GENERIC_TITLES` (`engineer`, `sr engineer`, `staff engineer`, `member of technical staff`, etc.), look inside the description for richer hints:

- `Job Area: Engineering Group > Software Engineering`  → append `— Software Engineering`
- `seeking a Senior Backend Engineer…`  → use that match
- `Role:` / `Position:` / `Title:` prefix  → use the value

Code is in `base-scraper.ts:enrichTitleFromDescription`. Reuse verbatim.

### 4.5. Non-engineering fast-reject (saves ~60% of LLM tokens)

```ts
const NON_ENGINEERING_TITLE_PATTERNS = [
  /\b(accountant|accounts|finance|financial|f&a|fpa|taxation|payroll|billing|invoice)\b/i,
  /\b(hr|human resource|talent acquisition|recruiter|recruitment|industrial relation)\b/i,
  /\b(legal|compliance|contract|lawyer|advocate)\b/i,
  /\b(sales|marketing|crm|business development|customer relation)\b/i,
  /\b(store(s)?\s*(manager|executive|incharge|supervisor)|storekeeper|warehouse)\b/i,
  /\b(ehs|hse|health\s*&?\s*safety|environment.*safety|safety\s*officer)\b/i,
  /\b(facility|housekeeping|horticulture|travel\s*desk|canteen)\b/i,
  /\b(admin(istration)?|office\s*assistant|office\s*manager|peon|driver)\b/i,
]
```

If title matches any → return `[]` immediately (don't call the LLM). The orchestrator treats `[]` as "skip + deactivate".

### 4.6. Groq classifier (`gemini-classifier.ts` — yes the file is misnamed)

- Model: `llama-3.1-8b-instant`, `temperature: 0`, `max_tokens: 256`.
- Endpoint: `https://api.groq.com/openai/v1/chat/completions`.
- **Multi-key rotation.** `GROQ_API_KEY="k1,k2,k3"` (comma-separated). Per-key state holds `lastCallMs`, `cooldownUntil`, and a `lock: Promise<void>` mutex. Round-robin pick → 2.5s gap per key → on HTTP 429 cool that key for 60s and switch immediately. If all keys are cooling, sleep for the soonest recovery. N keys = N × 500k TPD effective quota.
- **For product-jobs**, replace the multi-stream prompt with a single yes/no:

```text
Is this a software/product engineering role at a product company? Respond with JSON:
{ "keep": true|false, "role_family": "backend"|"frontend"|"fullstack"|"mobile"|"ml"|"data"|"devops"|"qa"|"security"|"product"|"design"|"other", "seniority": "intern"|"junior"|"mid"|"senior"|"staff"|"principal" }

Title: {title}
Skills: {skills.join(', ')}
Description: {description.slice(0, 1200)}
```

Persist `role_family` + `seniority` on `Job`. They're cheap to compute once and become first-class match signals.

### 4.7. Experience extraction

Regex over `description + title` (in `base-scraper.ts:extractExperienceFromText`):

- `/(fresher|fresh graduate|entry.?level|no experience|0\s*year)/i` → `{min: 0}`
- `/(\d+)\s*(?:to|-|–)\s*(\d+)\s*years?/` → `{min, max}`
- `/(\d+)\s*\+\s*years?|(?:minimum|at least|min\.?)\s*(\d+)\s*years?/` → `{min}`
- `/(\d+)\s*years?\s*(?:of\s+)?experience/` → `{min}`

---

## 5. Resume parsing (`src/lib/matches/resume-parser.ts`)

Single Groq call, model `llama-3.3-70b-versatile`, `temperature: 0.2`, `response_format: {type: 'json_object'}`.

Truncate input to 12k chars (`resumeText.slice(0, 12000)`). The PDF→text step happens earlier in `/api/user/resume/parse-pdf`.

### 5.1. System prompt (load-bearing — copy verbatim, adjust where noted)

```
You are a senior technical recruiter and resume analyst for Indian engineering talent.
Your job is to read a resume and extract a dense, truthful, structured profile.

NON-NEGOTIABLE RULES:
1. NEVER invent facts. If a field is not in the resume, return null/empty — never guess.
2. experienceYears = only real paid work + full-time internships. Academic projects do NOT count.
3. preferredRoles = infer what THIS candidate would realistically target TODAY, not their degree title.
   Example: ECE grad with 5 React projects → ["Frontend Developer", "Full Stack Developer", "Software Engineer"]
   NOT → ["VLSI Engineer"] unless resume shows VLSI work.
4. Detect career pivots explicitly: if degree ≠ current work, set hasPivot=true and write a one-line trajectory.
5. skills must be deduplicated, lowercase, normalized (e.g. "ReactJS" → "react", "Node.JS" → "node.js").
6. Output STRICT JSON only — no markdown, no prose, no commentary.

RETURN THIS EXACT SHAPE:
{
  "preferredRoles": string[],
  "skills": string[],
  "skillsDetailed": { "tech": string[], "tools": string[], "soft": string[], "domains": string[] },
  "experienceYears": number,
  "experienceLevel": "fresher" | "junior" | "mid" | "senior",
  "achievements": string[],
  "careerTrajectory": string | null,
  "hasPivot": boolean,
  "originalStream": string | null,
  "currentDomain": string | null,
  "education": [{ "degree": string, "college": string, "cgpa": number|null, "year": number|null }],
  "graduationYear": number | null,
  "cgpa": number | null,
  "locationPreference": string[],
  "noticePeriodDays": number | null,
  "certifications": string[],
  "projects": [{ "name": string, "tech": string[], "summary": string }]
}

LEVELING RUBRIC (strict):
- 0 yrs → fresher
- 0-2 yrs → junior
- 2-5 yrs → mid
- 5+ yrs → senior
```

The two design decisions that make this work in practice:

1. **`preferredRoles` is inferred from project work, not the degree.** This is what lets an ECE grad with 5 React projects get matched as a frontend dev. Without this rule the LLM defaults to the degree title and matches collapse for anyone who has pivoted.
2. **`hasPivot` is a first-class boolean.** The scorer uses it to *reward* jobs that leverage the original background (e.g. an ECE→SWE pivot at an embedded-systems company gets bonus weight).

### 5.2. Defensive parsing

LLM occasionally wraps JSON in ```` ```json ` fences. Code path:

```ts
try { parsed = JSON.parse(raw) }
catch {
  const start = raw.indexOf('{'); const end = raw.lastIndexOf('}')
  parsed = JSON.parse(raw.slice(start, end + 1))
}
```

Then defaults: `parsed.preferredRoles ??= []`, etc., and `parsed.experienceYears = Math.max(0, Number(parsed.experienceYears) || 0)`.

### 5.3. Snapshot before overwrite

Each re-parse calls `snapshotCurrentProfile(userId)` first (a `ResumeVersion` row) so the user can roll back. Wrap in try/catch — snapshot failure must not block the new parse. CoreJobs file: `src/lib/matches/resume-versions.ts`.

---

## 6. The matcher (the core IP)

### 6.1. The endpoint: `GET /api/matches`

```ts
// src/app/api/matches/route.ts
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = (session.user as { id: string }).id
  const profile = await prisma.userProfile.findUnique({ where: { userId } })
  if (!profile) return NextResponse.json({ needsProfile: true, matches: [], nearMatches: [] })

  // Filters from query string
  const typeParam = url.searchParams.get('type')     // 'full-time,internship'
  const modeParam = url.searchParams.get('mode')     // 'remote,hybrid'
  const roleFamily = url.searchParams.get('family')  // 'backend,fullstack'

  // Discarded jobs are excluded from the candidate pool
  const hidden = await prisma.userJobInteraction.findMany({
    where: { userId, status: 'DISCARDED' }, select: { jobId: true },
  })

  const jobs = await prisma.job.findMany({
    where: {
      isActive: true,
      id: { notIn: hidden.map(h => h.jobId) },
      jobType: jobTypes?.length ? { in: jobTypes } : undefined,
      locationType: locationTypes?.length ? { in: locationTypes } : undefined,
      company: { isActive: true, companyType: 'PRODUCT' },   // ← THE PRODUCT-ONLY GATE
      location: { contains: 'india', mode: 'insensitive' },
    },
    include: { company: { select: { name: true, logoUrl: true, sizeCategory: true, slug: true } } },
    take: 500,
    orderBy: { scrapedAt: 'desc' },
  })

  const ranked = rankJobsForProfile(profile, jobs)
  const strong = ranked.filter(r => r.score >= 55).slice(0, 30)
  const near   = strong.length < 8 ? ranked.slice(strong.length, strong.length + 10) : []

  return NextResponse.json({ matches: strong.map(shape), nearMatches: near.map(shape), profile: {...} })
}
```

500 is the per-request candidate cap. Scoring is pure CPU; 500 jobs × 5 signals takes ~20ms in Node.

### 6.2. The scorer (`src/lib/matches/scorer.ts`) — pure function, no DB

Weighted sum of signals → integer 0–100. For product-jobs, drop the `streamScore` and redistribute weights:

```ts
const W = { role: 0.45, skill: 0.32, exp: 0.15, size: 0.08 }
```

| Signal | How |
|---|---|
| `roleScore` (0.45) | Best of: full preferred-role substring match in title (=1.0), else fraction of role-words present in title. Norm: lowercase, strip non-alphanumeric except `+#.`. |
| `skillScore` (0.32) | `max(overlap, 0.6·overlap + 0.4·descCoverage)` where `overlap = |user ∩ jobSkills| / |jobSkills|`, `descCoverage = userSkills ∩ tokens(description) / max(8, |jobSkills|)`. |
| `expScore` (0.15) | Intern: ≤2yr user → 1.0. Else: in `[min, max+0.5]` = 1.0; under by ≤1yr=0.7, ≤2yr=0.4; over by ≤1yr=0.85, ≤3yr=0.55, else 0.3. |
| `sizeScore` (0.08) | Soft preference. STARTUP/SMALL/MID = 1.0, LARGE = 0.7, BIGTECH = 0.5. (Adjust to taste; this is the "small-co bias" knob.) |

Then a `buildReason()` helper assembles a one-line human reason from the signal values:

> "Strong fit for your Backend Developer goals · 2+ yr exp · matches your React + Node + Typescript · at an early-stage startup."

This is what the UI shows under each card. Building it from the **same signal numbers** used to rank keeps the reason aligned with the score (no hallucinated explanations).

### 6.3. Why this design (not embeddings, not full LLM ranking)

- **Pure function = trivially testable.** Snapshot tests pin the scorer. No DB, no network, no flakes.
- **Deterministic for the same input.** Users don't see jobs shuffle between refreshes.
- **20ms for 500 jobs.** No per-request LLM cost. The LLM is only called *once* per resume parse.
- **Embeddings come later, not first.** If catalog grows past ~10k jobs or you need fuzzier semantic matching, *then* layer a vector ANN index on top — but the keyword scorer should remain as the cheap first-pass filter.

### 6.4. The "near matches" trick

If you have <8 strong matches (`score >= 55`), grab the next 10 below the cutoff and label them "near matches" — a separate UI section. This prevents the dreaded empty-state on niche profiles and lets the user discover stretch jobs without polluting the main list.

### 6.5. DISCARDED state — the negative-signal feedback loop

When the user dismisses a card, write a `UserJobInteraction { status: DISCARDED }` row. The matches endpoint excludes those job IDs on every subsequent request. Cheap, instant, and stops the same off-target job from haunting the user.

---

## 7. Frontend pages

### 7.1. `/matches` (the main page)

`src/app/matches/page.tsx`: server entry, auth gate, redirects unauthenticated users to `/login?next=/matches`.

`src/app/matches/MatchesClient.tsx`: holds filter state in URL params, calls `GET /api/matches?type=&mode=&family=`, branches on `needsProfile`:

- `needsProfile` → render `<ResumeUploadCard>` (drag-and-drop PDF, POSTs to `/api/user/resume/parse-pdf`, then to `/api/user/resume/parse`).
- Otherwise → render `<ProfileSettingsPanel>` (lets user manually edit parsed roles/skills/years — overrides LLM mistakes) + the ranked list of `<MatchCard>`s.

### 7.2. `<MatchCard>`

Logo · title · company · location · score badge (color-graded: ≥80 green, ≥60 amber, else gray) · one-line reason · skills chips (top 5) · Apply / Save / Discard buttons. Apply opens the `applyUrl` in a new tab and POSTs to `/api/jobs/[id]/apply-click` to increment `applyClickCount` (useful analytics).

### 7.3. URL-as-state

Filters live in `useSearchParams()`. Means: shareable links, browser back works, server can SSR the right set. CoreJobs uses this religiously — copy the pattern.

### 7.4. `InteractionsProvider`

Top-level React context that fetches `GET /api/user/interactions` once on mount and exposes `isSaved(jobId)`, `isApplied(jobId)`, `isDiscarded(jobId)`. Every card consumes it instead of fetching per-card.

---

## 8. Auth flow

NextAuth.js, credentials provider, JWT sessions (no Prisma adapter — manual user lookup in `src/lib/auth.ts`).

```
POST /api/auth/signup     → bcrypt-hash → create user (emailVerified=null) → send OTP → /signup/verify
POST /api/auth/verify-email → match token → set emailVerified=now() → /onboarding
GET  /onboarding          → upload resume → /matches
POST /api/auth/[...nextauth] → standard NextAuth handler
GET  /api/auth/session    → current session
POST /api/auth/forgot-password → token email
POST /api/auth/reset-password  → token + new password
```

Session is JWT in httpOnly cookie. Server: `getServerSession(authOptions)`. Client: `useSession()`.

---

## 9. Background scheduler (in-process variant)

If you don't want GitHub Actions, you can run `node-cron` inside the Next process:

```ts
// src/scraper/index.ts
import cron from 'node-cron'
cron.schedule('30 20 * * *', () => runScraper())              // 2am IST full
cron.schedule('0 */6 * * *', () => runScraper(PRIORITY_SLUG)) // every 6h priority
```

But: Playwright + Crawlee inside a 1GB droplet will OOM during big scrapes. **Prefer Actions for any non-trivial catalog.**

---

## 10. Environment variables

```
DATABASE_URL="postgresql://user:pass@host/db"
DIRECT_URL="postgresql://user:pass@host/db"        # same as DATABASE_URL for prisma migrate
NEXTAUTH_SECRET="<random 32 bytes>"
NEXTAUTH_URL="https://yoursite.com"
GROQ_API_KEY="k1,k2,k3"                           # comma-separated for multi-key rotation
ADMIN_SECRET="<random>"                            # for /api/admin/* routes
SCRAPER_DATABASE_URL=...                           # GitHub Actions secret, same as DATABASE_URL
```

---

## 11. Local dev setup

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:15
cp .env.example .env  # fill DATABASE_URL, GROQ_API_KEY, NEXTAUTH_SECRET
npx prisma migrate dev
npx ts-node --project tsconfig.scripts.json prisma/seed.ts      # seed companies
npm run dev                                                      # http://localhost:3000
npx ts-node --project tsconfig.scripts.json scripts/run-scraper.ts razorpay --limit 3
```

`tsconfig.scripts.json` (separate from app tsconfig):

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": { "module": "CommonJS", "moduleResolution": "node", "esModuleInterop": true, "jsx": "react" },
  "include": ["scripts/**/*", "prisma/**/*", "src/**/*"]
}
```

---

## 12. Migration order for a coding agent building this fresh

If you're handing this to Claude Code, ask it to build in this order. Each step is independently verifiable.

1. **Repo scaffold.** `create-next-app` with App Router + TypeScript + Tailwind v4.
2. **Prisma schema.** Paste §2 schema, write `prisma.config.ts`, run `migrate dev`, write `seed.ts` that seeds ~50 known product companies (manual list — Razorpay, Cred, Zerodha, Stripe Blr, …) with `companyType: PRODUCT`. **Verify:** `prisma studio` shows the rows.
3. **Auth.** NextAuth credentials provider, signup/login/verify-email/forgot-password routes. **Verify:** can sign up, log in, hit a protected route.
4. **Resume upload + parse.** `/api/user/resume/parse-pdf` (PDF → text via `pdf-parse`), `/api/user/resume/parse` (text → Groq → UserProfile upsert). System prompt from §5.1. **Verify:** upload a real PDF, check UserProfile row has sensible `preferredRoles`/`skills`/`experienceYears`.
5. **Scraper skeleton.** `BaseScraper`, `types.ts`, `crawlee-client.ts`, `rate-limiter.ts`, `scrape-logger.ts`. Drop the stream-classifier integration (leave a TODO). **Verify:** abstract class compiles.
6. **One real scraper.** Pick the easiest — Greenhouse (e.g. Razorpay). Wire it through `BaseScraper.run()`. **Verify:** `scripts/run-scraper.ts razorpay --limit 3` writes 3 jobs into the DB.
7. **Workday base + 2 Workday companies** (Adobe, Cisco). Verify Playwright fallback runs on Actions even if it returns 0 locally.
8. **Add 5 more ATS patterns**: Lever, Greenhouse, Eightfold, iCIMS REST, SmartRecruiters. Each takes 30-80 lines.
9. **JD classifier** (the simplified product-role yes/no in §4.6) wired into `BaseScraper.run()`. Non-engineering fast-reject regex from §4.5.
10. **`/api/matches`** endpoint + `scorer.ts` (without `streamScore`). **Verify:** with a seeded user + scraped jobs, response has matches sorted by score and a sensible reason per card.
11. **`/matches` page** — `MatchesClient`, `MatchCard`, `MatchFilters`, `ResumeUploadCard`, `ProfileSettingsPanel`. **Verify:** end-to-end browser flow from signup → upload → matches.
12. **GitHub Actions cron.** Push `.github/workflows/scraper.yml` (§3.10). **Verify:** manual `workflow_dispatch` run succeeds and the DB shows fresh `scrapedAt`s.
13. **Polish:** Save/Apply/Discard interactions, near-matches section, applyClickCount, ResumeVersion snapshots.

---

## 13. Things that will trip the agent up (warn it upfront)

- **Next.js 16 dynamic params are `Promise`.** Any `app/.../[id]/page.tsx` must do `const { id } = await params`. Pre-16 patterns from training data will silently break.
- **Tailwind v4 has no `tailwind.config.js`.** All theme tokens live in `globals.css` under `@theme {}`. Don't recreate v3-style config.
- **Prisma 7 datasource block has no `url` field.** Connection goes through the `@prisma/adapter-pg` Pool in `prisma.config.ts`. The schema datasource is purely declarative.
- **Never import a scraper file in any `src/app/**` page or route.** Use `scraper-slugs.ts` for slug lists in UI code.
- **gotScraping ≠ fetch.** Plain `fetch` gets blocked by most ATSes. Use `httpGet`/`httpPost` from `crawlee-client.ts` everywhere.
- **Rate-limit by domain or get banned.** ~3–5s between requests to the same host.
- **The `[]` classifier result means "skip + deactivate", not "error".** That's how non-engineering and non-product jobs get filtered from the catalog.
- **The 60% deactivation guard exists for a reason.** A scraper that finds 20 jobs when yesterday it found 800 is broken — don't let it nuke 780 active jobs.
- **Workday locally returns 0 jobs.** `community.workday.com/maintenance-page` redirect for non-datacenter IPs. Test on Actions, not on the laptop.
- **Match scorer is a pure function. Keep it that way.** No DB calls inside `rankJobsForProfile`. Pull data once, score in-memory.

---

## 14. What to NOT copy from CoreJobs

| Thing | Why skip |
|---|---|
| B.Tech/M.Tech stream taxonomy (`constants.ts`, `stream-mapper.ts`, `streams`/`job_streams` tables) | Irrelevant outside the IIT-core student niche. Use `role_family` + `seniority` instead. |
| `ISRO` hardcoded exclusion in `/api/jobs` | CoreJobs-specific. |
| `companies` page + sector dropdowns (CORE/PSU/SEMICONDUCTOR/IT) | Use `companyType` (PRODUCT only) + optional `sizeCategory`. |
| Workday + iCIMS coverage for service companies (TCS, Infosys, Wipro) | They're SERVICE, not PRODUCT. Don't add their scrapers. |
| Manual onboarding page that asks for `college/degree/stream/year` | The resume parser already produces this. Skip the manual step. |

---

## 15. Quick reference — files to copy verbatim from `corejobs/`

| Source | What | Tweak |
|---|---|---|
| `src/lib/prisma.ts` | Prisma singleton | — |
| `src/lib/auth.ts` | NextAuth config | — |
| `src/scraper/utils/crawlee-client.ts` | HTTP client | — |
| `src/scraper/utils/rate-limiter.ts` | Token bucket | — |
| `src/scraper/utils/scrape-logger.ts` | ScrapeLog writer | — |
| `src/scraper/utils/workday-base.ts` | Workday CXS pattern | — |
| `src/scraper/base-scraper.ts` | Orchestrator | Drop stream block, use yes/no classifier |
| `src/scraper/types.ts` | Scraper interfaces | — |
| `src/lib/description-cleaner.ts` | Boilerplate stripper | Add product-co-specific patterns over time |
| `src/lib/skill-extractor.ts` | Skill regex | Trim to product/SWE patterns |
| `src/lib/matches/resume-parser.ts` | Groq resume parser | — |
| `src/lib/matches/resume-versions.ts` | Snapshot/rollback | — |
| `src/lib/matches/scorer.ts` | Match scorer | Drop streamScore, reweight |
| `src/app/api/matches/route.ts` | Matches endpoint | Change filter to `companyType: PRODUCT` |
| `src/app/api/user/resume/parse/route.ts` | Resume parse endpoint | — |
| `src/app/api/user/resume/parse-pdf/route.ts` | PDF → text | — |
| `src/app/matches/*` | Whole `/matches` UI | — |
| `.github/workflows/scraper.yml` | CI scraper | — |
| `scripts/run-scraper.ts` | Manual scraper runner | — |
| `tsconfig.scripts.json` | Scripts tsconfig | — |

End of spec.
