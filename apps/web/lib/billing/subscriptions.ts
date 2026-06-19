import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type SubscriptionInsert = Omit<
  Database["public"]["Tables"]["subscriptions"]["Insert"],
  "id" | "created_at"
>;

/**
 * Persist a provider subscription without PostgREST's `on_conflict` parameter.
 *
 * The production schema historically used a partial unique index for provider
 * subscription IDs. PostgreSQL supports that index, but PostgREST cannot infer
 * it from an `on_conflict=provider,environment,provider_subscription_id`
 * request. A select/update-or-insert flow works with both the historical
 * partial index and the corrected full unique index.
 */
export async function persistProviderSubscription(values: SubscriptionInsert): Promise<void> {
  const providerSubscriptionId = values.provider_subscription_id;
  if (!providerSubscriptionId) {
    throw new Error("provider_subscription_id is required");
  }

  const admin = createSupabaseAdminClient();
  const existingResult = await admin
    .from("subscriptions")
    .select("id")
    .eq("provider", values.provider)
    .eq("environment", values.environment ?? "test_mode")
    .eq("provider_subscription_id", providerSubscriptionId)
    .maybeSingle();
  if (existingResult.error) throw existingResult.error;

  if (existingResult.data) {
    const updateResult = await admin
      .from("subscriptions")
      .update(values)
      .eq("id", existingResult.data.id);
    if (updateResult.error) throw updateResult.error;
    return;
  }

  const insertResult = await admin.from("subscriptions").insert(values);
  if (!insertResult.error) return;

  // A concurrent webhook/direct-sync may have inserted the same provider
  // subscription between our lookup and insert. Resolve that race as update.
  if (insertResult.error.code === "23505") {
    const retryResult = await admin
      .from("subscriptions")
      .update(values)
      .eq("provider", values.provider)
      .eq("environment", values.environment ?? "test_mode")
      .eq("provider_subscription_id", providerSubscriptionId);
    if (!retryResult.error) return;
    throw retryResult.error;
  }

  throw insertResult.error;
}
