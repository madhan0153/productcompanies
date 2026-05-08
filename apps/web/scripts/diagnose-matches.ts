/**
 * One-shot diagnostic: parse resume → parse JDs → score → generate Fit Cards.
 * Prints everything so we can eyeball whether matching is working.
 *
 * Run: pnpm --filter web exec tsx scripts/diagnose-matches.ts <resume.pdf>
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Load env from apps/web/.env.local. Search a few candidate paths because
// tsx may run with cwd=apps/web or cwd=monorepo-root.
function loadEnvLocal() {
  const candidates = [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), "apps", "web", ".env.local"),
    resolve(__dirname, "..", ".env.local"),
  ];
  for (const path of candidates) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const [, k, vRaw] = m;
      if (process.env[k]) continue;
      process.env[k] = vRaw.replace(/^["']|["']$/g, "");
    }
    process.stderr.write(`[diagnose] loaded env from ${path}\n`);
    return;
  }
  process.stderr.write("[diagnose] WARNING: no .env.local found, relying on inherited env\n");
}
loadEnvLocal();

import { createClient } from "@supabase/supabase-js";
import { parseResumePdf } from "../lib/llm/prompts/resume-parse";
import { parseJobDescription } from "../lib/llm/prompts/jd-parse";
import { computeRulesScore } from "../lib/matching/score";
import { generateFitCard } from "../lib/llm/prompts/fit-card";
import { detectGhost } from "../lib/matching/ghost";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: tsx scripts/diagnose-matches.ts <resume.pdf>");
    process.exit(1);
  }

  // ── 1. Parse resume ─────────────────────────────────────────────────────────
  console.log("\n━━━ 1. Parsing resume ━━━");
  const pdfBytes = readFileSync(pdfPath);
  console.log(`PDF size: ${(pdfBytes.length / 1024).toFixed(1)} KB`);

  const resume = await parseResumePdf(pdfBytes.toString("base64"));
  console.log("Parsed resume:");
  console.log(`  Name: ${resume.name}`);
  console.log(`  Current role: ${resume.current_role}`);
  console.log(`  role_function: ${resume.role_function}`);
  console.log(`  target_role_functions: ${resume.target_role_functions.join(", ")}`);
  console.log(`  Years: ${resume.total_years_experience}`);
  console.log(`  Tech (${resume.tech_stack.length}): ${resume.tech_stack.slice(0, 20).join(", ")}`);
  console.log(`  Companies: ${resume.companies.map((c) => `${c.name}(${c.role}, ${c.years}y)`).join("; ")}`);
  console.log(`  Product DNA: ${resume.product_dna_score}`);
  console.log(`  Estimated current LPA: ${resume.estimated_current_lpa ?? "?"}`);
  console.log(`  Preferred hubs: ${(resume.preferred_hubs ?? []).join(", ")}`);

  // ── 2. Fetch all active jobs ────────────────────────────────────────────────
  console.log("\n━━━ 2. Fetching active jobs ━━━");
  const { data: rawJobs, error: jobErr } = await supabase
    .from("jobs")
    .select(
      "id, title, description, hubs, location, min_experience_years, max_experience_years, comp_lpa_min, comp_lpa_max, tech_stack, seniority, role_function, must_have_skills, nice_to_have_skills, jd_min_years, jd_max_years, jd_seniority_signal, jd_summary, jd_parsed_at, is_likely_ghost, posted_at, last_seen_at, companies(name, slug)",
    )
    .eq("is_active", true);

  if (jobErr) throw new Error(`DB: ${jobErr.message}`);

  type J = {
    id: string; title: string; description: string | null;
    hubs: string[] | null; location: string | null;
    min_experience_years: number | null; max_experience_years: number | null;
    comp_lpa_min: number | null; comp_lpa_max: number | null;
    tech_stack: string[] | null; seniority: string | null;
    role_function: string | null;
    must_have_skills: string[] | null; nice_to_have_skills: string[] | null;
    jd_min_years: number | null; jd_max_years: number | null;
    jd_seniority_signal: string | null; jd_summary: string | null;
    jd_parsed_at: string | null; is_likely_ghost: boolean | null;
    posted_at: string | null; last_seen_at: string | null;
    companies: { name: string; slug: string } | null;
  };

  const jobs = (rawJobs as unknown as J[]) ?? [];
  console.log(`Total active jobs: ${jobs.length}`);
  console.log(`  Already JD-parsed: ${jobs.filter((j) => j.jd_parsed_at).length}`);
  console.log(`  Pending parse: ${jobs.filter((j) => !j.jd_parsed_at).length}`);

  // ── 3. Backfill JD parse (parallel + per-call timeout + progress) ──────────
  const PARSE_CAP = parseInt(process.env.PARSE_CAP ?? "80", 10);
  const PARALLEL = 5;
  const PER_CALL_TIMEOUT_MS = 25_000;
  const unparsed = jobs.filter((j) => !j.jd_parsed_at && j.description && j.description.length >= 60);
  if (unparsed.length > 0) {
    const target = unparsed.slice(0, PARSE_CAP);
    console.log(`\n━━━ 3. Parsing ${target.length}/${unparsed.length} JDs (parallel ${PARALLEL}, timeout ${PER_CALL_TIMEOUT_MS}ms) ━━━`);
    let ok = 0, ghosts = 0, errs = 0, done = 0;

    const queue = [...target];
    const sample = target.slice(0, 3).map((j) => `[${j.companies?.slug}] ${j.title.slice(0, 48)}`).join("\n  ");
    console.log(`  Sample of what we'll parse:\n  ${sample}`);

    const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms: ${label}`)), ms)),
      ]);

    const worker = async () => {
      while (queue.length > 0) {
        const j = queue.shift();
        if (!j) return;
        try {
          const parsed = await withTimeout(
            parseJobDescription({
              title: j.title,
              description: j.description ?? "",
              seniority_hint: j.seniority,
            }),
            PER_CALL_TIMEOUT_MS,
            j.title.slice(0, 30),
          );
          const ghost = detectGhost({
            posted_at: j.posted_at,
            last_seen_at: j.last_seen_at,
            is_boilerplate: parsed.is_boilerplate,
            ghost_reasons: parsed.ghost_reasons,
            must_have_skills: parsed.must_have_skills,
          });
          if (ghost.is_likely_ghost) ghosts++;
          j.must_have_skills = parsed.must_have_skills;
          j.nice_to_have_skills = parsed.nice_to_have_skills;
          j.jd_min_years = parsed.jd_min_years;
          j.jd_max_years = parsed.jd_max_years;
          j.jd_seniority_signal = parsed.jd_seniority_signal;
          j.jd_summary = parsed.jd_summary;
          j.is_likely_ghost = ghost.is_likely_ghost;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("jobs") as any).update({
            must_have_skills: parsed.must_have_skills,
            nice_to_have_skills: parsed.nice_to_have_skills,
            jd_min_years: parsed.jd_min_years,
            jd_max_years: parsed.jd_max_years,
            work_mode: parsed.work_mode,
            jd_seniority_signal: parsed.jd_seniority_signal,
            jd_summary: parsed.jd_summary,
            is_likely_ghost: ghost.is_likely_ghost,
            ghost_signals: ghost.signals,
            jd_parsed_at: new Date().toISOString(),
          }).eq("id", j.id);
          ok++;
        } catch (e) {
          errs++;
          if (errs <= 5) console.log(`  err [${j.title.slice(0, 50)}]: ${(e as Error).message.split("\n")[0]}`);
        }
        done++;
        if (done % 10 === 0 || done === target.length) {
          console.log(`  progress: ${done}/${target.length} | ok=${ok} ghost=${ghosts} err=${errs}`);
        }
      }
    };

    await Promise.allSettled(Array.from({ length: PARALLEL }, worker));
    console.log(`Done. Parsed: ${ok}, ghost-flagged: ${ghosts}, errors: ${errs}`);
  } else {
    console.log("\n━━━ 3. All JDs already parsed ━━━");
  }

  // ── 4. Score every job ──────────────────────────────────────────────────────
  console.log("\n━━━ 4. Scoring ━━━");
  const profile = {
    target_role_functions: resume.target_role_functions,
    years_experience: resume.total_years_experience,
    tech_stack: resume.tech_stack,
    seniority: null as string | null, // not in resume_parsed; engine reads profile.seniority — fine for diagnostic
    preferred_hubs: resume.preferred_hubs ?? [],
    target_lpa: null as number | null,
  };

  const scored = jobs.map((job) => {
    const rules = computeRulesScore(profile, {
      title: job.title,
      description: job.description,
      role_function: job.role_function,
      min_experience_years: job.min_experience_years,
      max_experience_years: job.max_experience_years,
      jd_min_years: job.jd_min_years,
      jd_max_years: job.jd_max_years,
      tech_stack: job.tech_stack ?? [],
      must_have_skills: job.must_have_skills,
      nice_to_have_skills: job.nice_to_have_skills,
      seniority: job.seniority,
      jd_seniority_signal: job.jd_seniority_signal,
      hubs: job.hubs ?? [],
      comp_lpa_max: job.comp_lpa_max,
    });
    return { job, rules };
  }).sort((a, b) => b.rules.total - a.rules.total);

  const valid = scored.filter((s) => !s.rules.hardMismatch);
  const ghost = scored.filter((s) => s.job.is_likely_ghost);
  console.log(`Scored: ${scored.length} | hard-mismatch dropped: ${scored.length - valid.length} | ghost-flagged: ${ghost.length}`);

  // Distribution
  const dist = { strong: 0, stretch: 0, weak: 0 };
  for (const s of valid) {
    if (s.rules.total >= 75) dist.strong++;
    else if (s.rules.total >= 55) dist.stretch++;
    else dist.weak++;
  }
  console.log(`Distribution (rules total): strong ≥75: ${dist.strong}, stretch 55-74: ${dist.stretch}, weak <55: ${dist.weak}`);

  // ── 5. Print top 20 with breakdown ──────────────────────────────────────────
  console.log("\n━━━ 5. Top 20 valid matches ━━━");
  console.log("(score | role exp tech sen hub lpa | hardMM ghost | role_func | title @ company)");
  console.log("─".repeat(120));
  for (const { job, rules } of valid.slice(0, 20)) {
    const b = rules.breakdown;
    const ghostFlag = job.is_likely_ghost ? "G" : " ";
    const co = job.companies?.name ?? "?";
    const title = job.title.slice(0, 60);
    const rf = (job.role_function ?? "—").padEnd(20);
    console.log(
      `${String(rules.total).padStart(3)} | ${String(b.role).padStart(2)} ${String(b.experience).padStart(2)} ${String(b.tech).padStart(2)} ${String(b.seniority).padStart(2)} ${String(b.hub).padStart(1)} ${String(b.lpa).padStart(1)} | ${rules.hardMismatch ? "M" : " "} ${ghostFlag} | ${rf} | ${title} @ ${co}`,
    );
  }

  // ── 6. Top 5 hard-mismatches (sanity) ──────────────────────────────────────
  console.log("\n━━━ 6. Sample hard-mismatches (first 8) — should be obviously wrong ━━━");
  for (const { job, rules } of scored.filter((s) => s.rules.hardMismatch).slice(0, 8)) {
    console.log(`  rf=${(job.role_function ?? "?").padEnd(20)} ${rules.total} | ${job.title.slice(0, 70)} @ ${job.companies?.name}`);
  }

  // ── 7. Generate fit cards for top 5 valid + non-ghost + parsed ─────────────
  const fitCardCandidates = valid
    .filter((s) => !s.job.is_likely_ghost && s.job.jd_summary !== null)
    .slice(0, 5);

  console.log(`\n━━━ 7. Fit Cards for top ${fitCardCandidates.length} ━━━`);
  for (const { job, rules } of fitCardCandidates) {
    console.log(`\n┌── ${job.title} @ ${job.companies?.name} (rules=${rules.total})`);
    try {
      const card = await generateFitCard({
        resume,
        jd: {
          must_have_skills: job.must_have_skills ?? [],
          nice_to_have_skills: job.nice_to_have_skills ?? [],
          jd_min_years: job.jd_min_years,
          jd_max_years: job.jd_max_years,
          work_mode: null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jd_seniority_signal: (job.jd_seniority_signal as any) ?? null,
          jd_summary: job.jd_summary ?? "",
          is_boilerplate: false,
          ghost_reasons: [],
          role_function_jd: null,
          responsibilities: [],
          qualifications_required: [],
          qualifications_preferred: [],
          tech_stack_explicit: [],
          team_context: null,
        },
        job: {
          title: job.title, company: job.companies?.name ?? "?",
          seniority: job.seniority,
          comp_lpa_min: job.comp_lpa_min, comp_lpa_max: job.comp_lpa_max,
          role_function: job.role_function, location: job.location ?? "",
        },
        candidate: {
          target_lpa: null, current_lpa: resume.estimated_current_lpa ?? null,
          seniority: null, target_role_functions: resume.target_role_functions,
          years: resume.total_years_experience,
        },
      });
      console.log(`│  Verdict: ${card.verdict}`);
      console.log(`│  ${card.one_liner}`);
      if (card.hard_blockers.length) console.log(`│  HARD: ${card.hard_blockers.join(" · ")}`);
      if (card.soft_gaps.length) console.log(`│  SOFT: ${card.soft_gaps.join(" · ")}`);
      console.log(`│  Level: ${card.level_read.band} — ${card.level_read.note}`);
      for (const t of card.resume_tweaks) {
        console.log(`│  TWEAK[${t.priority}]: ${t.suggestion}`);
      }
    } catch (e) {
      console.log(`│  fit-card err: ${(e as Error).message.split("\n")[0]}`);
    }
  }

  console.log("\n━━━ Done ━━━\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
