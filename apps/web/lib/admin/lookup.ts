import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export interface ResolvedUser {
  id:    string;
  email: string;
}

/**
 * Resolve a UUID or email to a Supabase auth user.
 * Returns null if not found. Uses service role.
 */
export async function resolveUser(emailOrId: string): Promise<ResolvedUser | null> {
  const input = emailOrId.trim();
  if (!input) return null;

  const admin = createSupabaseAdminClient();
  const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input);

  if (looksLikeUuid) {
    const { data, error } = await admin.auth.admin.getUserById(input);
    if (error || !data?.user) return null;
    return { id: data.user.id, email: data.user.email ?? "" };
  }

  // Search by email — supabase getUserByEmail is on admin
  // Falling back to listUsers with email filter
  const lower = input.toLowerCase();
  // Paginate to find by email — first page usually enough at our scale.
  // For very large tenant counts use a dedicated email index.
  let page = 1;
  while (page <= 5) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return null;
    const found = data.users.find((u) => (u.email ?? "").toLowerCase() === lower);
    if (found) return { id: found.id, email: found.email ?? "" };
    if (data.users.length < 1000) break;
    page += 1;
  }
  return null;
}
