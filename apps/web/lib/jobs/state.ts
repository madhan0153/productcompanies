import type { SupabaseClient } from "@supabase/supabase-js";

export type DurableJobType = "resume_parse" | "match_compute";
export type DurableJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "superseded";

export const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;

// A healthy user-triggered match_compute publishes baseline scores within a few
// seconds and finishes (Fit Cards) well inside the function budget. If a job
// has sat "running"/"queued" far longer, the serverless function that owned it
// almost certainly died mid-run (cold-kill, timeout). These thresholds let the
// UI and the retry path treat such a job as dead instead of showing "computing"
// forever — the bug behind the multi-minute stuck progress banner.
export const STALE_RUNNING_MS = 3 * 60_000;
export const STALE_QUEUED_MS = 2 * 60_000;

export function isComputeJobStale(
  job: { status: string; queued_at: string | null; started_at: string | null },
  now: number = Date.now(),
): boolean {
  const age = (iso: string | null): number | null => {
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? now - t : null;
  };
  if (job.status === "running") {
    const a = age(job.started_at) ?? age(job.queued_at);
    return a === null ? true : a > STALE_RUNNING_MS; // no timestamp → assume dead
  }
  if (job.status === "queued") {
    const a = age(job.queued_at);
    return a === null ? true : a > STALE_QUEUED_MS;
  }
  return false;
}

type AdminClient = SupabaseClient;

type SupabaseError = { message: string; code?: string | null } | null;

export interface DurableJob {
  id: string;
  user_id: string;
  job_type: DurableJobType;
  status: DurableJobStatus;
  resume_version_id: string | null;
  source: string | null;
  error_code: string | null;
  error_message: string | null;
  queued_at: string;
  started_at: string | null;
  finished_at: string | null;
  attempts?: number;
  payload?: Record<string, unknown>;
}

export async function claimDurableJob(
  admin: AdminClient,
  jobId: string,
): Promise<{ attempts: number } | null> {
  const { data: current, error: readError } = await admin
    .from("background_jobs")
    .select("attempts, queued_at")
    .eq("id", jobId)
    .eq("status", "queued")
    .maybeSingle() as {
      data: { attempts: number | null; queued_at: string | null } | null;
      error: SupabaseError;
    };
  assertNoSupabaseError(readError, "Could not read queued background job");
  if (!current) return null;
  if (current.queued_at && new Date(current.queued_at).getTime() > Date.now()) return null;

  const attempts = (current.attempts ?? 0) + 1;
  const { data, error } = await admin
    .from("background_jobs")
    .update({
      status: "running",
      attempts,
      started_at: new Date().toISOString(),
      finished_at: null,
      error_code: null,
      error_message: null,
    } as any)
    .eq("id", jobId)
    .eq("status", "queued")
    .select("id")
    .maybeSingle() as { data: { id: string } | null; error: SupabaseError };
  assertNoSupabaseError(error, "Could not claim background job");
  return data ? { attempts } : null;
}

export async function requeueDurableJob(
  admin: AdminClient,
  jobId: string,
  input: {
    errorCode: string;
    errorMessage: string;
    delayMs: number;
  },
): Promise<void> {
  const { error } = await admin
    .from("background_jobs")
    .update({
      status: "queued",
      queued_at: new Date(Date.now() + input.delayMs).toISOString(),
      started_at: null,
      finished_at: null,
      error_code: input.errorCode,
      error_message: input.errorMessage,
    } as any)
    .eq("id", jobId)
    .eq("status", "running");
  assertNoSupabaseError(error as SupabaseError, "Could not requeue background job");
}

export function assertNoSupabaseError(error: SupabaseError, message: string): void {
  if (error) throw new Error(`${message}: ${error.message}`);
}

export async function createDurableJob(
  admin: AdminClient,
  input: {
    id?: string;
    userId: string;
    type: DurableJobType;
    resumeVersionId?: string | null;
    source?: string;
    idempotencyKey?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<DurableJob> {
  const { data, error } = await admin
    .from("background_jobs")
    .insert({
      id: input.id,
      user_id: input.userId,
      job_type: input.type,
      status: "queued",
      resume_version_id: input.resumeVersionId ?? null,
      source: input.source ?? null,
      idempotency_key: input.idempotencyKey ?? null,
      payload: input.payload ?? {},
    } as any)
    .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at, attempts, payload")
    .maybeSingle() as { data: DurableJob | null; error: SupabaseError };

  assertNoSupabaseError(error, "Could not create background job");
  if (!data) throw new Error("Could not create background job: no row returned");
  return data;
}

export async function transitionDurableJob(
  admin: AdminClient,
  jobId: string,
  status: DurableJobStatus,
  input: {
    errorCode?: string | null;
    errorMessage?: string | null;
    incrementAttempts?: boolean;
  } = {},
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    error_code: input.errorCode ?? null,
    error_message: input.errorMessage ?? null,
  };
  if (status === "running") patch.started_at = new Date().toISOString();
  if (status === "succeeded" || status === "failed" || status === "cancelled" || status === "superseded") {
    patch.finished_at = new Date().toISOString();
  }

  let query = admin.from("background_jobs").update(patch as any).eq("id", jobId);
  if (input.incrementAttempts) {
    const { data, error } = await admin
      .from("background_jobs")
      .select("attempts")
      .eq("id", jobId)
      .maybeSingle() as { data: { attempts: number } | null; error: SupabaseError };
    assertNoSupabaseError(error, "Could not read background job attempts");
    query = admin
      .from("background_jobs")
      .update({ ...patch, attempts: (data?.attempts ?? 0) + 1 } as any)
      .eq("id", jobId);
  }

  const { error } = await query;
  assertNoSupabaseError(error as SupabaseError, `Could not mark job ${status}`);
}

export async function failDurableJob(
  admin: AdminClient,
  jobId: string,
  errorCode: string,
  errorMessage: string,
): Promise<void> {
  await transitionDurableJob(admin, jobId, "failed", {
    errorCode,
    errorMessage,
  });
}

export async function supersedeActiveJobs(
  admin: AdminClient,
  input: {
    userId: string;
    type: DurableJobType;
    exceptJobId?: string;
    errorMessage?: string;
  },
): Promise<void> {
  let query = admin
    .from("background_jobs")
    .update({
      status: "superseded",
      error_code: "superseded",
      error_message: input.errorMessage ?? "A newer job superseded this one.",
      finished_at: new Date().toISOString(),
    } as any)
    .eq("user_id", input.userId)
    .eq("job_type", input.type)
    .in("status", [...ACTIVE_JOB_STATUSES]);

  if (input.exceptJobId) query = query.neq("id", input.exceptJobId);
  const { error } = await query;
  assertNoSupabaseError(error as SupabaseError, "Could not supersede active jobs");
}

export async function findActiveJob(
  admin: AdminClient,
  input: {
    userId: string;
    type: DurableJobType;
    resumeVersionId?: string | null;
  },
): Promise<DurableJob | null> {
  let query = admin
    .from("background_jobs")
    .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at, attempts, payload")
    .eq("user_id", input.userId)
    .eq("job_type", input.type)
    .in("status", [...ACTIVE_JOB_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.resumeVersionId !== undefined) {
    query = input.resumeVersionId === null
      ? query.is("resume_version_id", null)
      : query.eq("resume_version_id", input.resumeVersionId);
  }

  const { data, error } = await query.maybeSingle() as { data: DurableJob | null; error: SupabaseError };
  assertNoSupabaseError(error, "Could not read active background job");
  return data;
}

export async function findLatestJob(
  admin: AdminClient,
  input: {
    userId: string;
    type: DurableJobType;
    resumeVersionId?: string | null;
  },
): Promise<DurableJob | null> {
  let query = admin
    .from("background_jobs")
    .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at")
    .eq("user_id", input.userId)
    .eq("job_type", input.type)
    .order("created_at", { ascending: false })
    .limit(1);

  if (input.resumeVersionId !== undefined) {
    query = input.resumeVersionId === null
      ? query.is("resume_version_id", null)
      : query.eq("resume_version_id", input.resumeVersionId);
  }

  const { data, error } = await query.maybeSingle() as { data: DurableJob | null; error: SupabaseError };
  assertNoSupabaseError(error, "Could not read latest background job");
  return data;
}

export async function countRecentJobs(
  admin: AdminClient,
  input: {
    userId: string;
    type: DurableJobType;
    sinceIso: string;
  },
): Promise<number> {
  const { count, error } = await admin
    .from("background_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("job_type", input.type)
    .gte("created_at", input.sinceIso);

  assertNoSupabaseError(error as SupabaseError, "Could not read recent background job count");
  return count ?? 0;
}

/**
 * Transition any stale (dead-but-active) match_compute jobs for a user to
 * "failed" so the UI stops reporting "computing" and a retry can start a fresh
 * job. Best-effort: never throws — a failure here must not block the caller.
 * Returns the number of jobs reaped.
 */
export async function reapStaleComputeJobs(
  admin: AdminClient,
  userId: string,
): Promise<number> {
  try {
    const { data } = await admin
      .from("background_jobs")
      .select("id, status, queued_at, started_at")
      .eq("user_id", userId)
      .eq("job_type", "match_compute")
      .in("status", [...ACTIVE_JOB_STATUSES]) as {
        data: Array<{ id: string; status: string; queued_at: string | null; started_at: string | null }> | null;
      };
    const stale = (data ?? []).filter((j) => isComputeJobStale(j));
    for (const job of stale) {
      await transitionDurableJob(admin, job.id, "failed", {
        errorCode: "timeout",
        errorMessage: "Match computation timed out before it finished. Please retry.",
      });
    }
    return stale.length;
  } catch {
    return 0;
  }
}
