"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendErasureConfirmed } from "@/lib/email";
import type { DpdpEventType } from "@/lib/supabase/types";

export async function requestDataExport() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Log the export request event
  await supabase.from("dpdp_events").insert({
    user_id: user.id,
    event: "export_requested" as DpdpEventType,
    metadata: { source: "settings_ui" },
  });

  // Redirect user to the export endpoint which streams the JSON download
  redirect("/api/export");
}

export async function requestErasure(formData: FormData) {
  const confirmation = formData.get("confirmation") as string;
  if (confirmation !== "DELETE MY ACCOUNT") return;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const uid = user.id;
  const email = user.email ?? "";

  // Fetch display_name for the farewell email before erasure
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", uid)
    .maybeSingle();
  const name = profile?.display_name ?? email.split("@")[0];

  // Log erasure request
  const admin = createSupabaseAdminClient();
  await admin.from("dpdp_events").insert({
    user_id: uid,
    event: "erasure_requested" as DpdpEventType,
    metadata: { requested_at: new Date().toISOString() },
  });

  // Call the SQL erasure function (deletes all user data, keeps anonymised audit row)
  await admin.rpc("request_user_erasure", { uid });

  // Delete the auth user
  await admin.auth.admin.deleteUser(uid);

  // Send confirmation email (fire and forget — user is already signed out)
  sendErasureConfirmed({ to: email, name }).catch(() => {});

  // Redirect to a farewell page — session is now invalid
  redirect("/auth/login?erased=1");
}

export async function resendExportEmail() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  await supabase.from("dpdp_events").insert({
    user_id: user.id,
    event: "export_requested" as DpdpEventType,
    metadata: { source: "email_link" },
  });

  revalidatePath("/settings/privacy");
}
