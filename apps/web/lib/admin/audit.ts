import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "./auth";

export type AdminActionType =
  | "grant_entitlement"
  | "revoke_entitlement"
  | "grant_credits"
  | "create_promo_code"
  | "deactivate_promo_code"
  | "suspend_user"
  | "unsuspend_user"
  | "delete_user"
  | "reparse_resume"
  | "deactivate_job"
  | "reactivate_job"
  | "refund_invoice"
  | "trigger_cron"
  | "reset_dead_key"
  | "clear_failed_jobs";

export interface AuditOptions {
  actionType:    AdminActionType;
  targetUserId?: string | null;
  targetRef?:    string | null;
  status?:       "success" | "failed";
  metadata?:     Record<string, unknown>;
}

/**
 * Record an admin action in the audit log.
 * Failures here are non-blocking: the underlying admin action still completes.
 * Caller MUST have already verified the user is admin (typically via requireAdmin()).
 */
export async function recordAdminAction(opts: AuditOptions): Promise<void> {
  try {
    const admin = await requireAdmin();
    if (!admin.isAdmin || !admin.email) return;

    const supabaseAdmin = createSupabaseAdminClient();
    await supabaseAdmin.from("admin_actions").insert({
      actor_id:       admin.userId,
      actor_email:    admin.email,
      action_type:    opts.actionType,
      target_user_id: opts.targetUserId ?? null,
      target_ref:     opts.targetRef ?? null,
      status:         opts.status ?? "success",
      metadata:       (opts.metadata ?? {}) as never,
    });
  } catch (err) {
    // Never let audit-logging failure bubble up — log only
    console.error("[admin/audit] failed to record action", err);
  }
}
