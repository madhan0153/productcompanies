# ProdMatch.ai

India-first AI SaaS that intelligently matches Indian software engineers to high-package roles at 18 approved product companies. Built privacy-first under the DPDP Act 2023.

## What it does

- Upload your resume once → AI parses it and computes a Product DNA score.
- Get explainable, ranked matches with **strengths** and **gaps** for each role.
- Track applications, save interview notes & STAR stories, compare offers.
- Receive a smart weekly email digest of new relevant roles.
- Jobs come **only** from official career pages of 18 product companies — never from aggregators.

## Approved companies

Google · Microsoft · Meta · Amazon · Apple · Atlassian · Nvidia · Oracle · Salesforce · SAP Labs · Razorpay · PhonePe · Zerodha · CRED · Groww · Swiggy · Zomato · Flipkart

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 15 App Router, TypeScript, Tailwind, shadcn/ui, Framer Motion |
| Database / Auth / Storage | Supabase (Postgres + RLS), `ap-south-1` |
| LLM | Google Gemini API (free tier) |
| Crawler | Crawlee + Playwright on GitHub Actions (daily 02:00 IST) |
| Email | Resend + React Email |
| Hosting | Vercel |

## Quickstart

```bash
pnpm install
cp .env.example .env.local   # fill in keys
# In Supabase SQL editor: paste & run supabase/schema.sql
pnpm dev
```

Visit http://localhost:3000 — health check at `/api/health`.

## Database

All schema lives in **one idempotent file**: [supabase/schema.sql](supabase/schema.sql). Paste it once into the Supabase SQL editor; safe to re-run anytime.

## Project layout

```
apps/web/              Next.js app (UI + API routes)
packages/crawler/      Crawlee + Playwright job ingestion
packages/shared/       shared zod schemas / TS types
supabase/schema.sql    consolidated idempotent schema
.github/workflows/     daily crawl workflow
CLAUDE.md              permanent project rules
```

## DPDP compliance

- Per-purpose granular consent (account, matching, digest_email, analytics) with policy version tracking.
- Right to data export (zip JSON + resume) and erasure from the settings page.
- Append-only audit trail in `dpdp_events`.
- Resumes stored in a private Supabase Storage bucket; only the owner can read.
- No data sold or shared with third parties.

## License

Proprietary — all rights reserved.
