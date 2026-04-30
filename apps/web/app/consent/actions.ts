"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saveConsents, type ConsentPurpose } from "@/lib/dpdp/consent";

export async function submitConsents(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const next = (formData.get("next") as string) || "/dashboard";

  const grants: Partial<Record<ConsentPurpose, boolean>> = {
    account: true, // always required
    matching: formData.get("matching") === "on",
    digest_email: formData.get("digest_email") === "on",
    analytics: formData.get("analytics") === "on",
  };

  await saveConsents(user.id, grants);

  redirect(next.startsWith("/") ? next : "/dashboard");
}
