import type { SupabaseClient } from "@supabase/supabase-js";

export type DurableJobType = "resume_parse" | "match_compute";
export type DurableJobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "superseded";

export const ACTIVE_JOB_STATUSES = ["queued", "running"] as const;

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
    .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at")
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
    .select("id, user_id, job_type, status, resume_version_id, source, error_code, error_message, queued_at, started_at, finished_at")
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
