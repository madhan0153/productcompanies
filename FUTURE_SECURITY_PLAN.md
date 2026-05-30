# Future Security Plan — ProdMatch.ai

**Created:** 2026-05-30  
**Owner:** madhan0153@gmail.com  
**Review cadence:** Monthly

---

## Weekly Checklist

- [ ] Review Vercel function logs for anomalies (spike in 4xx/5xx, unusual IPs)
- [ ] Check Supabase Auth > Authentication > Logs for failed login attempts
- [ ] Review Sentry error dashboard for new error classes
- [ ] Scan for new CVEs in direct dependencies: `pnpm audit --audit-level=high`

---

## Monthly Checklist

- [ ] Run full `pnpm audit` — triage all moderate+ findings
- [ ] Update `@supabase/ssr` and `@supabase/supabase-js` to latest patch
- [ ] Update `next` to latest patch in current minor (e.g., 16.2.x → 16.2.latest)
- [ ] Rotate `CRON_SECRET` — update Vercel env var + GitHub Actions secret
- [ ] Rotate `RESEND_API_KEY` — generate a new key in Resend dashboard
- [ ] Check Dodo Payments dashboard for webhook delivery failures
- [ ] Review `dpdp_events` table for any anomalous export/erasure bursts
- [ ] Review RLS policies after any schema migration with: `SELECT * FROM pg_policies WHERE tablename IN ('profiles','matches','applications','resume_versions','consents');`

---

## Quarterly Checklist

- [ ] Full dependency upgrade pass: `pnpm up --interactive --latest` (test in staging)
- [ ] Rotate `SUPABASE_SERVICE_ROLE_KEY` — generate new key in Supabase dashboard
- [ ] Rotate `GEMINI_API_KEY` — create new key in Google AI Studio
- [ ] Rotate `DODO_PAYMENTS_API_KEY` and `DODO_PAYMENTS_WEBHOOK_KEY`
- [ ] Review `ADMIN_EMAILS` env var — remove any departed team members
- [ ] Run OWASP ZAP baseline scan against staging URL
- [ ] Review all Server Actions for missing auth checks (search `"use server"` files for functions without `supabase.auth.getUser()`)
- [ ] Check that CSP headers still cover all new external domains added in the quarter

---

## Dependency Update Priority

| Dependency | Why | Check frequency |
|------------|-----|-----------------|
| `next` | Core framework; active CVE history | Weekly |
| `@supabase/ssr` / `@supabase/supabase-js` | Auth + RLS; ws transitive dep | Monthly |
| `@google/generative-ai` | LLM client; prompt handling | Monthly |
| `standardwebhooks` | Payment signature verification | Monthly |
| `zod` | Input validation at all boundaries | Quarterly |

---

## Secret Rotation Procedures

### CRON_SECRET
1. Generate: `openssl rand -hex 32`
2. Update Vercel: Settings → Environment Variables → `CRON_SECRET`
3. Update GitHub Actions: Repo Settings → Secrets → `CRON_SECRET`
4. Deploy to trigger env refresh

### SUPABASE_SERVICE_ROLE_KEY
1. Go to Supabase Dashboard → Project Settings → API → Service Role key → Roll
2. Update Vercel env var immediately
3. Trigger a Vercel deployment to pick up the new value

### DODO_PAYMENTS_API_KEY
1. Log into Dodo Payments dashboard → API Keys → Generate new
2. Update `DODO_PAYMENTS_API_KEY` in Vercel
3. Revoke the old key only after confirming the new key works (check `/api/billing/diagnose`)

### GEMINI_API_KEY
1. Go to Google AI Studio → API Keys → Create new key
2. Update `GEMINI_API_KEY` in Vercel
3. Monitor LLM error logs for `dead_key_*` events to confirm the new key is active
4. Revoke old key in Google Cloud Console

---

## Incident Response Playbook

### Suspected Account Compromise
1. Immediately revoke the affected user's session: Supabase Auth → Users → Invalidate sessions
2. Log the event in `dpdp_events` with `event: 'account_compromised'`
3. Notify the user via Resend (use the erasure confirmation template as a starting point)
4. Review `dpdp_events` for any `export_requested` events by this user in the last 48h

### Suspected Secret Leak (API key, service role key)
1. Rotate the leaked secret immediately (see procedures above)
2. Check Vercel logs for the last 24h for any requests using the old secret
3. Review GitHub Actions run history — confirm the secret is not printed in any log
4. If `SUPABASE_SERVICE_ROLE_KEY` leaked: audit `admin.*` Supabase operations in the last 24h

### Payment Webhook Anomaly (unexpected charges, duplicate events)
1. Check `webhook_events` table in Supabase for duplicate `webhook_id` entries
2. Check Dodo dashboard for the subscription in question
3. If duplicate entitlement granted: run `SELECT * FROM user_entitlements WHERE user_id = '<uid>'` and manually reset if needed
4. Contact Dodo support with the `subscription_id` and `webhook_id`

### Data Export / Erasure Abuse
1. Check `dpdp_events` for bulk `export_requested` events (>5 exports in 1 hour)
2. The export endpoint is rate-limited 5/10min per IP in middleware — check if the same IP is rotating
3. If PII was accessed anomalously, notify affected users within 72h per DPDP Act 2023 requirements

### LLM Key Exhaustion / Dead-Key Storm
1. Check `llm_key_states` (or equivalent) table for keys in `quarantine` state
2. Add new Gemini API keys to `GEMINI_API_KEY` (comma-separated if the setup supports it)
3. Check `llm_run_errors` in logs for the error kind (`quota_exceeded`, `invalid_key`, etc.)

---

## Pending Security Improvements (Backlog)

| Priority | Item | Effort |
|----------|------|--------|
| Medium | Add rate limit to `/api/billing/promo` | 30min |
| Medium | Upgrade `@supabase/ssr` when ws >= 8.21.0 ships | Low |
| Low | Consider removing Microsoft Clarity for stronger privacy compliance | Medium |
| Low | Evaluate nonce-based CSP to remove `unsafe-inline`/`unsafe-eval` from script-src | High |
| Low | Add Dependabot or Renovate bot for automated PRs on dependency updates | Low |
| Low | Add `pnpm audit --audit-level=moderate` as a CI gate in GitHub Actions | Low |
| Informational | Annual penetration test by a third-party security firm | High |

---

## Compliance Notes (DPDP Act 2023)

- **Data retention:** Currently no automatic deletion of old resume versions or match history. Implement a 2-year retention policy with a cron job calling `DELETE FROM resume_versions WHERE created_at < NOW() - INTERVAL '2 years' AND user_id NOT IN (SELECT id FROM profiles WHERE active_resume_version_id = resume_versions.id)`.
- **Breach notification:** Under DPDP Act 2023, personal data breaches must be reported to the Data Protection Board within 72 hours. Ensure Sentry alerts are configured to notify immediately on production errors involving user data.
- **Third-party processors:** Microsoft Clarity and Vercel Analytics are third-party data processors. Ensure these are disclosed in the Privacy Policy and that users can opt out via the analytics consent toggle.
