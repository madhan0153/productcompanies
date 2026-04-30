"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function upsertStory(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const id = (formData.get("id") as string) || undefined;
  const title = (formData.get("title") as string).trim();
  const situation = (formData.get("situation") as string).trim() || null;
  const task = (formData.get("task") as string).trim() || null;
  const action = (formData.get("action") as string).trim() || null;
  const result = (formData.get("result") as string).trim() || null;
  const tagsRaw = (formData.get("tags") as string).trim();
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!title) return;

  if (id) {
    await supabase.from("stories")
      .update({ title, situation, task, action, result, tags })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("stories")
      .insert({ user_id: user.id, title, situation, task, action, result, tags });
  }

  revalidatePath("/stories");
}

export async function deleteStory(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const id = formData.get("id") as string;
  await supabase.from("stories").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/stories");
}
