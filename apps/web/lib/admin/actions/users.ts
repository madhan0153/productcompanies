"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "../auth";
import { recordAdminAction } from "../audit";

export interface UserActionState {
  ok:      boolean;
  message: string;
}

export async function suspendUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const userId = String(formData.get("userId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  if (!userId) return { ok: false, message: "Missing user id." };
  if (!reason) return { ok: false, message: "Please provide a reason for the audit log." };

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ suspended_at: new Date().toISOString(), suspension_reason: reason })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  // Also block sign-in at the auth layer (100 years = effectively permanent)
  await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "876600h" });

  await recordAdminAction({
    actionType:   "suspend_user",
    targetUserId: userId,
    metadata:     { reason },
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/users");
  return { ok: true, message: "User suspended. Sign-in blocked." };
}

export async function unsuspendUser(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) throw new Error("Unauthorized");

  const supabaseAdmin = createSupabaseAdminClient();
  await supabaseAdmin
    .from("profiles")
    .update({ suspended_at: null, suspension_reason: null })
    .eq("id", userId);

  // Lift auth-level ban (ban_duration: "none" clears it)
  await supabaseAdmin.auth.admin.updateUserById(userId, { ban_duration: "none" });

  await recordAdminAction({
    actionType:   "unsuspend_user",
    targetUserId: userId,
  });

  revalidatePath(`/admin/users/${userId}`);
}

export async function deleteUser(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const userId  = String(formData.get("userId") ?? "").trim();
  const confirm = String(formData.get("confirm") ?? "").trim();
  if (!userId)   return { ok: false, message: "Missing user id." };
  if (confirm !== "DELETE") return { ok: false, message: "Type DELETE to confirm." };

  const supabaseAdmin = createSupabaseAdminClient();

  // First trigger DPDP-compliant erasure of all owned rows
  const { error: rpcError } = await supabaseAdmin.rpc("request_user_erasure", { uid: userId });
  if (rpcError) {
    await recordAdminAction({
      actionType: "delete_user", targetUserId: userId, status: "failed",
      metadata: { error: rpcError.message },
    });
    return { ok: false, message: `Erasure failed: ${rpcError.message}` };
  }

  // Then delete the auth user
  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authErr) {
    return { ok: false, message: `Profile cleared but auth user deletion failed: ${authErr.message}` };
  }

  await recordAdminAction({
    actionType:   "delete_user",
    targetUserId: userId,
  });

  revalidatePath("/admin/users");
  return { ok: true, message: "User deleted. All owned data erased." };
}

export async function clearResumeParseError(userId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) throw new Error("Unauthorized");

  const supabaseAdmin = createSupabaseAdminClient();
  await supabaseAdmin
    .from("profiles")
    .update({ resume_parse_error: null })
    .eq("id", userId);

  // Queue a background reparse job
  await supabaseAdmin.from("background_jobs").insert({
    user_id:  userId,
    job_type: "resume_parse",
    status:   "queued",
    payload:  { source: "admin_retrigger" },
  });

  await recordAdminAction({
    actionType:   "reparse_resume",
    targetUserId: userId,
  });

  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/resumes");
}
