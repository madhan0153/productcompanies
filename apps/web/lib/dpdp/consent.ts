import { createSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import type { DpdpEventType } from "@/lib/supabase/types";

export type ConsentPurpose = "account" | "matching" | "digest_email" | "analytics";

export const CONSENT_LABELS: Record<ConsentPurpose, { title: string; description: string; required: boolean }> = {
  account: {
    title: "Account & Core Service",
    description: "Store your profile and use it to operate the ProdMatch.ai platform. Required to use the service.",
    required: true,
  },
  matching: {
    title: "AI Job Matching",
    description: "Use your profile and resume to compute personalised job match scores and explanations.",
    required: false,
  },
  digest_email: {
    title: "Weekly Email Digest",
    description: "Send a weekly summary of new matching roles to your registered email address.",
    required: false,
  },
  analytics: {
    title: "Product Analytics",
    description: "Collect anonymised usage data to improve the product. No PII is shared.",
    required: false,
  },
};

export async function getUserConsents(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("consents")
    .select("purpose, granted")
    .eq("user_id", userId)
    .eq("policy_version", serverEnv.DPDP_POLICY_VERSION);

  const map: Partial<Record<ConsentPurpose, boolean>> = {};
  for (const row of data ?? []) {
    map[row.purpose as ConsentPurpose] = row.granted as boolean;
  }
  return map;
}

export async function saveConsents(
  userId: string,
  grants: Partial<Record<ConsentPurpose, boolean>>,
) {
  const supabase = await createSupabaseServerClient();
  const version = serverEnv.DPDP_POLICY_VERSION;
  const now = new Date().toISOString();

  const rows = (Object.entries(grants) as [ConsentPurpose, boolean][]).map(
    ([purpose, granted]) => ({
      user_id: userId,
      purpose,
      policy_version: version,
      granted,
      granted_at: now,
      revoked_at: granted ? null : now,
    }),
  );

  await supabase.from("consents").upsert(rows, {
    onConflict: "user_id,purpose,policy_version",
  });

  // Audit each change
  const events = rows.map((r) => ({
    user_id: userId,
    event: (r.granted ? "consent_granted" : "consent_revoked") as DpdpEventType,
    metadata: { purpose: r.purpose, policy_version: version },
  }));
  await supabase.from("dpdp_events").insert(events);
}
