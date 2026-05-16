// Sprint 2 — Item 8.
//
// Resume snapshot & revert. Whenever the profile's parsed resume is about
// to be overwritten (re-upload or manual revert), the existing parsed JSON
// + storage path + DNA score are written to public.resume_versions. Users
// can list their snapshots on the profile page and revert to a prior one
// without re-uploading the original PDF.
//
// Retention policy: keep the most recent 5 snapshots per user. Older rows
// are deleted in a fire-and-forget tail call from snapshotCurrentProfile.

import type { SupabaseClient } from "@supabase/supabase-js";

const RETENTION_LIMIT = 5;

export type SnapshotSource = "overwrite" | "manual_revert";

interface SnapshotInput {
  userId: string;
  resume_parsed: unknown;
  resume_storage_path: string | null;
  product_dna_score: number | null;
  dna_breakdown: unknown | null;
  resume_signature: string | null;
  source?: SnapshotSource;
}

/**
 * Snapshot the user's current resume state into resume_versions. Caller
 * must use a service-role / admin client — the table has no insert RLS for
 * the authenticated role.
 *
 * Returns the inserted row id. Never throws — snapshot failure must not
 * block the re-upload it precedes.
 */
export async function snapshotCurrentResume(
  admin: SupabaseClient,
  input: SnapshotInput,
): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (admin.from("resume_versions") as any).insert({
      user_id:             input.userId,
      resume_parsed:       input.resume_parsed,
      resume_storage_path: input.resume_storage_path,
      product_dna_score:   input.product_dna_score,
      dna_breakdown:       input.dna_breakdown,
      resume_signature:    input.resume_signature,
      source:              input.source ?? "overwrite",
    }).select("id").maybeSingle() as { data: { id: string } | null; error: { message: string } | null };
    if (error) {
      console.warn("[resume-snapshot] insert failed:", error.message);
      return null;
    }

    // Retention: keep the latest RETENTION_LIMIT snapshots, drop the rest.
    // Fire-and-forget — failure here is purely cosmetic.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: keep } = await (admin
      .from("resume_versions")
      .select("id, created_at")
      .eq("user_id", input.userId)
      .order("created_at", { ascending: false })
      .limit(RETENTION_LIMIT) as any) as { data: Array<{ id: string }> | null };

    const keepIds = new Set((keep ?? []).map((r) => r.id));
    if (keepIds.size >= RETENTION_LIMIT) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("resume_versions") as any)
        .delete()
        .eq("user_id", input.userId)
        .not("id", "in", `(${[...keepIds].map((id) => `"${id}"`).join(",")})`);
    }

    return data?.id ?? null;
  } catch (err) {
    console.warn("[resume-snapshot] unexpected error:", err);
    return null;
  }
}
