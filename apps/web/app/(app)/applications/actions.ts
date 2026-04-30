"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ApplicationStatus } from "@/lib/supabase/types";

export async function addApplication(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const jobId = (formData.get("job_id") as string).trim();
  const status = (formData.get("status") as string) || "saved";
  const notes = (formData.get("notes") as string).trim() || null;
  const appliedAtRaw = formData.get("applied_at") as string;

  if (!jobId) return;

  await supabase.from("applications").upsert(
    {
      user_id: user.id,
      job_id: jobId,
      status: status as ApplicationStatus,
      notes,
      applied_at: appliedAtRaw ? new Date(appliedAtRaw).toISOString() : null,
    },
    { onConflict: "user_id,job_id" },
  );

  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function updateStatus(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const appId = formData.get("app_id") as string;
  const status = formData.get("status") as ApplicationStatus;
  const nextActionAt = (formData.get("next_action_at") as string) || null;

  await supabase.from("applications")
    .update({
      status,
      next_action_at: nextActionAt ? new Date(nextActionAt).toISOString() : null,
    })
    .eq("id", appId)
    .eq("user_id", user.id);

  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function deleteApplication(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const appId = formData.get("app_id") as string;

  await supabase.from("applications")
    .delete()
    .eq("id", appId)
    .eq("user_id", user.id);

  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function addInterviewNote(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const appId = formData.get("app_id") as string;
  const round = (formData.get("round") as string).trim() || null;
  const interviewer = (formData.get("interviewer") as string).trim() || null;
  const notes = (formData.get("notes") as string).trim() || null;

  // Verify ownership
  const { data: app } = await supabase.from("applications")
    .select("id").eq("id", appId).eq("user_id", user.id).maybeSingle();
  if (!app) return;

  await supabase.from("interview_notes").insert({ application_id: appId, round, interviewer, notes });

  revalidatePath(`/applications/${appId}`);
}

export async function deleteInterviewNote(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const noteId = formData.get("note_id") as string;
  const appId = formData.get("app_id") as string;

  // Verify ownership via join
  const { data: note } = await supabase.from("interview_notes")
    .select("id, application_id")
    .eq("id", noteId)
    .maybeSingle();

  if (!note) return;

  const { data: app } = await supabase.from("applications")
    .select("id").eq("id", note.application_id).eq("user_id", user.id).maybeSingle();
  if (!app) return;

  await supabase.from("interview_notes").delete().eq("id", noteId);
  revalidatePath(`/applications/${appId}`);
}
