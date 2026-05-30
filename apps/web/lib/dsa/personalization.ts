import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// "Why this is for you" — derives the strongest matched company from the user's
// match set to personalize the daily question. Best-effort and never blocks the
// page: any failure (no resume, no matches, table shape change) falls back to a
// generic, non-PII rationale. No resume content or profile fields are read.

export interface DsaPersonalization {
  matchedCompanies: { name: string; roleCount: number }[];
  rationale: string;
}

const GENERIC: DsaPersonalization = {
  matchedCompanies: [],
  rationale: "Hand-authored and modelled on real interviews at India's top product companies.",
};

export async function getDsaPersonalization(userId: string | null): Promise<DsaPersonalization> {
  if (!userId) return GENERIC;
  try {
    const db = createSupabaseAdminClient() as unknown as { from: (t: string) => any };
    const { data } = await db
      .from("matches")
      .select("score, jobs!inner(company_id, companies!inner(name))")
      .eq("user_id", userId)
      .gte("score", 70)
      .order("score", { ascending: false })
      .limit(120);

    const rows = (data ?? []) as Array<{ jobs?: { companies?: { name?: string } } }>;
    if (rows.length === 0) return GENERIC;

    const counts = new Map<string, number>();
    for (const r of rows) {
      const name = r?.jobs?.companies?.name;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    if (counts.size === 0) return GENERIC;

    const ranked = [...counts.entries()]
      .map(([name, roleCount]) => ({ name, roleCount }))
      .sort((a, b) => b.roleCount - a.roleCount);

    const top = ranked[0];
    const rationale =
      top.roleCount >= 2
        ? `Your resume matches ${top.roleCount} ${top.name} roles you're a strong fit for.`
        : `Picked for the ${top.name} interview track your profile lines up with.`;

    return { matchedCompanies: ranked.slice(0, 5), rationale };
  } catch {
    return GENERIC;
  }
}
