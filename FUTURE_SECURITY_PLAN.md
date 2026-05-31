# Future Security Plan

Date: 2026-05-31

## Before Production Launch

- Verify Supabase RLS and private Storage policies in the hosted `ap-south-1` project with a non-owner account.
- Confirm all Vercel production secrets are server-only and that no service-role, webhook, cron, Gemini, Resend, Sentry auth, or admin allowlist values use `NEXT_PUBLIC_*`.
- Rotate Dodo webhook, cron, Supabase service-role, Gemini, and Resend secrets before launch if any were shared in local development.
- Exercise billing checkout, webhook delivery, billing sync, admin reconcile, cancellation, and portal flows against Dodo test mode.
- Run DPDP flows end to end: consent grant/revoke, data export, erasure request, resume deletion, and audit-event append.

## Hardening Backlog

- Tighten CSP by removing `unsafe-eval` and reducing `unsafe-inline` after testing Next.js, Tailwind, theme hydration, analytics, and Vercel tooling.
- Add a CI job that runs `pnpm audit --audit-level moderate`, `pnpm test:security`, typecheck, lint, and build on every PR.
- Add focused tests for admin action authorization, Dodo webhook idempotency, signed webhook failure cases, and resume upload rejection cases.
- Add periodic secret scanning in CI and block commits that introduce service-role keys, webhook secrets, or private API keys.
- Add explicit per-page `requireAdmin()` checks to future admin pages as defense in depth, even when the admin layout already protects the route tree.
- Track Next.js `middleware` to `proxy` migration to avoid future framework deprecation drift.

## Monitoring

- Keep Sentry scrubbing rules enabled for emails, user IDs, resume content, profile fields, storage paths, and payment identifiers.
- Alert on repeated billing sync failures, webhook verification failures, admin reconcile failures, export/erasure failures, and resume parse queue failures.
- Review dependency advisories weekly and after every Next.js, Supabase, Playwright, or PDF stack update.

