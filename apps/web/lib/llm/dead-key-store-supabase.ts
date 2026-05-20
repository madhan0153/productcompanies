// Supabase-backed implementation of the shared DeadKeyStore interface.
//
// Persists (provider × model × key × capability) dead-state to
// `public.llm_dead_keys`. Reads + writes go through the service-role
// admin client because this table is service-role-only (no RLS policies
// for `authenticated`). The dead-state contains no user data — only
// provider id, model name, key index, capability, failure kind, and a
// scrubbed reason string.
//
// The router calls `loadAll()` once per Vercel cold start; subsequent
// `markDead()` calls write-through asynchronously without blocking the
// hot path.

import type { DeadKeyMetadata, DeadKeyStore } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface DeadKeyRow {
  combo_key: string;
  provider_id: string;
  model: string;
  key_index: number;
  capability: string;
  failure_kind: string;
  dead_until: string;
  reason: string | null;
}

/** Build a DeadKeyStore wired to the Supabase admin client. */
export function createSupabaseDeadKeyStore(): DeadKeyStore {
  return {
    async loadAll(): Promise<Map<string, number>> {
      const admin = createSupabaseAdminClient();
      const nowIso = new Date().toISOString();
      // Cast through unknown because the generated Supabase types may not
      // yet know about the new llm_dead_keys table (operator may not have
      // regenerated types yet). The shape is well-defined and small.
      const { data, error } = await (admin
        .from("llm_dead_keys")
        .select("combo_key, dead_until")
        .gt("dead_until", nowIso) as unknown as Promise<{
          data: Array<{ combo_key: string; dead_until: string }> | null;
          error: { code?: string; message: string } | null;
        }>);
      if (error || !data) return new Map();
      const map = new Map<string, number>();
      for (const row of data) {
        const t = Date.parse(row.dead_until);
        if (Number.isFinite(t)) map.set(row.combo_key, t);
      }
      return map;
    },

    async markDead(comboKey: string, deadUntilMs: number, metadata: DeadKeyMetadata): Promise<void> {
      const admin = createSupabaseAdminClient();
      const row: Omit<DeadKeyRow, "reason"> & { reason: string | null } = {
        combo_key: comboKey,
        provider_id: metadata.providerId,
        model: metadata.model,
        key_index: metadata.keyIndex,
        capability: metadata.capability,
        failure_kind: metadata.failureKind,
        dead_until: new Date(deadUntilMs).toISOString(),
        reason: metadata.reason ?? null,
      };
      await (admin
        .from("llm_dead_keys")
        // Cast through unknown: generated Supabase types don't yet know
        // about llm_dead_keys until they're regenerated.
        .upsert(row as unknown as never, { onConflict: "combo_key" }) as unknown as Promise<{
          error: { code?: string; message: string } | null;
        }>);
    },

    async clearExpired(): Promise<void> {
      const admin = createSupabaseAdminClient();
      const nowIso = new Date().toISOString();
      await (admin
        .from("llm_dead_keys")
        .delete()
        .lt("dead_until", nowIso) as unknown as Promise<{
          error: { code?: string; message: string } | null;
        }>);
    },
  };
}
