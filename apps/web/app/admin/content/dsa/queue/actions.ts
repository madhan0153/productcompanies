"use server";

// DSA v2 — review queue server actions.
//
// Every state transition (approve / reject / defer / reopen / edit notes)
// goes through here, double-gated by requireAdmin() and an append-only
// dsa_question_review_events row for audit. Service-role client is used
// for writes since the table policy allows only service_role direct access.
//
// Casts to `never` are required while dsa_questions and
// dsa_question_review_events are not in the generated Supabase types
// (added after running the v2 migration block from schema.sql).

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

async function audit(
  reviewerId: string,
  questionId: string,
  action: "approve" | "reject" | "defer" | "edit" | "reopen",
  reason: string | null,
  diff: Record<string, unknown> | null,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  await admin.from("dsa_question_review_events").insert({
    question_id: questionId,
    reviewer_id: reviewerId,
    action,
    reason,
    diff,
  } as never);
}

export async function approveQuestion(questionId: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("dsa_questions")
    .update({
      status: "live",
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  await audit(gate.userId, questionId, "approve", null, { status: "live" });
  revalidatePath("/admin/content/dsa/queue");
  revalidatePath(`/admin/content/dsa/queue/${questionId}`);
  return { ok: true };
}

export async function approveAllPending(): Promise<
  { ok: true; approved: number } | { ok: false; error: string }
> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };

  const admin = createSupabaseAdminClient();

  // Grab the ids first so we can write one audit row per approved question.
  const { data, error: readError } = (await admin
    .from("dsa_questions")
    .select("id")
    .eq("status", "pending_review")) as unknown as {
      data: Array<{ id: string }> | null;
      error: { message: string } | null;
    };
  if (readError) return { ok: false, error: readError.message };

  const ids = (data ?? []).map((r) => r.id);
  if (ids.length === 0) return { ok: true, approved: 0 };

  const now = new Date().toISOString();
  const { error: writeError } = await admin
    .from("dsa_questions")
    .update({
      status: "live",
      reviewed_by: gate.userId,
      reviewed_at: now,
      rejection_reason: null,
      updated_at: now,
    } as never)
    .eq("status", "pending_review");
  if (writeError) return { ok: false, error: writeError.message };

  // Append-only audit: one row per question, mirroring single approvals.
  await admin.from("dsa_question_review_events").insert(
    ids.map((id) => ({
      question_id: id,
      reviewer_id: gate.userId,
      action: "approve" as const,
      reason: "bulk approve",
      diff: { status: "live" },
    })) as never,
  );

  revalidatePath("/admin/content/dsa/queue");
  return { ok: true, approved: ids.length };
}

export async function rejectQuestion(questionId: string, reason: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };
  const trimmed = reason.trim();
  if (trimmed.length < 5) return { ok: false, error: "Rejection reason required (min 5 chars)" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("dsa_questions")
    .update({
      status: "rejected",
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: trimmed,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  await audit(gate.userId, questionId, "reject", trimmed, { status: "rejected" });
  revalidatePath("/admin/content/dsa/queue");
  revalidatePath(`/admin/content/dsa/queue/${questionId}`);
  return { ok: true };
}

export async function deferQuestion(questionId: string, reason: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };
  const trimmed = reason.trim();
  if (trimmed.length < 5) return { ok: false, error: "Defer reason required (min 5 chars)" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("dsa_questions")
    .update({
      status: "deferred",
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
      internal_notes: trimmed,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  await audit(gate.userId, questionId, "defer", trimmed, { status: "deferred" });
  revalidatePath("/admin/content/dsa/queue");
  revalidatePath(`/admin/content/dsa/queue/${questionId}`);
  return { ok: true };
}

export async function reopenQuestion(questionId: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("dsa_questions")
    .update({
      status: "pending_review",
      reviewed_at: null,
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    } as never)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  await audit(gate.userId, questionId, "reopen", null, { status: "pending_review" });
  revalidatePath("/admin/content/dsa/queue");
  revalidatePath(`/admin/content/dsa/queue/${questionId}`);
  return { ok: true };
}

export async function saveInternalNotes(questionId: string, notes: string): Promise<Result> {
  const gate = await requireAdmin();
  if (!gate.isAdmin || !gate.userId) return { ok: false, error: "Not authorised" };

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("dsa_questions")
    .update({ internal_notes: notes, updated_at: new Date().toISOString() } as never)
    .eq("id", questionId);
  if (error) return { ok: false, error: error.message };

  await audit(gate.userId, questionId, "edit", "notes updated", { internal_notes_len: notes.length });
  revalidatePath(`/admin/content/dsa/queue/${questionId}`);
  return { ok: true };
}
