"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function upsertOffer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const id = (formData.get("id") as string) || undefined;
  const companyId = formData.get("company_id") as string;
  const baseLpa = parseFloat(formData.get("base_lpa") as string) || null;
  const variableLpa = parseFloat(formData.get("variable_lpa") as string) || null;
  const esopLpa = parseFloat(formData.get("esop_value_lpa") as string) || null;
  const joiningBonus = parseFloat(formData.get("joining_bonus") as string) || null;
  const notes = (formData.get("notes") as string).trim() || null;

  if (!companyId) return;

  if (id) {
    await supabase.from("offers")
      .update({ company_id: companyId, base_lpa: baseLpa, variable_lpa: variableLpa, esop_value_lpa: esopLpa, joining_bonus: joiningBonus, notes })
      .eq("id", id)
      .eq("user_id", user.id);
  } else {
    await supabase.from("offers")
      .insert({ user_id: user.id, company_id: companyId, base_lpa: baseLpa, variable_lpa: variableLpa, esop_value_lpa: esopLpa, joining_bonus: joiningBonus, notes });
  }

  revalidatePath("/offers");
}

export async function deleteOffer(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const id = formData.get("id") as string;
  await supabase.from("offers").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/offers");
}
