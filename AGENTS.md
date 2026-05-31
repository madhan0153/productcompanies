# ProdMatch.ai — Project Rules

India-first AI SaaS matching Indian engineers to high-package roles at 51 approved product companies.

## Hard rules

1. **Approved companies only** (51): Google, Microsoft, Meta, Amazon, Apple, Atlassian, Nvidia, Oracle, Salesforce, SAP Labs, Razorpay, PhonePe, Zerodha, CRED, Groww, Swiggy, Zomato, Flipkart, Adobe, Intuit, Uber, PayPal, ServiceNow, Stripe, Freshworks, Zoho, Postman, BrowserStack, Chargebee, Meesho, Nykaa, Dream11, PolicyBazaar, Lenskart, Udaan, Delhivery, ShareChat, Ola, Paytm, InMobi, Unacademy, Cars24, Myntra, Practo, Pine Labs, NoBroker, Wingify, CleverTap, MoEngage, Yellow.ai, Arcesium. No others. No service/outsourcing companies. Ever.
2. **Official career pages only** as job source. No aggregators (LinkedIn, Naukri, Indeed, Glassdoor).
3. **No demo/seed jobs.** The `jobs` table starts empty. All jobs come from the daily Crawlee+Playwright crawler.
4. **Idempotent SQL only.** Every SQL artifact (tables, enums, policies, functions, triggers, seed) must be safe to run multiple times in the Supabase SQL editor. Use `IF NOT EXISTS`, `CREATE OR REPLACE`, `DROP ... IF EXISTS` before `CREATE`, `ON CONFLICT DO ...`, and `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; END $$;` for enums.
5. **Single SQL file.** All schema lives in `supabase/schema.sql`. Do not split into migrations.
6. **DPDP Act 2023 compliance from day one.**
   - Per-purpose granular consent (account, matching, digest_email, analytics) recorded in `consents` with policy version.
   - User data export (zip JSON + resume) and right-to-erasure callable from settings.
   - Append-only audit in `dpdp_events`.
   - No data sold or shared with third parties.
   - Resumes stored in private Supabase Storage bucket; only the owner can read.
7. **India-first.** Compensation in LPA. Hubs: Bengaluru, Hyderabad, Pune, Gurugram, Noida, Delhi NCR, Mumbai, Chennai, Remote-India.
8. **Explainability.** Every match shows `strengths`, `gaps`, `reasoning`. Never present an opaque score.
9. **Privacy in code.** Never log resume content, parsed profile fields, or PII. Use service-role key only on the server.
10. **Animations respect `prefers-reduced-motion`.** All Framer Motion components must check it.

## Tech stack

- Next.js 16 (App Router) + TS strict, Tailwind, shadcn/ui, Framer Motion, next-themes (dark default)
- Supabase (Postgres + Auth + Storage + RLS), region `ap-south-1`
- Google Gemini API (free tier): Gemini 2.0 Flash for parsing/explanations, Flash-Lite for bulk scoring, `text-embedding-004` for embeddings. All wrapped in `apps/web/lib/llm/`.
- Crawlee + Playwright on GitHub Actions (daily 02:00 IST, matrix of 3 jobs)
- Resend + React Email
- Sentry, Vercel Analytics

## Repo layout

```
apps/web/                Next.js app
packages/crawler/        Crawlee+Playwright
packages/shared/         zod schemas + shared TS types
supabase/schema.sql      single idempotent file
.github/workflows/       crawl.yml
```

## Coding style

- TS strict; no `any` without justification.
- Server components by default; `"use client"` only when needed.
- Zod schemas in `packages/shared` for cross-boundary types.
- Concise comments only when WHY is non-obvious.
- No backwards-compat shims, no dead code.

## LLM token efficiency

- Build phase by phase; don't anticipate later phases.
- Output code only; explain only when asked.
- Reuse existing utilities; don't recreate.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
