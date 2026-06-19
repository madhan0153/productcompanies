import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ResolvedUser {
  id: string;
  email: string;
}

export interface UserLookupResult {
  user: ResolvedUser | null;
  error: string | null;
}

export async function resolveUserResult(emailOrId: string): Promise<UserLookupResult> {
  const input = emailOrId.trim();
  if (!input) return { user: null, error: null };

  const admin = createSupabaseAdminClient();
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

  if (looksLikeUuid) {
    const { data, error } = await admin.auth.admin.getUserById(input);
    if (error) {
      if (error.status === 404) return { user: null, error: null };
      return { user: null, error: error.message };
    }
    if (!data?.user) return { user: null, error: null };
    return { user: { id: data.user.id, email: data.user.email ?? "" }, error: null };
  }

  const lower = input.toLowerCase();
  let page = 1;
  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return { user: null, error: error.message };
    const found = data.users.find((user) => (user.email ?? "").toLowerCase() === lower);
    if (found) {
      return { user: { id: found.id, email: found.email ?? "" }, error: null };
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  return { user: null, error: null };
}

/**
 * Resolve a UUID or email to a Supabase auth user.
 * Legacy convenience wrapper for admin actions that only need found/not-found.
 */
export async function resolveUser(emailOrId: string): Promise<ResolvedUser | null> {
  return (await resolveUserResult(emailOrId)).user;
}
