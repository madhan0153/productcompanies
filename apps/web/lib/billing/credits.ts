import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreditKind, Json } from "@/lib/supabase/types";

export interface CreditSpendResult {
  ok: boolean;
  balance: number;
  alreadySpent?: boolean;
}

export async function getCreditBalance(userId: string, kind: CreditKind): Promise<number> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", userId)
    .eq("kind", kind)
    .or(`expires_at.is.null,expires_at.gt.${now}`);

  return (data ?? []).reduce((sum, row) => sum + row.amount, 0);
}

export async function grantCredits(input: {
  userId: string;
  kind: CreditKind;
  amount: number;
  reason: string;
  referenceKey?: string | null;
  expiresAt?: string | null;
  metadata?: Json;
}): Promise<void> {
  if (input.amount <= 0) throw new Error("Credit grants must be positive.");
  const admin = createSupabaseAdminClient();
  await admin.from("credit_ledger").insert({
    user_id: input.userId,
    kind: input.kind,
    amount: input.amount,
    reason: input.reason,
    reference_key: input.referenceKey ?? null,
    expires_at: input.expiresAt ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function consumeCredit(input: {
  userId: string;
  kind: CreditKind;
  amount?: number;
  reason: string;
  referenceKey: string;
  metadata?: Json;
}): Promise<CreditSpendResult> {
  const amount = input.amount ?? 1;
  if (amount <= 0) throw new Error("Credit spend must be positive.");

  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("credit_ledger")
    .select("amount")
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .eq("reference_key", input.referenceKey)
    .maybeSingle();

  const balance = await getCreditBalance(input.userId, input.kind);
  if (existing && existing.amount < 0) {
    return { ok: true, balance, alreadySpent: true };
  }
  if (balance < amount) return { ok: false, balance };

  const { error } = await admin.from("credit_ledger").insert({
    user_id: input.userId,
    kind: input.kind,
    amount: -amount,
    reason: input.reason,
    reference_key: input.referenceKey,
    metadata: input.metadata ?? {},
  });

  if (error) {
    const retryBalance = await getCreditBalance(input.userId, input.kind);
    return { ok: true, balance: retryBalance, alreadySpent: true };
  }

  return { ok: true, balance: balance - amount };
}
