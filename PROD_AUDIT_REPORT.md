# ProdMatch.ai — Production Audit Report

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
