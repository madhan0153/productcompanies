"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { refreshEntitlements } from "@/lib/billing/entitlements";
import { grantCredits } from "@/lib/billing/credits";
import type { CreditKind, EntitlementGrantType } from "@/lib/supabase/types";
import { requireAdmin } from "../auth";
import { resolveUser } from "../lookup";
import { recordAdminAction } from "../audit";

export type GrantPlan = "pro" | "career_sprint";
export type GrantDurationKey = "30d" | "90d" | "180d" | "12mo" | "lifetime";

export interface GrantFormState {
  ok:      boolean;
  message: string;
}

function durationToDays(key: GrantDurationKey): number | null {
  switch (key) {
    case "30d":      return 30;
    case "90d":      return 90;
    case "180d":     return 180;
    case "12mo":     return 365;
    case "lifetime": return null;
  }
}

function grantTypeFor(plan: GrantPlan, durationKey: GrantDurationKey): EntitlementGrantType {
  if (plan === "career_sprint") return "career_sprint_3_months";
  return durationKey === "lifetime" ? "pro_lifetime" : "pro_12_months";
}

export async function grantPlanToUser(
  _prev: GrantFormState,
  formData: FormData,
): Promise<GrantFormState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const emailOrId   = String(formData.get("emailOrId") ?? "").trim();
  const plan        = (formData.get("plan") ?? "pro") as GrantPlan;
  const durationKey = (formData.get("duration") ?? "12mo") as GrantDurationKey;
  const reason      = String(formData.get("reason") ?? "").trim() || "admin_grant";

  if (!emailOrId) return { ok: false, message: "Please provide an email or user id." };
  if (plan !== "pro" && plan !== "career_sprint") return { ok: false, message: "Invalid plan." };

  const user = await resolveUser(emailOrId);
  if (!user) return { ok: false, message: `No user found for "${emailOrId}".` };

  const days   = durationToDays(durationKey);
  const expiresAt = days ? new Date(Date.now() + days * 86_400_000).toISOString() : null;
  const grantType = grantTypeFor(plan, durationKey);

  const supabaseAdmin = createSupabaseAdminClient();
  const { error } = await supabaseAdmin.from("entitlement_grants").insert({
    user_id:    user.id,
    grant_type: grantType,
    plan,
    starts_at:  new Date().toISOString(),
    expires_at: expiresAt,
    source:     "admin_grant",
    granted_by: admin.userId,
    reason,
  });

  if (error) {
    await recordAdminAction({
      actionType: "grant_entitlement",
      targetUserId: user.id,
      status: "failed",
      metadata: { plan, durationKey, error: error.message },
    });
    return { ok: false, message: `Failed: ${error.message}` };
  }

  await refreshEntitlements(user.id);
  await recordAdminAction({
    actionType:   "grant_entitlement",
    targetUserId: user.id,
    targetRef:    `${plan}:${durationKey}`,
    metadata:     { email: user.email, plan, durationKey, reason },
  });

  revalidatePath("/admin/billing");
  revalidatePath("/admin/billing/grants");
  revalidatePath(`/admin/users/${user.id}`);

  const friendly = durationKey === "lifetime" ? "lifetime" : durationKey;
  return { ok: true, message: `${plan === "career_sprint" ? "Career Sprint" : "Pro"} granted to ${user.email} for ${friendly}.` };
}

export async function revokeGrant(grantId: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) throw new Error("Unauthorized");

  const supabaseAdmin = createSupabaseAdminClient();
  const { data: grant } = await supabaseAdmin
    .from("entitlement_grants")
    .select("user_id, grant_type")
    .eq("id", grantId)
    .maybeSingle();

  await supabaseAdmin
    .from("entitlement_grants")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", grantId);

  if (grant?.user_id) await refreshEntitlements(grant.user_id);

  await recordAdminAction({
    actionType:   "revoke_entitlement",
    targetUserId: grant?.user_id ?? null,
    targetRef:    grantId,
    metadata:     { grantType: grant?.grant_type },
  });

  revalidatePath("/admin/billing/grants");
  if (grant?.user_id) revalidatePath(`/admin/users/${grant.user_id}`);
}

export async function grantCreditsToUser(
  _prev: GrantFormState,
  formData: FormData,
): Promise<GrantFormState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const emailOrId = String(formData.get("emailOrId") ?? "").trim();
  const kind      = (String(formData.get("kind") ?? "tailored_resume") as CreditKind);
  const amount    = Number(formData.get("amount") ?? 0);
  const reason    = String(formData.get("reason") ?? "").trim() || "admin_grant";

  if (!emailOrId)               return { ok: false, message: "Please provide an email or user id." };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: "Amount must be a positive number." };
  if (amount > 1000)            return { ok: false, message: "Amount too large. Maximum 1000 credits per grant." };

  const user = await resolveUser(emailOrId);
  if (!user) return { ok: false, message: `No user found for "${emailOrId}".` };

  try {
    await grantCredits({
      userId: user.id,
      kind,
      amount,
      reason: `admin_grant:${reason}`,
      referenceKey: `admin:${admin.userId}:${Date.now()}`,
    });
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to grant credits." };
  }

  await recordAdminAction({
    actionType:   "grant_credits",
    targetUserId: user.id,
    targetRef:    `${kind}:${amount}`,
    metadata:     { email: user.email, kind, amount, reason },
  });

  revalidatePath("/admin/billing");
  revalidatePath(`/admin/users/${user.id}`);
  return { ok: true, message: `${amount} ${kind.replace(/_/g, " ")} credits granted to ${user.email}.` };
}
