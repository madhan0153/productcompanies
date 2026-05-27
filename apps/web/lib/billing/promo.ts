import { createHash } from "crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreditKind, EntitlementGrantType } from "@/lib/supabase/types";
import { grantCredits } from "./credits";
import { refreshEntitlements } from "./entitlements";

// code_hash = SHA-256(lowercase(trimmed_code)) — stable lookup key.
// The per-row `salt` column is reserved for future HMAC upgrade; current
// implementation uses the plain hash since promo codes are not passwords.
export function hashPromoCode(plain: string): string {
  return createHash("sha256").update(plain.toLowerCase().trim()).digest("hex");
}

export type PromoRedeemResult =
  | { ok: true; grantType: EntitlementGrantType; message: string }
  | { ok: false; code: "not_found" | "expired" | "exhausted" | "already_redeemed" | "inactive"; message: string };

export async function redeemPromoCode(
  userId: string,
  rawCode: string,
): Promise<PromoRedeemResult> {
  const admin = createSupabaseAdminClient();
  const hash  = hashPromoCode(rawCode);
  const now   = new Date().toISOString();

  const { data: promo } = await admin
    .from("promo_codes")
    .select(
      "id, grant_type, credit_kind, credit_amount, duration_days, expires_at, max_redemptions, redeemed_count, is_active",
    )
    .eq("code_hash", hash)
    .maybeSingle();

  if (!promo || !promo.is_active) {
    return { ok: false, code: "not_found", message: "Promo code not found or no longer active." };
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return { ok: false, code: "expired", message: "This promo code has expired." };
  }

  if (promo.max_redemptions !== null && promo.redeemed_count >= promo.max_redemptions) {
    return { ok: false, code: "exhausted", message: "This promo code has reached its redemption limit." };
  }

  // Check if user already redeemed
  const { data: existing } = await admin
    .from("promo_redemptions")
    .select("id")
    .eq("promo_code_id", promo.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    return { ok: false, code: "already_redeemed", message: "You have already redeemed this promo code." };
  }

  // Record redemption first (unique constraint prevents race conditions)
  const { error: redeemError } = await admin
    .from("promo_redemptions")
    .insert({ promo_code_id: promo.id, user_id: userId });

  if (redeemError) {
    // Unique constraint violation = concurrent double-redeem attempt
    return { ok: false, code: "already_redeemed", message: "You have already redeemed this promo code." };
  }

  // Atomically increment redeemed_count
  await admin
    .from("promo_codes")
    .update({ redeemed_count: promo.redeemed_count + 1, updated_at: now })
    .eq("id", promo.id);

  const grantType = promo.grant_type as EntitlementGrantType;

  if (grantType === "credits_fixed") {
    // Grant credits
    if (promo.credit_kind && promo.credit_amount) {
      await grantCredits({
        userId,
        kind: promo.credit_kind as CreditKind,
        amount: promo.credit_amount,
        reason: "promo_redemption",
        referenceKey: `promo:${promo.id}:${userId}`,
      });
    }
    return {
      ok: true,
      grantType,
      message: `${promo.credit_amount ?? 0} credits added to your account.`,
    };
  }

  // Subscription-tier grant
  const planFromType = (): "pro" | "career_sprint" | null => {
    if (grantType === "pro_12_months" || grantType === "pro_lifetime") return "pro";
    if (grantType === "career_sprint_3_months") return "career_sprint";
    return null;
  };

  const plan = planFromType();
  if (!plan) {
    return { ok: false, code: "not_found", message: "Unrecognised grant type." };
  }

  const durationDays =
    promo.duration_days ??
    (grantType === "pro_12_months" ? 365 :
     grantType === "career_sprint_3_months" ? 90 :
     null); // null = lifetime

  const expiresAt = durationDays
    ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
    : null;

  await admin.from("entitlement_grants").insert({
    user_id:    userId,
    grant_type: grantType,
    plan,
    starts_at:  now,
    expires_at: expiresAt,
    source:     "promo_code",
    source_ref: promo.id,
    reason:     `promo_${rawCode.slice(0, 4).toLowerCase()}****`,
  });

  await refreshEntitlements(userId);

  const friendlyDuration =
    grantType === "pro_lifetime" ? "lifetime"
    : grantType === "pro_12_months" ? "12 months"
    : grantType === "career_sprint_3_months" ? "3 months"
    : `${durationDays} days`;

  return {
    ok: true,
    grantType,
    message: `${plan === "career_sprint" ? "Career Sprint" : "Pro"} unlocked for ${friendlyDuration}!`,
  };
}
