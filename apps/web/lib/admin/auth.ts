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

function parseAllowlist(): string[] {
  const raw = serverEnv.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function requireAdmin(): Promise<AdminCheck> {
  const allow = parseAllowlist();
  if (allow.length === 0) {
    return { isAdmin: false, email: null, userId: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { isAdmin: false, email: null, userId: null };

  const email = (user.email ?? "").toLowerCase();
  return {
    isAdmin: allow.includes(email),
    email:   email || null,
    userId:  user.id,
  };
}
