# Security Fixes Summary

Date: 2026-05-31

## Code Changes

- Sanitized billing sync telemetry and responses in `apps/web/app/api/billing/sync/route.ts`.
- Sanitized admin billing reconciliation diagnostics in `apps/web/lib/admin/actions/reconcile.ts` and the reconcile client UI.
- Removed raw response/error logging from `apps/web/app/billing/success/page.tsx`.
- Removed raw upload and parsing exception details from `apps/web/app/(app)/profile/actions.ts`.
- Added `apps/web/lib/security/route-rate-limit.ts` and wired shared limits into billing, admin maintenance, and Dodo webhook routes.
- Replaced one profile billing anchor with `next/link` while touching the profile surface.
- Extended `apps/web/scripts/security-smoke.ts` to guard against regression of PII logging, upstream-body exposure, unsafe env examples, and resume upload logging.

## Dependency Changes

- Upgraded `next` from `16.2.4` to `16.2.6`.
- Upgraded `eslint-config-next` from `16.2.4` to `16.2.6`.
- Added pnpm overrides for:
  - `tar` to `^7.5.11`
  - `postcss` to `^8.5.12`
  - `ws` to `^8.20.1`
  - `minimatch@10.2.5>brace-expansion` to `^5.0.6`

## Config and Docs

- Updated `.env.example` with `ADMIN_EMAILS`, `INDEXNOW_KEY`, optional public Clarity ID guidance, and a warning not to expose server secrets through `NEXT_PUBLIC_*`.
- Added this summary, the audit report, and the future security plan.

## Verification Result

The final local audit reports no known vulnerabilities at moderate or higher severity. Security smoke tests, PDF parser tests, typecheck, lint, and production build pass.
