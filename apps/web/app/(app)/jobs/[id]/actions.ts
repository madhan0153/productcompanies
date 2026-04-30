"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/supabase/types";

export async function trackJob(
  jobId: string,
  status: ApplicationStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("applications").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      status,
      applied_at: status === "applied" || status === "interviewing" || status === "offer"
        ? new Date().toISOString()
        : null,
    },
    { onConflict: "user_id,job_id" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function untrackJob(
  appId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { error } = await supabase.from("applications")
    .delete()
    .eq("id", appId)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  return { ok: true };
}
