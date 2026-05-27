"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPromoCode } from "@/lib/billing/promo";
import type { CreditKind, EntitlementGrantType } from "@/lib/supabase/types";
import { requireAdmin } from "../auth";
import { recordAdminAction } from "../audit";

export interface PromoFormState {
  ok:      boolean;
  message: string;
  code?:   string; // only returned on successful create — shown ONCE
}

function generateCode(prefix: string): string {
  const raw = randomBytes(6).toString("base64url").replace(/[_-]/g, "").slice(0, 8).toUpperCase();
  const safePrefix = prefix.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase();
  return safePrefix ? `${safePrefix}-${raw}` : raw;
}

export async function createPromoCode(
  _prev: PromoFormState,
  formData: FormData,
): Promise<PromoFormState> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) return { ok: false, message: "Unauthorized." };

  const label         = String(formData.get("label") ?? "").trim();
  const prefix        = String(formData.get("prefix") ?? "FRIEND").trim();
  const grantType     = (String(formData.get("grantType") ?? "pro_12_months") as EntitlementGrantType);
  const durationDays  = formData.get("durationDays") ? Number(formData.get("durationDays")) : null;
  const maxRedemptions = formData.get("maxRedemptions") ? Number(formData.get("maxRedemptions")) : null;
  const expiresInDays = formData.get("expiresInDays") ? Number(formData.get("expiresInDays")) : null;
  const creditKind    = (formData.get("creditKind") ?? null) as CreditKind | null;
  const creditAmount  = formData.get("creditAmount") ? Number(formData.get("creditAmount")) : null;

  if (!label) return { ok: false, message: "Please add a label so you can identify this promo later." };

  if (grantType === "credits_fixed" && (!creditKind || !creditAmount || creditAmount <= 0)) {
    return { ok: false, message: "Credit grants require both a credit kind and a positive amount." };
  }

  const code = generateCode(prefix);
  const codeHash = hashPromoCode(code);

  const supabaseAdmin = createSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .from("promo_codes")
    .insert({
      code_label:       label,
      code_hash:        codeHash,
      grant_type:       grantType,
      credit_kind:      grantType === "credits_fixed" ? creditKind : null,
      credit_amount:    grantType === "credits_fixed" ? creditAmount : null,
      duration_days:    durationDays,
      max_redemptions:  maxRedemptions,
      expires_at:       expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString() : null,
      is_active:        true,
      created_by:       admin.userId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: `Failed: ${error?.message ?? "could not create promo"}` };
  }

  await recordAdminAction({
    actionType: "create_promo_code",
    targetRef:  `promo:${data.id}`,
    metadata:   { label, grantType, durationDays, maxRedemptions, expiresInDays },
  });

  revalidatePath("/admin/billing/promos");
  return {
    ok:      true,
    code,
    message: `Promo created. Copy now — it will not be shown again.`,
  };
}

export async function deactivatePromoCode(id: string): Promise<void> {
  const admin = await requireAdmin();
  if (!admin.isAdmin) throw new Error("Unauthorized");

  const supabaseAdmin = createSupabaseAdminClient();
  await supabaseAdmin.from("promo_codes").update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id);

  await recordAdminAction({
    actionType: "deactivate_promo_code",
    targetRef:  `promo:${id}`,
  });

  revalidatePath("/admin/billing/promos");
}
