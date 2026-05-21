import { createClient } from "@supabase/supabase-js";
import { parseJobDescription, type ParsedJD } from "@/lib/llm/prompts/jd-parse";
import { buildJobEmbedText, embed } from "@/lib/llm/embed";
import { detectGhost } from "@/lib/matching/ghost";
import type { Json, SeniorityLevel } from "@/lib/supabase/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const APPROVED_SLUGS = new Set([
  "google",
  "microsoft",
  "meta",
  "amazon",
  "apple",
  "atlassian",
  "nvidia",
  "oracle",
  "salesforce",
  "sap-labs",
  "razorpay",
  "phonepe",
  "zerodha",
  "cred",
  "groww",
  "swiggy",
  "zomato",
  "flipkart",
]);

type JobRow = {
  id: string;
  title: string;
  description: string | null;
  seniority: SeniorityLevel | null;
  posted_at: string | null;
  last_seen_at: string | null;
  jd_parsed_at: string | null;
  embedding: number[] | null;
  embedding_at: string | null;
  jd_summary: string | null;
  must_have_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  jd_seniority_signal: SeniorityLevel | null;
  role_function_jd: string | null;
  responsibilities: string[] | null;
  team_context: string | null;
  companies: { slug: string; name: string } | null;
};

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const inline = process.argv.find((item) => item.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? (process.argv[idx + 1] ?? fallback) : fallback;
}

const limit = Math.max(1, Math.min(1000, Number(arg("limit", "100")) || 100));
const dryRun = process.argv.includes("--dry-run");

function parsedPatch(parsed: ParsedJD, job: JobRow, embedding: number[] | null): Record<string, unknown> {
  const ghost = detectGhost({
    posted_at: job.posted_at,
    last_seen_at: job.last_seen_at,
    is_boilerplate: parsed.is_boilerplate,
    ghost_reasons: parsed.ghost_reasons,
    must_have_skills: parsed.must_have_skills,
  });

  return {
    must_have_skills: parsed.must_have_skills,
    nice_to_have_skills: parsed.nice_to_have_skills,
    jd_min_years: parsed.jd_min_years,
    jd_max_years: parsed.jd_max_years,
    work_mode: parsed.work_mode,
    jd_seniority_signal: parsed.jd_seniority_signal,
    jd_summary: parsed.jd_summary,
    is_likely_ghost: ghost.is_likely_ghost,
    ghost_signals: ghost.signals as unknown as Json,
    role_function_jd: parsed.role_function_jd,
    responsibilities: parsed.responsibilities,
    qualifications_required: parsed.qualifications_required,
    qualifications_preferred: parsed.qualifications_preferred,
    tech_stack_explicit: parsed.tech_stack_explicit,
    team_context: parsed.team_context,
    jd_parsed_at: new Date().toISOString(),
    ...(embedding && embedding.length > 0
      ? { embedding, embedding_at: new Date().toISOString() }
      : {}),
  };
}

function shortDescriptionPatch(job: JobRow): Record<string, unknown> {
  return {
    jd_parsed_at: new Date().toISOString(),
    must_have_skills: [],
    nice_to_have_skills: [],
    ghost_signals: {
      reason: "description_too_short",
      source: "backfill_job_ai_signals",
    } as Json,
    ...(job.embedding_at ? {} : { embedding: null, embedding_at: null }),
  };
}

async function fetchBacklog(): Promise<JobRow[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id, title, description, seniority, posted_at, last_seen_at,
      jd_parsed_at, embedding, embedding_at, jd_summary,
      must_have_skills, nice_to_have_skills, jd_seniority_signal,
      role_function_jd, responsibilities, team_context,
      companies!inner(slug, name)
    `)
    .eq("is_active", true)
    .in("companies.slug", [...APPROVED_SLUGS])
    .or("jd_parsed_at.is.null,embedding_at.is.null,embedding.is.null")
    .limit(limit);

  if (error) throw new Error(error.message);
  return ((data as unknown as JobRow[]) ?? []).filter((job) => APPROVED_SLUGS.has(job.companies?.slug ?? ""));
}

async function countBacklog(): Promise<number> {
  const { count, error } = await supabase
    .from("jobs")
    .select("id, companies!inner(slug)", { count: "exact", head: true })
    .eq("is_active", true)
    .in("companies.slug", [...APPROVED_SLUGS])
    .or("jd_parsed_at.is.null,embedding_at.is.null,embedding.is.null");

  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function main() {
  const before = await countBacklog();
  const jobs = await fetchBacklog();
  let parsed = 0;
  let embedded = 0;
  let skippedShort = 0;
  let failed = 0;

  console.log(JSON.stringify({ event: "job_ai_backfill_start", backlog: before, batch: jobs.length, dryRun }));

  for (const job of jobs) {
    try {
      const needsParse = job.jd_parsed_at === null;
      const needsEmbedding = job.embedding_at === null || !job.embedding;

      if (!needsParse && !needsEmbedding) continue;

      if (!job.description || job.description.length < 60) {
        skippedShort++;
        if (!dryRun) {
          const { error } = await supabase.from("jobs").update(shortDescriptionPatch(job)).eq("id", job.id);
          if (error) throw new Error(error.message);
        }
        continue;
      }

      let parsedJd: ParsedJD | null = null;
      if (needsParse) {
        parsedJd = await parseJobDescription({
          title: job.title,
          description: job.description,
          seniority_hint: job.seniority,
        });
        parsed++;
      }

      const embeddingInput = parsedJd
        ? {
            title: job.title,
            company: job.companies?.name,
            jd_summary: parsedJd.jd_summary,
            must_have_skills: parsedJd.must_have_skills,
            nice_to_have_skills: parsedJd.nice_to_have_skills,
            description: job.description,
            jd_seniority_signal: parsedJd.jd_seniority_signal,
            role_function: parsedJd.role_function_jd,
            responsibilities: parsedJd.responsibilities,
            team_context: parsedJd.team_context,
          }
        : {
            title: job.title,
            company: job.companies?.name,
            jd_summary: job.jd_summary,
            must_have_skills: job.must_have_skills,
            nice_to_have_skills: job.nice_to_have_skills,
            description: job.description,
            jd_seniority_signal: job.jd_seniority_signal,
            role_function: job.role_function_jd,
            responsibilities: job.responsibilities,
            team_context: job.team_context,
          };

      const vector = needsEmbedding
        ? await embed(buildJobEmbedText(embeddingInput), "job_embedding")
        : null;
      if (vector && vector.length > 0) embedded++;

      if (!dryRun) {
        const patch = parsedJd
          ? parsedPatch(parsedJd, job, vector)
          : vector && vector.length > 0
            ? { embedding: vector, embedding_at: new Date().toISOString() }
            : {};
        const { error } = await supabase.from("jobs").update(patch).eq("id", job.id);
        if (error) throw new Error(error.message);
      }

      console.log(JSON.stringify({
        event: "job_ai_backfill_row_ok",
        job_id: job.id,
        company: job.companies?.slug,
        parsed: needsParse,
        embedded: needsEmbedding && Boolean(vector?.length),
      }));
    } catch (err) {
      failed++;
      console.log(JSON.stringify({
        event: "job_ai_backfill_row_failed",
        job_id: job.id,
        company: job.companies?.slug,
        error: err instanceof Error ? err.name : "unknown",
      }));
    }
  }

  const after = dryRun ? before : await countBacklog();
  console.log(JSON.stringify({
    event: "job_ai_backfill_done",
    before,
    after,
    parsed,
    embedded,
    skipped_short: skippedShort,
    failed,
    dryRun,
  }));
}

main().catch((err) => {
  console.error(JSON.stringify({
    event: "job_ai_backfill_fatal",
    error: err instanceof Error ? err.message : String(err),
  }));
  process.exit(1);
});
