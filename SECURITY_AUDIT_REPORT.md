# Security Audit Report

Date: 2026-05-31

## Scope

This audit covered the Next.js app, Supabase server/client usage, admin gates, billing sync and reconcile flows, Dodo webhook surface, resume upload/parsing paths, dependency advisories, security headers, environment variable examples, and local verification scripts.

## Status

No critical, high, or moderate dependency advisories remain after the patch set. Local security smoke tests, PDF parser tests, TypeScript, lint, and production build were run. Lint exits successfully with existing unused-symbol warnings.

## Confirmed Controls

- Admin access is server-gated through `ADMIN_EMAILS`; an unset allowlist fails closed.
- Service-role Supabase access is isolated in server-only helpers and blocks Edge runtime usage.
- API routes that bypass middleware perform their own authentication or secret checks.
- Resume uploads require matching consent, PDF validation, per-user rate limiting, private bucket storage, and owner-only storage policies.
- DPDP consent, audit tables, export, and erasure primitives exist in the schema and app surface.
- Security headers include CSP, HSTS, frame denial, MIME sniffing protection, referrer policy, and restrictive permissions policy.
- Dodo webhook handling uses signed webhook verification and idempotent event persistence.
- Billing, admin maintenance, Dodo webhook, resume upload/import, auth, export, and selected AI-heavy actions now have route-level or shared rate limiting.

## Findings Fixed

- Patched known dependency advisories by upgrading `next` and `eslint-config-next` to `16.2.6` and adding narrow pnpm overrides for vulnerable transitive packages.
- Removed PII-bearing and upstream-body logging from billing sync and admin reconcile flows.
- Removed raw upload/parse exception details from resume upload failure logs and user-facing job errors.
- Hardened billing success client warnings to avoid response-body logging.
- Added shared route rate limiting to billing checkout/promo/cancel/refresh/sync/diagnose, admin maintenance endpoints, and Dodo webhooks.
- Added static security-smoke checks for billing, admin reconcile, upload logging, and env exposure regressions.
- Updated `.env.example` with server-only admin allowlist guidance and explicit `NEXT_PUBLIC_*` secret warnings.

## Residual Risks

- CSP still permits `unsafe-inline` and `unsafe-eval` because the current Next.js/Tailwind/runtime setup needs compatibility testing before tightening.
- Admin pages rely on the admin layout for page access; server actions are independently gated, but future admin pages should keep mutation gates explicit.
- Some security properties require production checks: Supabase RLS/storage policies, Dodo webhook secret configuration, Vercel env scoping, and real OAuth redirect settings.
- Local audit cannot prove that deployed secrets are rotated, least-privilege, or absent from client bundles.

## Verification

- `pnpm audit --audit-level moderate`: passed, no known vulnerabilities.
- `pnpm test:security`: passed.
- `pnpm test:pdf-text`: passed, 5 tests.
- `pnpm --filter web typecheck`: passed.
- `pnpm --filter web lint`: passed with 9 existing warnings.
- `pnpm --filter web build`: passed on Next.js 16.2.6.
