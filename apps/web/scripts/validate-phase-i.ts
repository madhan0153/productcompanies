// In-memory Phase I validation. Doesn't require the new schema columns to
// exist — embeds resume + a sample of JDs in memory, computes cosine, runs
// the new score, prints the new top-20 vs the user's current persisted top.
//
// usage: tsx scripts/validate-phase-i.ts <email>
import { createClient } from "@supabase/supabase-js";
import { embed, buildResumeEmbedText, buildJobEmbedText, cosineSimilarity } from "../lib/llm/embed";
import { computeRulesScore } from "../lib/matching/score";
import type { ParsedResume } from "../lib/llm/prompts/resume-parse";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  const email = process.argv[2];
  if (!email) { console.error("usage: tsx scripts/validate-phase-i.ts <email>"); process.exit(1); }

  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) { console.error("no such user"); process.exit(1); }

  // SELECT * to avoid failing on columns the cloned DB doesn't have yet
  // (Phase I migration may not be applied).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle() as any;
  if (!prof) { console.error("no profile"); process.exit(1); }
  const resumeParsed: ParsedResume | null = (prof.resume_parsed as ParsedResume | null) ?? null;
  if (!resumeParsed) { console.error("no resume_parsed"); process.exit(1); }

  console.log(`Profile: ${prof.display_name} | ${prof.current_role} | ${prof.years_experience}y`);
  console.log(`Targets: ${(prof.target_role_functions ?? []).join(",")}`);

  // Embed resume in memory
  console.log("→ embedding resume");
  const resumeEmb = await embed(buildResumeEmbedText(resumeParsed));
  console.log(`  ${resumeEmb.length}-dim`);

  // Pull active jobs (paged)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all: any[] = [];
  for (let from = 0; ; from += 1000) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await supabase.from("jobs").select("*, companies(name, slug)").eq("is_active", true).range(from, from + 999) as any;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < 1000) break;
  }
  const parsedJobs = all.filter((j) => j.jd_parsed_at !== null);
  console.log(`Active=${all.length} parsed=${parsedJobs.length}`);

  // Embed up to N JDs in memory (keyed by id)
  const EMBED_CAP = parseInt(process.env.EMBED_CAP ?? "60", 10);
  const targets = parsedJobs.slice(0, EMBED_CAP);
  console.log(`→ embedding ${targets.length} JDs (in-memory only)`);
  const embByJob = new Map<string, number[]>();
  let ok = 0, errs = 0;
  const queue = [...targets];
  const worker = async () => {
    while (queue.length > 0) {
      const j = queue.shift()!;
      try {
        const e = await embed(buildJobEmbedText({
          title: j.title,
          company: j.companies?.name ?? null,
          jd_summary: j.jd_summary,
          must_have_skills: j.must_have_skills,
          nice_to_have_skills: j.nice_to_have_skills,
          description: j.description,
          jd_seniority_signal: j.jd_seniority_signal,
        }));
        if (e.length > 0) { embByJob.set(j.id, e); ok++; }
      } catch (err) {
        errs++;
        if (errs <= 3) console.log(`  err ${j.title.slice(0, 40)}: ${(err as Error).message.split("\n")[0]}`);
      }
      if ((ok + errs) % 10 === 0) console.log(`  ${ok + errs}/${targets.length} ok=${ok} err=${errs}`);
    }
  };
  await Promise.allSettled(Array.from({ length: 4 }, worker));
  console.log(`  done: ok=${ok} err=${errs}`);

  // Profile shape for scoring
  const profile = {
    target_role_functions:
      (prof.target_role_functions ?? []).length
        ? (prof.target_role_functions ?? [])
        : (resumeParsed.target_role_functions ?? []),
    years_experience: prof.years_experience,
    tech_stack: prof.tech_stack ?? [],
    seniority: prof.seniority ?? null,
    preferred_hubs: prof.preferred_hubs ?? [],
    target_lpa: prof.target_lpa,
  };

  // Score with Phase I weights
  const scored = all
    .map((j) => {
      const e = embByJob.get(j.id);
      const cos = e && resumeEmb.length === e.length ? cosineSimilarity(resumeEmb, e) : null;
      const rules = computeRulesScore(profile, {
        title: j.title,
        description: j.description,
        role_function: j.role_function,
        min_experience_years: j.min_experience_years,
        max_experience_years: j.max_experience_years,
        jd_min_years: j.jd_min_years,
        jd_max_years: j.jd_max_years,
        tech_stack: j.tech_stack ?? [],
        must_have_skills: j.must_have_skills,
        nice_to_have_skills: j.nice_to_have_skills,
        seniority: j.seniority,
        jd_seniority_signal: j.jd_seniority_signal,
        hubs: j.hubs ?? [],
        comp_lpa_max: j.comp_lpa_max,
        semantic_cosine: cos,
      });
      return { j, rules, cos };
    })
    .filter((s) => !s.rules.hardMismatch)
    .sort((a, b) => b.rules.total - a.rules.total);

  console.log(`\n━━━ Top 20 with Phase I (semantic-led) ━━━`);
  console.log(`${"score".padStart(5)} ${"sem".padStart(4)} ${"tech".padStart(4)} ${"role".padStart(4)} ${"exp".padStart(3)} ${"cos".padStart(5)} ${"co".padEnd(11)} title`);
  console.log("─".repeat(140));
  for (const s of scored.slice(0, 20)) {
    const b = s.rules.breakdown;
    const cosStr = s.cos !== null ? s.cos.toFixed(2) : "  — ";
    console.log(
      `${String(Math.round(s.rules.total)).padStart(5)} ${String(b.semantic).padStart(4)} ${String(b.tech).padStart(4)} ${String(b.role).padStart(4)} ${String(b.experience).padStart(3)} ${cosStr.padStart(5)} ${(s.j.companies?.slug ?? "?").padEnd(11)} ${String(s.j.title).slice(0, 80)}`,
    );
  }

  console.log(`\nDistribution: strong(≥75)=${scored.filter((s) => s.rules.total >= 75).length}, stretch(55-74)=${scored.filter((s) => s.rules.total >= 55 && s.rules.total < 75).length}, hard-mismatched=${all.length - scored.length}`);

  // Show low-cosine warnings — jobs with high pre-Phase-I score but low semantic
  const lowCos = scored.filter((s) => s.cos !== null && s.cos < 0.55).slice(0, 10);
  if (lowCos.length > 0) {
    console.log(`\nJobs with low cosine (<0.55) — these are exactly what Phase I demotes:`);
    for (const s of lowCos.slice(0, 8)) {
      console.log(`  cos=${s.cos!.toFixed(2)} score=${Math.round(s.rules.total)} | ${s.j.title.slice(0, 80)} @ ${s.j.companies?.name}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
