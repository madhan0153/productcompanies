import { createClient } from "@supabase/supabase-js";
import { getCronAuthFailure } from "../lib/security/cron";

const APPROVED_SLUGS = [
  "google",
  "microsoft",
  "meta",
  "amazon",
  "apple",
  "atlassian",
  "nvidia",
  "oracle",
  "salesforce",
  "sap-labs",
  "razorpay",
  "phonepe",
  "zerodha",
  "cred",
  "groww",
  "swiggy",
  "zomato",
  "flipkart",
  "adobe",
  "intuit",
  "uber",
  "paypal",
  "servicenow",
  "stripe",
  "freshworks",
  "zoho",
  "postman",
  "browserstack",
  "chargebee",
  "meesho",
  "nykaa",
  "dream11",
  "policybazaar",
  "lenskart",
  "udaan",
  "delhivery",
  "sharechat",
  "ola",
  "paytm",
  "inmobi",
  "unacademy",
  "cars24",
  "myntra",
  "practo",
  "pine-labs",
  "nobroker",
  "wingify",
  "clevertap",
  "moengage",
  "yellow-ai",
  "arcesium",
].sort();

type Check = {
  name: string;
  ok: boolean;
  detail?: string;
};

const checks: Check[] = [];

function pass(name: string, detail?: string) {
  checks.push({ name, ok: true, detail });
}

function fail(name: string, detail?: string) {
  checks.push({ name, ok: false, detail });
}

function env(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function hasPlaceholder(value: string): boolean {
  return /<|>|your-|placeholder|change-me|dev-secret/i.test(value);
}

function checkRequiredEnv(name: string, options: { secret?: boolean; minLength?: number; url?: boolean } = {}) {
  const value = env(name);
  if (!value) {
    fail(`env:${name}`, "missing");
    return;
  }
  if (hasPlaceholder(value)) {
    fail(`env:${name}`, "placeholder value");
    return;
  }
  if (options.minLength && value.length < options.minLength) {
    fail(`env:${name}`, `too short (${value.length} chars)`);
    return;
  }
  if (options.url) {
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") {
        fail(`env:${name}`, "must use https outside localhost");
        return;
      }
    } catch {
      fail(`env:${name}`, "invalid URL");
      return;
    }
  }
  pass(`env:${name}`, options.secret ? "set" : value);
}

async function checkSupabase() {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return;

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: companies, error } = await admin
    .from("companies")
    .select("slug")
    .order("slug");
  if (error) {
    fail("supabase:companies", error.name);
  } else {
    const slugs = (companies ?? []).map((c) => c.slug).sort();
    const ok = JSON.stringify(slugs) === JSON.stringify(APPROVED_SLUGS);
    (ok ? pass : fail)(
      "supabase:approved-companies",
      ok ? "51 approved companies present" : `found ${slugs.length} companies`,
    );
  }

  for (const bucketId of ["resumes", "tailored-resumes", "enhanced-resumes"]) {
    const { data, error: bucketError } = await admin.storage.getBucket(bucketId);
    if (bucketError || !data) {
      fail(`storage:${bucketId}`, bucketError?.name ?? "missing bucket");
      continue;
    }
    if (data.public) {
      fail(`storage:${bucketId}`, "bucket is public");
    } else {
      pass(`storage:${bucketId}`, "private");
    }
  }
}

async function checkDeployedEndpoints() {
  if (!process.argv.includes("--check-deployed")) return;

  const appUrl = env("NEXT_PUBLIC_APP_URL");
  if (!appUrl) {
    fail("deploy:endpoints", "NEXT_PUBLIC_APP_URL missing");
    return;
  }

  const health = await fetch(new URL("/api/health", appUrl));
  if (health.ok) pass("deploy:/api/health", String(health.status));
  else fail("deploy:/api/health", String(health.status));

  const cronUrl = new URL("/api/cron/recompute-matches", appUrl);
  const noAuth = await fetch(cronUrl, { method: "POST" });
  if (noAuth.status === 401 || noAuth.status === 503) {
    pass("deploy:cron-no-auth", String(noAuth.status));
  } else {
    fail("deploy:cron-no-auth", `expected 401/503, got ${noAuth.status}`);
  }

  const badAuth = await fetch(cronUrl, {
    method: "POST",
    headers: { authorization: "Bearer definitely-wrong" },
  });
  if (badAuth.status === 401 || badAuth.status === 503) {
    pass("deploy:cron-bad-auth", String(badAuth.status));
  } else {
    fail("deploy:cron-bad-auth", `expected 401/503, got ${badAuth.status}`);
  }
}

checkRequiredEnv("NEXT_PUBLIC_SUPABASE_URL", { url: true });
checkRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", { secret: true, minLength: 20 });
checkRequiredEnv("NEXT_PUBLIC_APP_URL", { url: true });
checkRequiredEnv("SUPABASE_SERVICE_ROLE_KEY", { secret: true, minLength: 20 });
checkRequiredEnv("GEMINI_API_KEY", { secret: true, minLength: 20 });
checkRequiredEnv("CRON_SECRET", { secret: true, minLength: 32 });

for (const publicSecretName of [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_CRON_SECRET",
  "NEXT_PUBLIC_GEMINI_API_KEY",
  "NEXT_PUBLIC_RESEND_API_KEY",
]) {
  if (env(publicSecretName)) fail(`env:${publicSecretName}`, "secret must not be public");
  else pass(`env:${publicSecretName}`, "not set");
}

const anon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const service = env("SUPABASE_SERVICE_ROLE_KEY");
if (anon && service && anon === service) {
  fail("env:supabase-key-separation", "anon key equals service role key");
} else {
  pass("env:supabase-key-separation");
}

const cronSecret = env("CRON_SECRET");
if (getCronAuthFailure(null, cronSecret)?.status === 401) pass("cron:missing-auth-fails-closed");
else fail("cron:missing-auth-fails-closed");
if (getCronAuthFailure("Bearer wrong", cronSecret)?.status === 401) pass("cron:bad-auth-fails-closed");
else fail("cron:bad-auth-fails-closed");
if (cronSecret && getCronAuthFailure(`Bearer ${cronSecret}`, cronSecret) === null) pass("cron:valid-auth");
else fail("cron:valid-auth");

async function main() {
  await checkSupabase();
  await checkDeployedEndpoints();

  for (const check of checks) {
    const icon = check.ok ? "PASS" : "FAIL";
    console.log(`${icon} ${check.name}${check.detail ? ` - ${check.detail}` : ""}`);
  }

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    console.error(`deployment readiness failed: ${failed.length} check(s) failed`);
    process.exit(1);
  }

  console.log("deployment readiness passed");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : "deployment readiness crashed");
  process.exit(1);
});
