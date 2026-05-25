import { z } from "zod";

// Treat empty strings as undefined for optional keys
const optStr = z.string().transform(v => v || undefined).optional();

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: optStr,
  GEMINI_API_KEY: optStr,
  RESEND_API_KEY: optStr,
  RESEND_FROM_EMAIL: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  DPDP_POLICY_VERSION: z.string().default("1"),
  DODO_PAYMENTS_API_KEY: optStr,
  DODO_PAYMENTS_WEBHOOK_KEY: optStr,
  DODO_PAYMENTS_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
  DODO_PRODUCT_PRO_MONTHLY_ID: optStr,
  DODO_PRODUCT_PRO_YEARLY_ID: optStr,
  DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID: optStr,
  DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID: optStr,
  DODO_PRODUCT_TAILOR_CREDITS_50_ID: optStr,
  // Sprint 3 Item 12 — comma-separated allowlist of emails that can access
  // /admin/*. Empty / unset = admin pages return 404 (no access for anyone).
  ADMIN_EMAILS: optStr,
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

// During `next build` Next.js executes module code while collecting page data.
// If env vars haven't been added to Vercel yet the parse throws and breaks the
// build before the app has even run.  We detect the build phase and warn
// instead of throwing — any missing vars will surface at request time with a
// clear error, which is easier to act on than a broken CI build.
const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  values: Record<string, string | undefined>,
): z.infer<T> {
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  if (isBuildPhase) {
    console.warn(
      "[env] Missing env vars during build (set them in Vercel → Project Settings → Environment Variables):\n",
      JSON.stringify(result.error.flatten().fieldErrors, null, 2),
    );
    return values as z.infer<T>;
  }
  throw result.error;
}

export const clientEnv = parseEnv(clientSchema, {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

export const serverEnv = parseEnv(serverSchema, {
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  CRON_SECRET: process.env.CRON_SECRET,
  DPDP_POLICY_VERSION: process.env.DPDP_POLICY_VERSION,
  DODO_PAYMENTS_API_KEY: process.env.DODO_PAYMENTS_API_KEY,
  DODO_PAYMENTS_WEBHOOK_KEY: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
  DODO_PAYMENTS_ENVIRONMENT: process.env.DODO_PAYMENTS_ENVIRONMENT,
  DODO_PRODUCT_PRO_MONTHLY_ID: process.env.DODO_PRODUCT_PRO_MONTHLY_ID,
  DODO_PRODUCT_PRO_YEARLY_ID: process.env.DODO_PRODUCT_PRO_YEARLY_ID,
  DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID: process.env.DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID,
  DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID: process.env.DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID,
  DODO_PRODUCT_TAILOR_CREDITS_50_ID: process.env.DODO_PRODUCT_TAILOR_CREDITS_50_ID,
  ADMIN_EMAILS: process.env.ADMIN_EMAILS,
});
