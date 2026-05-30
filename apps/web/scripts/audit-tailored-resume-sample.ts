import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { extractText, getDocumentProxy } from "unpdf";
import { buildEvidenceBackedTailoredContent } from "../lib/resume-intel/tailored-content";
import { renderTailoredResumePdf } from "../lib/pdf/tailored-resume";
import type { BulletRewrite } from "../lib/llm/prompts/bullet-rewrite";
import type { ResumeDiagnosis } from "../lib/llm/prompts/resume-diagnose";
import type { ParsedResume } from "../lib/llm/prompts/resume-parse";

type MatchRow = { user_id: string; job_id: string; score: number };
type ProfileRow = {
  display_name: string | null;
  resume_parsed: ParsedResume | null;
  preferred_hubs: string[] | null;
};
type JobRow = {
  title: string;
  must_have_skills: string[] | null;
  nice_to_have_skills: string[] | null;
  companies: { name: string } | null;
};

const EMPTY_DIAGNOSIS: ResumeDiagnosis = {
  overall_grade: "B",
  headline: "Audit render without private LLM rewrite.",
  ats_risks: [],
  weak_bullets: [],
  missing_keywords: [],
  recruiter_concerns: [],
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars are not configured.");
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: matches, error } = await (admin
    .from("matches")
    .select("user_id, job_id, score")
    .order("score", { ascending: false })
    .limit(25) as any) as { data: MatchRow[] | null; error: Error | null };

  if (error) throw error;
  if (!matches?.length) {
    console.log(JSON.stringify({ ok: false, skipped: "no_matches" }));
    return;
  }

  for (const match of matches) {
    const [{ data: profile }, { data: job }] = await Promise.all([
      (admin
        .from("profiles")
        .select("display_name, resume_parsed, preferred_hubs")
        .eq("id", match.user_id)
        .maybeSingle() as any) as PromiseLike<{ data: ProfileRow | null }>,
      (admin
        .from("jobs")
        .select("title, must_have_skills, nice_to_have_skills, companies(name)")
        .eq("id", match.job_id)
        .maybeSingle() as any) as PromiseLike<{ data: JobRow | null }>,
    ]);

    if (!profile?.resume_parsed || !job) continue;

    const resume = profile.resume_parsed;
    const mustHaves = job.must_have_skills ?? [];
    const niceToHaves = job.nice_to_have_skills ?? [];
    const sourceText = JSON.stringify({
      current_role: resume.current_role,
      role_function: resume.role_function,
      summary: resume.summary,
      tech_stack: resume.tech_stack,
      products_built: resume.products_built,
      companies: resume.companies,
      education: resume.education,
    });

    const content = buildEvidenceBackedTailoredContent({
      resume,
      extracted: null,
      diagnosis: EMPTY_DIAGNOSIS,
      rewrites: {} as Record<string, BulletRewrite>,
      decisions: {},
      displayName: profile.display_name ?? resume.name,
      preferredHubs: profile.preferred_hubs ?? resume.preferred_hubs ?? [],
      jdTitle: job.title,
      jdMustHaves: mustHaves,
      jdNiceToHaves: niceToHaves,
      contact: {
        email: null,
        phone: resume.contact?.phone ?? null,
        linkedin_url: resume.contact?.linkedin_url ?? null,
        github_url: resume.contact?.github_url ?? null,
      },
    });

    const pdf = await renderTailoredResumePdf(content);
    await mkdir("tmp/pdfs", { recursive: true });
    const outputPath = join("tmp", "pdfs", "tailored-real-sample.pdf");
    await writeFile(outputPath, pdf);

    const proxy = await getDocumentProxy(new Uint8Array(pdf.buffer, pdf.byteOffset, pdf.byteLength));
    const raw = await extractText(proxy, { mergePages: true });
    const pdfText = Array.isArray(raw.text) ? raw.text.join("\n") : (raw.text ?? "");

    const supportedMustHaves = mustHaves.filter((skill) => containsTerm(sourceText, skill));
    const coveredSupported = supportedMustHaves.filter((skill) => containsTerm(pdfText, skill));
    const unsupportedMustHaves = mustHaves.filter((skill) => !containsTerm(sourceText, skill));
    const inventedUnsupported = unsupportedMustHaves.filter((skill) => containsTerm(pdfText, skill));

    console.log(JSON.stringify({
      ok: true,
      sample: "highest_scored_match_with_parsed_resume",
      company: job.companies?.name ?? null,
      job_title: job.title,
      match_score: Math.round(Number(match.score)),
      pdf_path: outputPath.replace(/\\/g, "/"),
      pdf_bytes: pdf.byteLength,
      must_haves_total: mustHaves.length,
      source_supported_must_haves: supportedMustHaves.length,
      pdf_covered_source_supported_must_haves: coveredSupported.length,
      pdf_invented_unsupported_must_haves: inventedUnsupported.length,
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({ ok: false, skipped: "no_profile_with_parsed_resume_and_match" }));
}

function containsTerm(text: string, term: string) {
  const haystack = normalise(text);
  const needle = normalise(term);
  return !!needle && haystack.includes(needle);
}

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#.]+/g, " ").replace(/\s+/g, " ").trim();
}

main().catch((err) => {
  console.error(JSON.stringify({
    ok: false,
    error: err instanceof Error ? err.message : "unknown",
  }));
  process.exitCode = 1;
});
