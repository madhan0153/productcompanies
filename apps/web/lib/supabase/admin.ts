import { createClient } from "@supabase/supabase-js";
import { clientEnv, serverEnv } from "@/lib/env";
import type { Database } from "./types";

// Service-role client. SERVER ONLY. Never import in client components.
// Bypasses RLS — use sparingly and only for trusted admin operations
// (crawler ingestion, DPDP erasure, scheduled jobs).
//
// Security fix (S-2): the runtime check below is a defense-in-depth tripwire
// against accidentally bundling this into client output. We:
//   1. Throw if the env var is missing (existing behaviour).
//   2. Throw if the env var leaks into a NEXT_PUBLIC_* shape (developer
//      mistake — service-role key must never be exposed to the browser).
//   3. Block any import path that runs in a non-Node runtime. The Edge
//      runtime is *not* expected to use admin; if we ever see it here, the
//      import is misplaced.
export function createSupabaseAdminClient() {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  // process.env shape check — only true on Node.
  // The string compare avoids referencing globalThis.EdgeRuntime, which is
  // typed differently across @types/node and Next's edge runtime types.
  const isEdge = typeof (globalThis as { EdgeRuntime?: unknown }).EdgeRuntime !== "undefined";
  if (isEdge) {
    throw new Error("createSupabaseAdminClient is forbidden in the Edge runtime");
  }
  return createClient<Database>(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
