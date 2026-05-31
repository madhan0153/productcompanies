// Sprint 3 — Item 12. Admin gate.
//
// Session-based authorization for /admin/* pages. A user is admin iff:
//   1. They're signed in (Supabase session valid).
//   2. Their email matches one in the comma-separated ADMIN_EMAILS env.
//
// When `ADMIN_EMAILS` is unset the gate denies everyone — admin pages
// return 404 to avoid leaking their existence to unauthenticated traffic.

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export interface AdminCheck {
  isAdmin: boolean;
  email: string | null;
  userId: string | null;
}

// Memoized at module load — ADMIN_EMAILS only changes on redeploy, so
// re-parsing on every request is pure waste.
const ADMIN_ALLOWLIST: readonly string[] = Object.freeze(parseAdminAllowlist(serverEnv.ADMIN_EMAILS));

/**
 * Pure parser for the ADMIN_EMAILS env var. Exposed so it can be unit-tested
 * without standing up the whole env schema; consumers should use
 * `isAdminEmail()` which already references the memoized allowlist.
 */
export function parseAdminAllowlist(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Synchronous allowlist check for an already-known email. Used by the app
 * shell to decide whether to render the Admin nav link without a second
 * round-trip to Supabase (the session is already resolved in the layout).
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (ADMIN_ALLOWLIST.length === 0) return false;
  return ADMIN_ALLOWLIST.includes(email.toLowerCase());
}

export async function requireAdmin(): Promise<AdminCheck> {
  if (ADMIN_ALLOWLIST.length === 0) {
    return { isAdmin: false, email: null, userId: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, email: null, userId: null };

  const email = (user.email ?? "").toLowerCase();
  return {
    isAdmin: ADMIN_ALLOWLIST.includes(email),
    email:   email || null,
    userId:  user.id,
  };
}
