import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export type RecomputeCandidate = {
  id: string;
  active_resume_version_id: string;
  last_match_compute_at: string | null;
};

type CandidateRpcRow = RecomputeCandidate & {
  total_count: number | string | null;
};

export type RecomputeProfileScanRow = {
  id: string;
  resume_storage_path: string | null;
  resume_embedding_at: string | null;
  resume_parsed_version_id: string | null;
  resume_embedding_version_id: string | null;
  active_resume_version_id: string | null;
  pending_resume_version_id: string | null;
  resume_parse_error: string | null;
  last_match_compute_at: string | null;
};

export type CandidateFetchResult = {
  candidates: RecomputeCandidate[];
  totalEligible: number;
  source: "rpc" | "scan";
};

const PROFILE_SCAN_PAGE_SIZE = 1000;

export function isEligibleRecomputeProfile(
  profile: RecomputeProfileScanRow,
  consentedIds: ReadonlySet<string>,
  targetUserId: string | null,
): profile is RecomputeProfileScanRow & { active_resume_version_id: string } {
  if (targetUserId && profile.id !== targetUserId) return false;
  if (!consentedIds.has(profile.id)) return false;
  if (!profile.resume_storage_path) return false;
  if (!profile.resume_embedding_at) return false;
  if (profile.pending_resume_version_id !== null) return false;
  if (profile.resume_parse_error !== null) return false;
  if (!profile.active_resume_version_id) return false;
  if (profile.resume_parsed_version_id !== profile.active_resume_version_id) return false;
  if (profile.resume_embedding_version_id !== profile.active_resume_version_id) return false;
  return true;
}

export function selectEligibleRecomputeCandidates(
  profiles: RecomputeProfileScanRow[],
  consentedIds: ReadonlySet<string>,
  batchSize: number,
  targetUserId: string | null,
): CandidateFetchResult {
  const eligible = profiles
    .filter((profile) => isEligibleRecomputeProfile(profile, consentedIds, targetUserId))
    .sort(compareStaleFirst)
    .map((profile) => ({
      id: profile.id,
      active_resume_version_id: profile.active_resume_version_id,
      last_match_compute_at: profile.last_match_compute_at,
    }));

  return {
    candidates: eligible.slice(0, batchSize),
    totalEligible: eligible.length,
    source: "scan",
  };
}

export function remainingAfterProcessed(totalEligible: number, processed: number): number {
  return Math.max(0, totalEligible - processed);
}

export async function fetchRecomputeCandidates(
  admin: AdminClient,
  input: {
    batchSize: number;
    targetUserId: string | null;
  },
): Promise<CandidateFetchResult> {
  const rpcResult = await fetchViaRpc(admin, input).catch((error: unknown) => {
    if (isMissingCandidateRpc(error)) return null;
    throw error;
  });
  if (rpcResult) return rpcResult;

  return fetchViaProfileScan(admin, input);
}

async function fetchViaRpc(
  admin: AdminClient,
  input: {
    batchSize: number;
    targetUserId: string | null;
  },
): Promise<CandidateFetchResult> {
  const { data, error } = await ((admin.rpc as any)("match_recompute_candidates", {
    batch_limit: input.batchSize,
    target_user_id: input.targetUserId,
  }) as PromiseLike<{ data: CandidateRpcRow[] | null; error: { message?: string; code?: string } | null }>);

  if (error) throw error;
  const rows = data ?? [];
  const totalEligible = rows[0]?.total_count === undefined || rows[0]?.total_count === null
    ? 0
    : Number(rows[0].total_count);

  return {
    candidates: rows.map((row) => ({
      id: row.id,
      active_resume_version_id: row.active_resume_version_id,
      last_match_compute_at: row.last_match_compute_at,
    })),
    totalEligible: Number.isFinite(totalEligible) ? totalEligible : rows.length,
    source: "rpc",
  };
}

async function fetchViaProfileScan(
  admin: AdminClient,
  input: {
    batchSize: number;
    targetUserId: string | null;
  },
): Promise<CandidateFetchResult> {
  const { data: consented } = await admin
    .from("consents")
    .select("user_id")
    .eq("purpose", "matching")
    .eq("granted", true) as unknown as { data: Array<{ user_id: string }> | null };
  const consentedIds = new Set((consented ?? []).map((row) => row.user_id));
  if (consentedIds.size === 0) {
    return { candidates: [], totalEligible: 0, source: "scan" };
  }

  const profiles: RecomputeProfileScanRow[] = [];
  for (let from = 0; ; from += PROFILE_SCAN_PAGE_SIZE) {
    let query = (admin
      .from("profiles")
      .select("id, resume_storage_path, resume_embedding_at, resume_parsed_version_id, resume_embedding_version_id, active_resume_version_id, pending_resume_version_id, resume_parse_error, last_match_compute_at")
      .not("resume_storage_path", "is", null)
      .not("resume_embedding_at", "is", null)
      .not("active_resume_version_id", "is", null)
      .is("pending_resume_version_id", null)
      .is("resume_parse_error", null)
      .order("last_match_compute_at", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true })
      .range(from, from + PROFILE_SCAN_PAGE_SIZE - 1) as any);

    if (input.targetUserId) query = query.eq("id", input.targetUserId);
    const { data, error } = await query as {
      data: RecomputeProfileScanRow[] | null;
      error: { message?: string } | null;
    };
    if (error) throw new Error(`Could not scan recompute candidates: ${error.message ?? "database error"}`);

    const batch = data ?? [];
    profiles.push(...batch);
    if (input.targetUserId || batch.length < PROFILE_SCAN_PAGE_SIZE) break;
  }

  return selectEligibleRecomputeCandidates(
    profiles,
    consentedIds,
    input.batchSize,
    input.targetUserId,
  );
}

function compareStaleFirst(a: RecomputeProfileScanRow, b: RecomputeProfileScanRow): number {
  const aTime = a.last_match_compute_at ? new Date(a.last_match_compute_at).getTime() : Number.NEGATIVE_INFINITY;
  const bTime = b.last_match_compute_at ? new Date(b.last_match_compute_at).getTime() : Number.NEGATIVE_INFINITY;
  if (aTime !== bTime) return aTime - bTime;
  return a.id.localeCompare(b.id);
}

function isMissingCandidateRpc(error: unknown): boolean {
  const err = error as { message?: string; code?: string } | null;
  const message = err?.message ?? "";
  const code = err?.code ?? "";
  return code === "PGRST202" ||
    /match_recompute_candidates/i.test(message) && /does not exist|not found|could not find|schema cache/i.test(message);
}
