"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { saveConsents, type ConsentPurpose } from "@/lib/dpdp/consent";

function nextMondayIST(): string {
  const d = new Date();
  const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
  d.setDate(d.getDate() + daysUntilMonday);
  d.setUTCHours(2, 30, 0, 0); // 02:30 UTC = 08:00 IST
  return d.toISOString();
}

export async function submitConsents(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const next = (formData.get("next") as string) || "/dashboard";
  const digestOn = formData.get("digest_email") === "on";

  const grants: Partial<Record<ConsentPurpose, boolean>> = {
    account: true, // always required
    matching: formData.get("matching") === "on",
    digest_email: digestOn,
    analytics: formData.get("analytics") === "on",
  };

  await saveConsents(user.id, grants);

  // Phase H — fold the old /alerts toggle into Privacy. The consent record is
  // the legal basis (DPDP); the digest_subscriptions row is the operational
  // dispatch state. Keep them aligned: if you grant the consent, you're
  // subscribed; if you revoke it, you're off.
  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("digest_subscriptions") as any).upsert({
    user_id: user.id,
    frequency: digestOn ? "weekly" : "off",
    next_send_at: digestOn ? nextMondayIST() : null,
  }, { onConflict: "user_id" });

  redirect(next.startsWith("/") ? next : "/dashboard");
}
