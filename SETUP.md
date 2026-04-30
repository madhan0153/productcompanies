# ProdMatch.ai — Production Setup Checklist

Follow these in order. Skip any step and Google sign-in will silently fail.

## 1. Vercel — Environment Variables

Go to: **Vercel → Project → Settings → Environment Variables**

Set for **Production, Preview, and Development**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase → Project Settings → API (server only) |
| `NEXT_PUBLIC_APP_URL` | `https://prodmatchai.vercel.app` (your production URL) |
| `GEMINI_API_KEY` | `key1,key2,key3` (comma-separated for round-robin) |
| `RESEND_API_KEY` | From Resend dashboard |
| `RESEND_FROM_EMAIL` | `ProdMatch.ai <noreply@yourdomain.com>` |
| `CRON_SECRET` | A random 64-char hex string |
| `DPDP_POLICY_VERSION` | `1` |

Re-deploy after setting these.

## 2. Supabase — URL Configuration (CRITICAL for OAuth)

Go to: **Supabase Dashboard → Authentication → URL Configuration**

### Site URL
Set to your production URL:
```
https://prodmatchai.vercel.app
```

### Redirect URLs (allowlist — every URL Supabase is allowed to redirect to after auth)
Add **all** of these:
```
https://prodmatchai.vercel.app/auth/callback
https://prodmatchai.vercel.app/auth/callback?**
https://*.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

The wildcard `https://*.vercel.app/auth/callback` allows preview deployments. Without these entries, Supabase will reject the redirect and silently send users back to the Site URL — which is exactly the bug you saw (lands on home page after Google login).

## 3. Google Cloud Console — OAuth 2.0 Client ID

Go to: **console.cloud.google.com → APIs & Services → Credentials → your OAuth 2.0 Client ID**

### Authorized JavaScript origins
Add **all** of these (this is the field you missed):
```
https://prodmatchai.vercel.app
http://localhost:3000
https://<your-supabase-project-ref>.supabase.co
```

### Authorized redirect URIs
Add **only this one** (this is what Google calls back to — Supabase, not your app):
```
https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
```

> Replace `<your-supabase-project-ref>` with the part before `.supabase.co` in your `NEXT_PUBLIC_SUPABASE_URL` (e.g. if URL is `https://abcdef.supabase.co`, ref is `abcdef`).

Save. Changes take effect in seconds.

## 4. Supabase — Enable Google Provider

Go to: **Supabase → Authentication → Providers → Google**

- Toggle **Enable**
- Paste **Client ID** from Google Cloud Console
- Paste **Client Secret** from Google Cloud Console
- Save

## 5. Run the Schema

In Supabase SQL Editor, paste the entire contents of `supabase/schema.sql` and run it. Re-runnable; will not duplicate.

Verify in Supabase Studio:
- 18 rows in `companies`
- All tables visible
- Storage bucket `resumes` exists and is private

## 6. GitHub — Crawler Secrets

Go to: **GitHub → Repo Settings → Secrets and variables → Actions**

Add:
- `SUPABASE_URL` → same as `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` → service role key

The crawler workflow runs daily at 02:00 IST.

## 7. Resend — Domain Verification (when ready)

For production email sending, verify your sending domain in Resend. Until then, magic links and digest emails will only deliver to your verified test addresses.

---

## Troubleshooting OAuth

**Symptom**: After "Continue" on Google, you land on the home page instead of the dashboard.

**Causes (in order of likelihood):**

1. **Redirect URL not in Supabase allowlist** → Step 2 above. Most common cause.
2. **`NEXT_PUBLIC_APP_URL` missing on Vercel** → Step 1.
3. **JavaScript Origins missing in Google** → Step 3. The OAuth consent screen will load but the token exchange fails silently in some browsers.
4. **Supabase Site URL pointing at the wrong domain** → Step 2. If Site URL is `localhost`, every prod login bounces to `http://localhost:3000`.

**How to verify**: Open DevTools → Network tab → click "Continue with Google". Watch the redirect chain. The final hop should be `/auth/callback?code=...` on your domain. If it's `/?code=...` (no `/auth/callback`), that's the Supabase allowlist issue.
