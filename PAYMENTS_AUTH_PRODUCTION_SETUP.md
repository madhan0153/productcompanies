# ProdMatchAI payments and Google Auth production setup

This checklist matches the implemented routes and environment module.

## Vercel environment variables

| Variable | Secret | Development | Preview | Production | Source |
|---|---:|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | No | `http://localhost:3000` | Preview URL | `https://prodmatchai.in` | ProdMatchAI domain |
| `DODO_PAYMENTS_ENVIRONMENT` | No | `test_mode` | `test_mode` | `live_mode` | Fixed value |
| `DODO_PAYMENTS_BASE_URL` | No | Usually unset | Usually unset | Usually unset | Optional override only |
| `DODO_PAYMENTS_API_KEY` | Yes | Test key | Test key | Live key | Dodo dashboard |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Yes | Test webhook key | Test webhook key | Live webhook key | Dodo webhook configuration |
| `DODO_PRODUCT_PRO_MONTHLY_ID` | No | Test product | Test product | Live product | Dodo product |
| `DODO_PRODUCT_PRO_YEARLY_ID` | No | Test product | Test product | Live product | Dodo product |
| `DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID` | No | Test product | Test product | Live product | Dodo product |
| `DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID` | No | Test product | Test product | Live product | Dodo product |
| `DODO_PRODUCT_TAILOR_CREDITS_50_ID` | No | Test product | Test product | Live product | Dodo product |
| `DODO_PRODUCT_PAYMENT_TEST_10_INR_ID` | No | Unset | Unset | Live ₹10 product | Dodo product |
| `ENABLE_PAYMENT_TEST_PLAN` | No | `false` | `false` | `false`, then temporarily `true` | Feature flag |
| `PAYMENT_TEST_ALLOWED_EMAILS` | No | Unset | Unset | Approved account(s) only | Comma-separated allowlist |
| `ADMIN_EMAILS` | No | Admin account(s) | Admin account(s) | Admin account(s) | Comma-separated allowlist |

Never give Dodo keys or the Supabase service-role key a `NEXT_PUBLIC_` prefix. Redeploy after changing any variable.

Production webhook URL:

`https://prodmatchai.in/api/webhooks/dodo`

Use Dodo's live key and live product IDs only in Vercel Production. Preview deployments must remain in `test_mode`.

## Dodo product mapping

| Internal key | Display | Type | INR amount | Interval | Product env variable | Visible |
|---|---|---|---:|---|---|---|
| `pro_monthly` | Pro | Subscription | ₹99 | Monthly | `DODO_PRODUCT_PRO_MONTHLY_ID` | Public |
| `pro_yearly` | Pro | Subscription | ₹999 | Yearly | `DODO_PRODUCT_PRO_YEARLY_ID` | Public |
| `career_sprint_monthly` | Career Sprint | Subscription | ₹499 | Monthly | `DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID` | Public |
| `career_sprint_yearly` | Career Sprint | Subscription | ₹4,999 | Yearly | `DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID` | Public |
| `tailor_credits_50` | 50 Tailor Credits | One-time | ₹999 | None | `DODO_PRODUCT_TAILOR_CREDITS_50_ID` | Public |
| `payment_test_10_inr` | Payment Verification | One-time | ₹10 | None | `DODO_PRODUCT_PAYMENT_TEST_10_INR_ID` | Hidden, temporary |

The current Dodo Checkout Sessions API uses product IDs; this codebase has no separate price-ID variables.

## Dodo test-mode validation

1. Create/verify the five normal test products with the exact amounts and intervals above.
2. Add the test IDs and test API key to Development/Preview.
3. Register `https://prodmatchai.in/api/webhooks/dodo` only if production is intentionally using test mode; otherwise use a preview/tunnel URL for test delivery.
4. Subscribe to: `payment.succeeded`, `payment.failed`, `payment.processing`, `payment.cancelled`, `subscription.active`, `subscription.renewed`, `subscription.updated`, `subscription.plan_changed`, `subscription.on_hold`, `subscription.failed`, `subscription.cancelled`, `subscription.expired`, `refund.succeeded`, `refund.failed`, `dispute.opened`, and `dispute.lost`.
5. Run checkout, confirm one invoice/payment row, confirm one subscription row, refresh/re-login, open the customer portal, cancel at period end, redeliver the same webhook, and test a refund.
6. Confirm `/admin/billing` reports no failed webhook events.

## Live ₹10 verification

1. Complete Dodo business verification and create a live one-time INR ₹10 product. If Dodo rejects ₹10, use its displayed minimum and update `PRICING.payment_test.once` before testing.
2. Add its ID as `DODO_PRODUCT_PAYMENT_TEST_10_INR_ID` in Vercel Production.
3. Set `PAYMENT_TEST_ALLOWED_EMAILS` to the approved account.
4. Set `ENABLE_PAYMENT_TEST_PLAN=true` and redeploy.
5. Sign in with the approved account and open `/settings/billing`.
6. Complete the “Live payment verification” checkout.
7. Confirm one verification invoice, no Pro/Sprint entitlement, successful webhook processing, billing-history visibility, duplicate-webhook safety, and refund synchronization.
8. Immediately set `ENABLE_PAYMENT_TEST_PLAN=false` and redeploy. Historical financial records remain intact.

## Google sign-in branding

The `wmnuinlnsisifalgrpui.supabase.co` text is the Supabase Auth callback host. Application code cannot rename it.

1. In Google Auth Platform, open **Branding** and set the application name to `ProdMatchAI`, add the ProdMatchAI logo, support email, homepage `https://prodmatchai.in`, privacy URL, terms URL, and verify the brand.
2. In Supabase **Project Settings → General → Custom Domains**, configure `auth.prodmatchai.in` (paid Supabase add-on), or configure a Supabase vanity subdomain.
3. Add DNS CNAME `auth.prodmatchai.in` → `wmnuinlnsisifalgrpui.supabase.co`.
4. Complete Supabase's TXT verification and activate the domain.
5. Before activation, add this Google OAuth authorized redirect URI:
   `https://auth.prodmatchai.in/auth/v1/callback`
6. Keep the old callback temporarily during rollout:
   `https://wmnuinlnsisifalgrpui.supabase.co/auth/v1/callback`
7. Set Vercel `NEXT_PUBLIC_SUPABASE_URL=https://auth.prodmatchai.in` for Production and redeploy.
8. Keep Supabase Auth Site URL as `https://prodmatchai.in` and allow `https://prodmatchai.in/auth/callback`.

After activation, Google should show the verified ProdMatchAI brand and the branded Auth domain instead of the random Supabase project host.
