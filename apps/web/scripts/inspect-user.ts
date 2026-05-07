// Inspect a real user's matches to validate complaints about ranking quality.
// Usage: PARSE_CAP=0 tsx scripts/inspect-user.ts <email>
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  const email = process.argv[2];
  if (!email) { console.error("usage: tsx inspect-user.ts <email>"); process.exit(1); }

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) { console.error(`No user with email ${email}`); process.exit(1); }
  console.log(`User: ${user.id} ${user.email}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, current_role, role_function, target_role_functions, years_experience, seniority, tech_stack, preferred_hubs, target_lpa, current_lpa")
    .eq("id", user.id)
    .maybeSingle();
  console.log("\nProfile:");
  console.log(JSON.stringify(profile, null, 2));

  const { data: matchesRaw } = await supabase
    .from("matches")
    .select("score, verdict, fit_card, hidden_reason, jobs(id, title, role_function, jd_seniority_signal, jd_min_years, jd_max_years, must_have_skills, jd_parsed_at, companies(name, slug))")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(40);

  type M = {
    score: number; verdict: string | null; fit_card: { one_liner?: string } | null; hidden_reason: string | null;
    jobs: { id: string; title: string; role_function: string | null; jd_seniority_signal: string | null;
      jd_min_years: number | null; jd_max_years: number | null;
      must_have_skills: string[] | null; jd_parsed_at: string | null;
      companies: { name: string; slug: string } | null } | null;
  };
  const matches = (matchesRaw as unknown as M[] | null) ?? [];
  console.log(`\nTop ${matches.length} matches (sorted by rules score):\n`);
  console.log(`${"score".padStart(5)} ${"verdict".padEnd(15)} ${"hide".padEnd(8)} ${"rf".padEnd(20)} ${"yr".padEnd(8)} ${"#mh".padEnd(4)} ${"company".padEnd(12)} title`);
  console.log("─".repeat(140));
  for (const m of matches) {
    if (!m.jobs) continue;
    const j = m.jobs;
    const yr = j.jd_min_years !== null && j.jd_max_years !== null ? `${j.jd_min_years}-${j.jd_max_years}` : (j.jd_min_years !== null ? `${j.jd_min_years}+` : "?");
    console.log(
      `${String(Math.round(m.score)).padStart(5)} ${(m.verdict ?? "—").padEnd(15)} ${(m.hidden_reason ?? "").padEnd(8)} ${(j.role_function ?? "—").padEnd(20)} ${yr.padEnd(8)} ${String(j.must_have_skills?.length ?? 0).padEnd(4)} ${(j.companies?.slug ?? "?").padEnd(12)} ${j.title.slice(0, 70)}`,
    );
    if (m.fit_card?.one_liner) console.log(`      └ ${m.fit_card.one_liner.slice(0, 130)}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
