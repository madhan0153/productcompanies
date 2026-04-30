"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeMatchesForUser } from "@/lib/matching/engine";
import { getUserConsents } from "@/lib/dpdp/consent";

export type ComputeMatchesResult =
  | { ok: true; total: number; withExplanations: number }
  | { ok: false; error: string };

export async function computeMatches(): Promise<ComputeMatchesResult> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return {
      ok: false,
      error: "Enable AI Matching consent in Settings → Privacy to use this feature.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_storage_path")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.resume_storage_path) {
    return { ok: false, error: "Upload your resume first to compute matches." };
  }

  try {
    const result = await computeMatchesForUser(user.id);
    revalidatePath("/matches");
    return { ok: true, ...result };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
