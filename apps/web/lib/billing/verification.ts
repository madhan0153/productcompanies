import { serverEnv } from "@/lib/env";

function emailAllowlist(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isPaymentVerificationEnabledForEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (serverEnv.ENABLE_PAYMENT_TEST_PLAN !== "true") return false;
  if (serverEnv.DODO_PAYMENTS_ENVIRONMENT !== "live_mode") return false;

  const allowed = emailAllowlist(
    [serverEnv.ADMIN_EMAILS, serverEnv.PAYMENT_TEST_ALLOWED_EMAILS].filter(Boolean).join(","),
  );
  return allowed.has(email.toLowerCase());
}
