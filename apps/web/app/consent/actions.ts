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
  const notificationsOn = formData.get("notifications") === "on";

  const grants: Partial<Record<ConsentPurpose, boolean>> = {
    account: true, // always required
    matching: formData.get("matching") === "on",
    digest_email: digestOn,
    analytics: formData.get("analytics") === "on",
    resume_intelligence: formData.get("resume_intelligence") === "on",
    notifications: notificationsOn,
  };

  await saveConsents(user.id, grants);

  // Phase H — fold the old /alerts toggle into Privacy. The consent record is
  // the legal basis (DPDP); the digest_subscriptions row is the operational
  // dispatch state. Keep them aligned: if you grant the consent, you're
  // subscribed; if you revoke it, you're off.
  const admin = createSupabaseAdminClient();

  await (admin.from("digest_subscriptions") as any).upsert({
    user_id: user.id,
    frequency: digestOn ? "weekly" : "off",
    next_send_at: digestOn ? nextMondayIST() : null,
  }, { onConflict: "user_id" });

  // Revoking the notifications consent must immediately stop dispatch: disable
  // every stored push subscription for this user (the legal basis is gone, so
  // the operational state has to follow — same invariant as digest above).
  if (!notificationsOn) {
    await admin
      .from("push_subscriptions")
      .update({ disabled_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .is("disabled_at", null);
  }

  redirect(next.startsWith("/") ? next : "/dashboard");
}
