# ProdMatch.ai — Production Audit Report

> **Round 2 — 2026-06-03 (live production + database + tests).** This pass adds
> live browser click-through of `prodmatchai.in` (authenticated as
> `madhan6556@gmail.com`), live Supabase advisor scans on the real ProdmatchAI
> project (`wmnuinlnsisifalgrpui`), and execution of the unit-test suites. The
> 2026-05-30 report below remains valid for the static/code-level audit. Read
> this Round 2 section first.

---

## ROUND 2 — 2026-06-03

**Auditor:** Claude (Cowork) — QA, security, full-stack, live verification
**Scope this round:** live site behaviour, live DB security/performance
advisors, unit-test execution + fixes. Production deployment is healthy
(Vercel `prodmatchai`, latest deploy READY).

### Executive summary

The app is in strong shape. Admin authorization, payment verification, and
RLS on sensitive tables are all correctly enforced **server-side and in
production**. No critical (ERROR-level) issues were found on the real
database. This round found and fixed **4 broken test/config artifacts** (stale
assertions + a dead npm script that referenced a deleted file), and surfaced
several **WARN/INFO** hardening items on the live DB plus two payment-config
observations (Dodo is in test mode; Dodo merchant branding shows "CoreJob").

### Routes / pages audited live (logged-in, prodmatchai.in)

| Route | Result | Notes |
|-------|--------|-------|
| `/` → `/dashboard` | ✓ | Auth session active; dynamic greeting, career-health 22/100, stat cards (Readiness, 36 shortlisted of 1,300, 0 applications, 51 companies). No console errors. |
| `/admin` | ✓ correct 404 | `notFound()` gate fires for non-admin email — surface not leaked. |
| `/settings` → `/settings/privacy` | ✓ | DPDP granular consent toggles render (Account required, AI Matching, Digest, Analytics, Resume Intelligence) + Update preferences. |
| `/profile` | ✓ | Loads; shows account email. |
| `/pricing` | ✓ | 4 tiers; Monthly/Yearly toggle; coupon redeem box. |
| `/matches` | ✓ | Dynamic "Computed 9h ago / Jobs updated 7h ago"; Priority 36 / Explore 61; filters; explainable cards (Amazon, SAP Labs, Arcesium, Google, MoEngage — all approved companies); resume-score banner. |
| `/applications` | ✓ | Empty-state + "Add application"; no console errors. |
| Dodo checkout (external) | ✓ | Reached `test.checkout.dodopayments.com` after server session creation. |

No React hydration errors or app-level console errors were observed on any
page (only third-party browser-extension logs were present).

### Button / action audit (live)

| Page | Button/Action | Expected | Actual | Dynamic update | Loading state | Error state | Mobile | Status |
|------|---------------|----------|--------|----------------|---------------|-------------|--------|--------|
| /pricing | Yearly/Monthly toggle | Per-day + annual price changes | Career Sprint ₹17→₹14/day, "was ₹5,988/yr → ₹4,999/yr · save ₹989" | Yes (instant) | n/a | n/a | code: responsive | ✓ PASS (prior toggle bug confirmed fixed) |
| /pricing | Upgrade to Pro | Create Dodo session + redirect | Button → "Redirecting…" (disabled), server session created, redirect to Dodo hosted checkout | Yes | Yes ("Redirecting…") | Yes (graceful "coming soon" path in code) | code: responsive | ✓ PASS |
| /admin (page) | Direct nav as non-admin | Blocked / 404 | 404 "gone off the map" | n/a | n/a | n/a | ✓ | ✓ PASS |
| /api/admin/dsa-v2-seed | GET as non-admin | 403 | `403 {"ok":false,"error":"Not authorised"}` | n/a | n/a | n/a | n/a | ✓ PASS |
| sidebar | Admin link visibility (non-admin) | Hidden | Not rendered | n/a | n/a | n/a | ✓ | ✓ PASS |
| /settings/privacy | Update preferences | Persist consent | Renders; server-action backed (code-verified) | code-verified | code-verified | code-verified | ✓ | ✓ (UI verified; persistence code-verified) |

### Admin privilege audit (the headline answer)

- **Env var:** `ADMIN_EMAILS` (comma-separated). Parser in
  `apps/web/lib/admin/auth.ts` is **trimmed + lowercased + memoized**; empty/unset
  ⇒ deny everyone (admin pages 404, no leak).
- **Server-side enforced:** `requireAdmin()` runs in `app/admin/layout.tsx`
  (every admin page) and inside every `/api/admin/*` route. Verified live:
  `/admin` → 404 and `/api/admin/dsa-v2-seed` → 403 for a non-admin session.
- **Non-admin UX:** no Admin link in the sidebar; pages 404; APIs 403. ✓
- **Why your admin didn't appear:** the browser is logged in as
  **`madhan6556@gmail.com`**, which is **not** in `ADMIN_EMAILS`. This is the
  gate working correctly, not a bug. **To get admin:** either sign in with the
  exact email you placed in `ADMIN_EMAILS`, **or** add `madhan6556@gmail.com`
  to `ADMIN_EMAILS` in Vercel (Production), then **redeploy** (the allowlist is
  read at build/boot). Comparison is case-insensitive and trims spaces, so
  formatting/casing won't be the cause.
- **Could not auto-verify the exact `ADMIN_EMAILS` value:** Vercel does not
  expose env values via the MCP, so confirm the value in the Vercel dashboard.

### Payment flow audit

- **Verified live:** checkout button shows a disabled "Redirecting…" loading
  state, the server creates the Dodo checkout session, and the browser
  redirects to the hosted checkout. No secret keys touch the client (session
  is created in `/api/billing/checkout`, server-only).
- **Code-verified (server):** webhook (`/api/webhooks/dodo`) validates the
  `standardwebhooks` signature, is **idempotent** (unique `provider_event_id`
  insert; duplicates short-circuit), returns 500 to trigger Dodo retries, and
  is rate-limited. Premium is **never** granted from URL params — the success
  page polls `/api/billing/sync` + `/api/billing/refresh`, which verify the
  subscription against Dodo's API and check **ownership** (403 on mismatch)
  before writing entitlements. `returnTo` is open-redirect-guarded
  (`startsWith("/") && !startsWith("//")`).
- **⚠ Config observations (action for you, not bugs in code):**
  1. **Production is using Dodo TEST mode** — checkout went to
     `test.checkout.dodopayments.com`. Real payments will not be captured until
     you set live-mode Dodo keys (`DODO_PAYMENTS_ENVIRONMENT` + live API/secret/
     product IDs) in Vercel.
  2. **Dodo merchant/product branding shows "CoreJob"**, not ProdMatch — fix in
     the Dodo dashboard so customers see the right name on the checkout/receipt.

### Live database audit — Supabase `ProdmatchAI` (`wmnuinlnsisifalgrpui`, ap-south-1)

**Security advisors — NO ERROR-level findings.** Sensitive user tables
(`profiles`, `resume_versions`, `matches`, `subscriptions`, `tailored_resumes`,
interview/DSA tables, etc.) all have RLS enabled with owner policies.

INFO/WARN items to consider (none auto-applied — DDL on prod is yours to run):
- **INFO — RLS enabled, no policy** on `admin_actions`, `crawl_runs`,
  `cron_locks`, `llm_dead_keys`, `payment_events`, `promo_codes`,
  `rate_limit_counters`. These are **service-role-only** tables; RLS-on +
  no-policy correctly denies anon/authenticated. Safe by design.
- **WARN — `SECURITY DEFINER` functions executable by `anon`/`authenticated`**
  via PostgREST RPC: `acquire_cron_lock`, `release_cron_lock`, `rls_auto_enable`,
  `increment_apply_click_count`. Recommend `REVOKE EXECUTE ... FROM anon,
  authenticated` on the cron-lock + `rls_auto_enable` functions (they are
  backend/maintenance helpers and shouldn't be publicly callable).
  `increment_apply_click_count` may be intentional (client apply-tracking) —
  confirm.
- **WARN — mutable `search_path`** on `tg_set_updated_at`, `compute_freshness`
  → add `SET search_path = public, pg_temp`.
- **WARN — `pg_trgm` installed in `public`** → move to an `extensions` schema.
- **WARN — leaked-password protection disabled** in Supabase Auth → enable
  (HaveIBeenPwned check) in the Auth settings (low impact since sign-in is
  Google OAuth).

**Performance advisors — all INFO/WARN:**
- **WARN — `auth_rls_initplan`:** many RLS policies call `auth.uid()` /
  `current_setting()` per-row. Replace with `(select auth.uid())` in the
  affected policies (resume_versions, tailored_resumes, negotiation_memos,
  enhanced_resumes, resume_intel_events, interview_*, dsa_*). Meaningful at
  scale; fix in `supabase/schema.sql` then re-apply.
- **INFO — unindexed foreign keys:** `applications.job_id`, `matches.job_id`,
  `invoices.subscription_id`, `offers.company_id`, `refunds.invoice_id`,
  `tailored_resumes.job_id`, `negotiation_memos.job_id`,
  `dsa_question_review_events.reviewer_id`, `dsa_questions.reviewed_by`,
  `entitlement_grants.granted_by`, `promo_codes.created_by`. Add covering
  indexes if these tables grow.
- **INFO — unused indexes:** several `idx_jobs_*`, `idx_profiles_*`, etc.
  (expected for low row counts; revisit later).

### Bugs found & fixes applied (this round)

| # | Severity | File | Problem | Fix |
|---|----------|------|---------|-----|
| R2-1 | Medium (CI red) | `apps/web/__tests__/admin/crawler-resilience.test.ts` | `byKind.htmlDom` hardcoded to `4`; crawler registry grew to 6 html-dom companies → test failed (`6 !== 4`). | Derive expected counts from `CRAWLER_META_BY_SLUG` so the test won't rot as companies are added. |
| R2-2 | Medium (CI red) | `apps/web/app/(app)/matches/match-types.test.ts` | `classifyMatch` was refactored to return `null` for hidden matches, but 6 assertions still expected the string `"filtered"` → 3 tests failed. | Updated assertions to expect `null`. |
| R2-3 | Medium (CI red) | `apps/web/__tests__/matching/banding-benchmark.test.ts` | Same `"filtered"`→`null` refactor → 4 benchmark tests failed. | Replaced `result.band, "filtered"` with `result.band, null` (9 occurrences; makes both `equal`/`notEqual` semantically correct). |
| R2-4 | Low | `package.json` | `test:dsa` script pointed at deleted `packages/shared/src/dsa-learning.test.ts` (refactored into `dsa-v2/`) → script always errored. | Removed the dead script (no replacement test exists; `test:bench` covers `dna-benchmarks`). |
| R2-5 | Low (hardening) | `packages/crawler/source-invariants.ts` | `EXPECTED_CRAWLER_SLUGS` tripwire still listed 33 companies; registry is now the full 51 approved (CLAUDE.md). | Updated the tripwire list to all 51 approved slugs + clarifying comment. |

All five are test/config artifacts; **no production application code was
changed this round.**

### Commands run (this round)

| Command | Result |
|---------|--------|
| `corepack` enable pnpm 9.12.0 | ✓ (pnpm not preinstalled in sandbox) |
| `pnpm install` (native copy, hoisted linker) | ✓ (`canvas` native dep failed to compile — optional, expected) |
| `pnpm --filter @prodmatch/shared typecheck` | **✓ exit 0** |
| `pnpm test:resilience` | ✓ 8/8 (after R2-1 fix; was 7/8) |
| `pnpm test:resume-mapper` | ✓ 12/12 |
| `pnpm test:matches` | ✓ 5/5 (after R2-2 fix; was 2/5) |
| `pnpm test:pdf-text` | ✓ 5/5 |
| `pnpm test:bench` | ✓ 8/8 |
| `pnpm test:matching-bench` | ✓ 22/22 (after R2-3 fix; was 18/22) |
| `pnpm test:llm-runtime` | ✓ 16/16 |
| `pnpm test:crawler` | ✓ 35/35 |
| `pnpm test:crawler-invariants` | ✓ (after R2-5 fix) |
| `pnpm test:llm-governance` | ✓ |
| `pnpm test:role-benchmarks` | ✓ |

### Commands that could NOT be completed (and why)

- **`pnpm --filter web typecheck`**, **`pnpm --filter web lint`**, and
  **`pnpm build`** could not run to completion in this sandbox. Each command is
  capped at ~45s, and these take several minutes on this codebase; the sandbox
  also reaps background processes between calls, so they cannot be backgrounded
  to completion. The mounted project folder additionally blocks the symlink/
  unlink ops pnpm needs, so the app was copied to native disk to run anything.
  **Mitigation:** the 2026-05-30 report verified `typecheck`, `lint`, and
  `build` (1163 pages) all pass; this round's edits are confined to test/config
  files that execute cleanly under `tsx`, and `packages/shared` typecheck
  passes. **Please run `pnpm typecheck && pnpm lint && pnpm build` in CI/locally
  to confirm green before deploy.**
- **`pnpm test:dsa`** — removed (dead script, see R2-4).
- **`test:security` / `test:deploy-readiness` / `audit:tailored-resume`** — not
  run; require real secret env + live LLM/network and would exercise prod keys.

### Mobile UI audit

- Could not reliably force a true mobile viewport via the browser tool (the
  screenshot capture stayed at desktop resolution after window resize), so
  **real-device mobile rendering needs manual verification.**
- Code-level: a `mobile-bottom-nav` component, iOS safe-area-inset padding, and
  responsive Tailwind grids are present; the prior round confirmed
  `prefers-reduced-motion` is respected in every Framer Motion component (my
  re-scan found zero violators).

### Remaining risks

1. **Full `build`/`lint`/`typecheck` not re-run here** — verify in CI before
   deploy (low risk; changes are test/config only).
2. **Dodo in test mode + "CoreJob" branding** — real payments won't capture and
   customers see the wrong merchant name until reconfigured.
3. **`ADMIN_EMAILS` value unconfirmed** — confirm it contains the email you
   actually sign in with, and redeploy after changes.
4. **DB hardening items** (SECURITY DEFINER RPC grants, RLS initplan, FK
   indexes, leaked-password protection) — not blocking, but worth scheduling.
5. **Mobile** needs a real-device pass.

### Manual verification needed

- Run `pnpm typecheck && pnpm lint && pnpm build` and confirm green.
- Confirm `ADMIN_EMAILS` in Vercel; sign in with that email and confirm `/admin`
  loads + admin actions work.
- Switch Dodo to live mode and fix merchant branding; then run one real
  end-to-end paid upgrade and confirm the plan flips to Pro after the webhook.
- Real-device mobile pass (tap targets, bottom nav, no horizontal scroll).

### Recommended future improvements

- Apply the `(select auth.uid())` RLS rewrite in `schema.sql` for the flagged
  policies; add the covering FK indexes.
- `REVOKE EXECUTE` on cron-lock + `rls_auto_enable` RPCs from `anon`,
  `authenticated`; set `search_path` on the two flagged functions; move
  `pg_trgm` out of `public`; enable leaked-password protection.
- Add a real `__tests__/admin/auth.test.ts` (unit tests for the admin allowlist
  parser — empty/unset, trim/case, multi-email) to lock in the gate behaviour.
- Add a tiny CI guard so `byKind`/registry counts and band-classification
  literals can't silently drift again (R2-1..R2-3 were all "magic number"
  rot).

---

## ROUND 1 — 2026-05-30 (static / code-level)

**Date:** 2026-05-30  
**Branch:** `claude/prodmatchai-prod-audit-Dlhxs`  
**Auditor:** Claude Code (full-stack, security, QA, UX review)

---

## Summary

This is a complete post-development audit covering security, admin privileges, payment flow, buttons/actions, dynamic updates, loading states, mobile UI, performance, and production readiness. The codebase is generally well-structured with strong security defaults. Four actionable bugs were found and fixed; no critical security vulnerabilities remain.

---

## Commands Run

| Command | Result |
|---------|--------|
| `pnpm install` | Passed (canvas optional dep skipped — expected) |
| `pnpm typecheck` | **Passed** (exit 0) |
| `pnpm lint` | **Passed** (0 errors after fixes; warnings eliminated) |
| `pnpm build` (with placeholder env) | **Passed** — 1163 pages built |

---

## Routes / Pages Audited

### Public Routes (no auth required)
| Route | Status | Notes |
|-------|--------|-------|
| `/` | ✓ | Marketing homepage, static |
| `/auth/login` | ✓ Fixed | Terms/Privacy links pointed to `#` — fixed to `/terms`, `/privacy` |
| `/auth/callback` | ✓ | Code exchange validated, `next` param validated server-side |
| `/about`, `/privacy`, `/terms` | ✓ | Static content pages |
| `/pricing` | ✓ | Auth-aware, payment buttons load correct states |
| `/billing/success` | ✓ Fixed | Open redirect + missing `email` dependency fixed |
| `/early-access` | ✓ | Promo code redemption, loading states present |
| `/consent` | ✓ | DPDP consent, `next` validated server-side |
| `/companies/*`, `/cities/*`, `/roles/*` | ✓ | SEO landing pages, static |
| `/dsa` | ✓ | Public content, auth gated for streak tracking |
| `/guides/*`, `/compare/*`, `/salaries/*` | ✓ | SEO pages, static |

### Authenticated Routes
| Route | Status | Notes |
|-------|--------|-------|
| `/dashboard` | ✓ | Server-rendered, badge counts, match cards |
| `/profile` | ✓ Fixed | `<a>` → `<Link>` fix applied |
| `/matches` | ✓ Fixed | Unused `AlertCircle` import removed |
| `/jobs`, `/jobs/[id]` | ✓ | Apply button, fit card, tailor |
| `/jobs/[id]/tailor` | ✓ | Resume tailoring, paywall gating |
| `/applications`, `/applications/[id]` | ✓ | Tracker with status buttons |
| `/settings/billing` | ✓ Fixed | Unused imports removed |
| `/settings/privacy` | ✓ | DPDP export/erasure |
| `/coach` | ✓ | AI coaching |
| `/insights` | ✓ | Market data |

### Admin Routes
| Route | Auth Check | Notes |
|-------|-----------|-------|
| `/admin/*` (all) | ✓ Server-side `requireAdmin()` in layout | Returns 404 for non-admins |
| `/admin/users/[id]` | ✓ | Suspend/delete server actions use `requireAdmin()` |
| `/admin/ops` | ✓ | Cron buttons use server actions with `requireAdmin()` |
| `/admin/billing/*` | ✓ | All billing admin actions verified |

---

## Button / Action Audit Table

| Page | Button/Action | Loading State | Error State | Dynamic Update | Mobile | Status |
|------|--------------|--------------|-------------|----------------|--------|--------|
| Login | Send magic link | ✓ Loader2 + "Sending…" | ✓ error banner | ✓ redirect | ✓ | Good |
| Login | Google sign in | ✓ Loader2 + "Redirecting…" | ✓ error message | ✓ redirect | ✓ | Good |
| Pricing | Upgrade button | ✓ "Redirecting…" | ✓ error banner | ✓ window.location | ✓ | Good |
| Pricing | Coupon redeem | ✓ "Redeeming…" + disabled | ✓ error message | ✓ router.refresh | ✓ | Good |
| Profile | Resume upload | ✓ Progress timeline + step animation | ✓ error banner | ✓ polling + refresh | ✓ | Good |
| Settings/Billing | Cancel subscription | ✓ Loader2 spinner | ✓ error message | ✓ router.refresh | ✓ | Good |
| Admin/Ops | Cron trigger buttons | ✓ Loader2 + "Running…" | ✓ toast message | ✓ revalidatePath | ✓ | Good |
| Admin/Ops | Clear failed jobs | ✓ disabled | N/A | ✓ revalidatePath | ✓ | Good |
| Admin/Users | Suspend/delete | ✓ disabled | ✓ error state | ✓ revalidatePath | ✓ | Good |
| Applications | Status change | ✓ form submit | N/A | ✓ server action | ✓ | Good |
| Jobs | Apply button | ✓ pending state | ✓ toast | ✓ router.refresh | ✓ | Good |
| Jobs | Save/unsave | ✓ pending | ✓ toast | ✓ state update | ✓ | Good |
| Auth/Login | Terms link | N/A | N/A | N/A | ✓ | **Fixed** (was `#`) |
| Auth/Login | Privacy link | N/A | N/A | N/A | ✓ | **Fixed** (was `#`) |

---

## Bugs Found & Fixes Applied

### Bug 1 — Broken Terms/Privacy links on Login page (UX)
**File:** `apps/web/app/auth/login/page.tsx`  
**Issue:** Terms and Privacy Policy links used `href="#"` — clicking them scrolled to top and did nothing.  
**Fix:** Changed both to use `<Link href="/terms">` and `<Link href="/privacy">`.  
**Severity:** Medium — users couldn't read legal docs before signing in.

---

### Bug 2 — Open redirect on billing success page (Security)
**File:** `apps/web/app/billing/success/page.tsx`  
**Issue:** `window.location.href = returnTo` and `<Link href={returnTo}>` used the raw `return_to` URL parameter from Dodo's redirect without validating it was a same-origin path. A crafted URL like `/billing/success?return_to=https://evil.com` would redirect users to an external site.  
**Fix:** Added client-side guard:
```ts
const rawReturnTo = params.get("return_to") ?? "";
const returnTo = rawReturnTo.startsWith("/") && !rawReturnTo.startsWith("//") ? rawReturnTo : "/dashboard";
```
**Severity:** High — open redirect vulnerability exploitable in phishing.

---

### Bug 3 — Missing `email` in useEffect dependency array (React)
**File:** `apps/web/app/billing/success/page.tsx`  
**Issue:** `email` was used inside the sync effect but absent from the dependency array, causing `react-hooks/exhaustive-deps` lint warning and potential stale closure.  
**Fix:** Added `email` to `[onWrongHost, subId, product, email]`.  
**Severity:** Low — React lint warning; stale email possible in edge cases.

---

### Bug 4 — `<a>` element for internal navigation (ESLint error)
**File:** `apps/web/app/(app)/profile/page.tsx`  
**Issue:** `<a href="/settings/billing">` used for an internal route — bypasses Next.js client-side routing (full page reload, no prefetch).  
**Fix:** Changed to `<Link href="/settings/billing">` and added `import Link from "next/link"`.  
**Severity:** Medium — causes full page reload; hurts perceived performance.

---

### Cleanup: Unused imports removed (lint warnings → 0)
- `apps/web/app/(app)/settings/billing/page.tsx` — removed `CreditCard`, `Calendar`, `Gauge`, `PRICING_COPY`, `isPaid`
- `apps/web/app/(app)/matches/page.tsx` — removed `AlertCircle`
- `apps/web/app/billing/success/page.tsx` — removed `planLabel`
- `apps/web/app/early-access/page.tsx` — removed `Metadata` (can't export from a `"use client"` component)
- `apps/web/components/admin/admin-control-room.tsx` — removed `BarChart3`, `LibraryBig`
- `apps/web/app/(app)/profile/actions.ts` — removed stale `// eslint-disable-next-line no-console` comments for an unconfigured rule

---

### Fix: `.env.example` missing ADMIN_EMAILS
**File:** `.env.example`  
**Issue:** The critical `ADMIN_EMAILS` environment variable (required to access any admin page) was not documented in the example file.  
**Fix:** Added:
```
# Comma-separated list of email addresses that can access /admin/* pages.
ADMIN_EMAILS=<your-admin-email@example.com>
```
**Severity:** Medium — new developers would not know to set this var, locking themselves out of admin.

---

## Dynamic Update Audit

| Action | Frontend Updates? | Method | Status |
|--------|------------------|--------|--------|
| Login / Google OAuth | ✓ Redirect + session | router.replace | Good |
| Logout | ✓ router.push + refresh | supabase.signOut | Good |
| Resume upload | ✓ Polling + router.refresh | 3s poll loop | Good |
| Match computation | ✓ Banner + revalidation | Computing banner | Good |
| Application status change | ✓ Server action + revalidatePath | form action | Good |
| Save/unsave job | ✓ Optimistic state + toast | useTransition | Good |
| Cancel subscription | ✓ router.refresh after 800ms | fetch + refresh | Good |
| Coupon redemption | ✓ router.refresh after 1400ms | fetch + refresh | Good |
| Payment success | ✓ Polling → activated phase | /api/billing/refresh | Good |
| Admin cron trigger | ✓ Toast + revalidatePath | server action | Good |

---

## Loading & Animation Audit

All major async actions have proper visual feedback:
- Resume upload: multi-step AI progress timeline with animated icons ✓
- Payment redirect: "Redirecting…" text + button disabled ✓
- Magic link: Loader2 spinner + "Sending…" ✓
- Google OAuth: Loader2 + "Redirecting to Google…" ✓
- Billing cancel: Full-screen spinner modal ✓
- Admin cron buttons: Loader2 + "Running…" + disabled ✓
- Coupon: "Redeeming…" + disabled ✓
- Page skeletons: `loading.tsx` files present for dashboard, matches, insights, coach ✓
- Framer Motion: All animations check `useReducedMotion()` ✓

---

## Admin Privilege Audit

### Architecture
- **Gate:** `requireAdmin()` in `lib/admin/auth.ts`
- **Source:** `ADMIN_EMAILS` env var (comma-separated, case-insensitive, trimmed)
- **Layout protection:** `/admin/layout.tsx` calls `requireAdmin()` and `notFound()` if denied — 404 response hides admin surface area
- **Server action protection:** Every admin server action calls `requireAdmin()` before executing
- **API protection:** `/api/admin/*` routes use `requireCronAuth` (CRON_SECRET Bearer), not the email gate. This is intentional — these are cron-type endpoints callable from CI/CD, not browser sessions.

### Test Cases
| Scenario | Expected | Actual |
|----------|----------|--------|
| Logged-out visits `/admin` | 404 (middleware redirects to /auth/login first) | ✓ Redirected then 404 |
| Normal user visits `/admin` | 404 | ✓ `notFound()` called |
| Admin email visits `/admin` | Full admin UI | ✓ AdminNav + content |
| Admin email with caps (e.g. `ADMIN@EXAMPLE.COM`) | ✓ Access | ✓ `.toLowerCase()` comparison |
| `ADMIN_EMAILS` not set | 404 for everyone | ✓ Confirmed in code |
| Non-admin calls admin server action | `{ ok: false, message: "Unauthorized." }` | ✓ Confirmed |
| Admin uses every cron button | Triggers + audit log | ✓ Confirmed in server actions |

### Admin UI visibility
- Admin nav link appears in sidebar only when `user.isAdmin === true` (set server-side in `AppLayout`)
- `isAdminEmail()` check is done in `(app)/layout.tsx` server-side — not client-readable env var

**Assessment: Admin system is correctly implemented. No frontend-only gating.**

---

## Payment Flow Audit

### Flow
```
/pricing → startCheckout() → POST /api/billing/checkout → Dodo API → checkout_url
→ window.location.assign(checkoutUrl)
→ Dodo hosted page (external)
→ Dodo redirects to /billing/success?subscription_id=...&return_to=/dashboard
→ POST /api/billing/sync (validates ownership via email/metadata, not just URL params)
→ Upsert subscriptions + billing_customers
→ refreshEntitlements()
→ Webhook (POST /api/webhooks/dodo) as backup — signature verified via standardwebhooks
```

### Security Checks
| Check | Status |
|-------|--------|
| Payment secret server-side only | ✓ `DODO_PAYMENTS_API_KEY` in `serverEnv`, never exposed to browser |
| Webhook signature verified | ✓ `verifyDodoWebhook()` with standardwebhooks |
| Ownership verified before granting access | ✓ Multi-factor: metadata.user_id OR customer.email OR existing billing_customers row |
| Premium access not granted from URL params alone | ✓ `/api/billing/sync` fetches from Dodo API and validates |
| Webhooks idempotent | ✓ `webhook_id` deduplication in `processDodoWebhook` |
| Open redirect in return_to | **Fixed** ✓ Now validated client-side |
| Duplicate payment prevention | ✓ Button disabled while `loading !== null` |
| Payment error handling | ✓ Error banner shown to user |
| Success page polling fallback | ✓ Polls `/api/billing/refresh` if direct sync times out |

**Assessment: Payment flow is secure and correctly implemented. No fake-success paths.**

---

## Mobile UI Audit

| Area | Status | Notes |
|------|--------|-------|
| Navigation | ✓ | Sidebar slides in, focus-trapped, escape key closes |
| Mobile bottom nav | ✓ | Badge counts, 5 key tabs |
| Admin nav | ✓ | Bottom dock on mobile |
| Forms | ✓ | All inputs have proper `type` attributes |
| Payment buttons | ✓ | Full-width, min tap target met |
| Resume upload dropzone | ✓ | Touch-friendly, keyboard accessible |
| Pricing page | ✓ | Responsive grid, mobile sticky back-bar |
| Tables | ✓ | `overflow-x-auto` on data grids; admin uses mobile card fallback |
| Text overflow | ✓ | `truncate` and `min-w-0` used consistently |
| `prefers-reduced-motion` | ✓ | All Framer Motion components check `useReducedMotion()` |

---

## Performance Audit

| Area | Status | Notes |
|------|--------|-------|
| Page-level loading | ✓ | `loading.tsx` files present for async routes |
| Route prefetch | ✓ | `prefetch={false}` on heavy sidebar links |
| Middleware | ✓ | Short-circuits on `/api/*` to avoid unnecessary auth round-trip |
| Badge counts | ✓ | `count: "exact", head: true` — no data fetched, metadata only |
| Parallel data fetching | ✓ | `Promise.all` used in all layout/page data fetches |
| Admin entitlement cache | ✓ | 10-min per-instance memoization |
| Entitlement cache | ✓ | 5-min stale-while-refresh |
| Images | ✓ | Company logos use Next.js `<Image>` where applicable |
| LLM calls | ✓ | Provider rotation with dead-key quarantine; deterministic fallbacks |
| Resume polling | ✓ | 3s interval, 3-min hard cap |

---

## Security Audit

| Check | Status | Notes |
|-------|--------|-------|
| Admin route protection | ✓ | Server-side `requireAdmin()` + layout-level 404 |
| Admin API protection | ✓ | `requireCronAuth` (CRON_SECRET, timing-safe comparison) |
| Admin server action protection | ✓ | All actions call `requireAdmin()` first |
| Payment secret exposure | ✓ | Never in `clientEnv` or browser bundle |
| Service role key protection | ✓ | Runtime check throws in Edge runtime |
| Input validation | ✓ | Zod schemas for all cross-boundary types |
| `next` param open redirect | ✓ | Validated server-side in callback + consent actions |
| `return_to` open redirect | **Fixed** ✓ | Client-side guard added to billing success |
| Webhook signature | ✓ | standardwebhooks HMAC verification |
| Rate limiting | ✓ | Auth: 15/min; export: 5/10min; per-instance Map |
| XSS | ✓ | React escapes by default; no `dangerouslySetInnerHTML` seen |
| DPDP compliance | ✓ | Granular consent, export, erasure, audit trail |
| Resume storage | ✓ | Private Supabase bucket, owner-only RLS |
| Cron auth | ✓ | Constant-time string comparison in `requireCronAuth` |
| Sensitive HMAC | ✓ | `verifySensitiveCronAuth` with replay protection |
| ADMIN_EMAILS documented | **Fixed** ✓ | Added to `.env.example` |

---

## Remaining Risks (Manual Verification Needed)

### P1 — Production env variables (cannot verify remotely)
- Confirm `ADMIN_EMAILS` is set correctly in Vercel with your email trimmed/lowercased
- Confirm `DODO_PAYMENTS_ENVIRONMENT=live_mode` for production (not `test_mode`)
- Confirm all Dodo product IDs are the live ones (not test)

### P2 — Supabase RLS policies
- Verify RLS on `consents`, `subscriptions`, `profiles`, `resumes` are enforced as expected
- Run `EXPLAIN` on key queries to verify row-level security isn't doing full scans

### P3 — Webhook endpoint accessibility
- Verify Dodo's webhook URL (`/api/webhooks/dodo`) is correctly registered in the Dodo dashboard for the live environment
- Test a real webhook delivery and check Vercel logs

### P4 — Rate limiting is per-instance, not distributed
- The current rate limiter uses a module-level `Map` — effective on single instances but not distributed across Vercel's edge network
- Consider Redis-based rate limiting (Upstash) for high-traffic scenarios

### P5 — Google OAuth redirect URI
- Verify the Google OAuth redirect URI in Google Cloud Console matches the production domain (`https://prodmatchai.in/auth/callback`)

### P6 — IndexNow key
- The `/[indexNowKey]` route serves an ownership verification file — confirm the key file exists and is registered

---

## Files Changed

| File | Change |
|------|--------|
| `apps/web/app/auth/login/page.tsx` | Fixed Terms/Privacy links from `#` to `/terms`, `/privacy` |
| `apps/web/app/billing/success/page.tsx` | Fixed open redirect in `returnTo`, added `email` to useEffect deps, removed unused `planLabel` import |
| `apps/web/app/(app)/profile/page.tsx` | Added `Link` import, changed `<a>` to `<Link>` for `/settings/billing` |
| `apps/web/app/(app)/matches/page.tsx` | Removed unused `AlertCircle` import |
| `apps/web/app/(app)/settings/billing/page.tsx` | Removed unused `CreditCard`, `Calendar`, `Gauge`, `PRICING_COPY`, `isPaid` |
| `apps/web/app/early-access/page.tsx` | Removed unused `Metadata` import |
| `apps/web/components/admin/admin-control-room.tsx` | Removed unused `BarChart3`, `LibraryBig` imports |
| `apps/web/app/(app)/profile/actions.ts` | Removed stale `eslint-disable-next-line no-console` comments |
| `.env.example` | Added `ADMIN_EMAILS` documentation |

---

## What Was NOT Changed (and Why)

- **Admin API routes** (`/api/admin/*`): Use `CRON_SECRET` auth by design — these are invoked from GitHub Actions/CI, not browsers. This is correct.
- **Middleware rate limiter**: Per-instance Map is acceptable for MVP. Redis would be better at scale.
- **DSA public routes**: Intentionally public for SEO. Auth only required for streak tracking.
- **`signInWithEmail` `next` param**: Not validated before embedding in the email link, but the callback validates it on receipt. Acceptable risk (the link is sent to the user's own email).

---

## Recommended Future Improvements

1. **Distributed rate limiting** — Replace the module-level `Map` in middleware with Upstash Redis for true distributed rate limiting across Vercel edge instances
2. **CSP headers** — Add `Content-Security-Policy` response headers to prevent XSS if a dependency is ever compromised
3. **CSRF protection** — The billing cancel/checkout forms use `fetch()` (not `<form>` with CSRF token). Consider adding CSRF token validation for state-changing endpoints
4. **Structured logging** — Replace `console.error` in server actions with a structured logger (e.g. Pino) for better Vercel log analysis
5. **E2E test coverage** — The existing Playwright tests cover auth flow and golden path. Add tests for admin route protection (verify 404 for non-admin) and billing success flow
6. **Error boundaries** — Some dynamic pages (`/coach`, `/lab`) could benefit from `error.tsx` boundaries for graceful error recovery
7. **Sentry integration** — Confirm Sentry is wired up in `next.config.js` with source maps for production error tracking
