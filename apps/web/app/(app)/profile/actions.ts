"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseResumePdf } from "@/lib/llm/prompts/resume-parse";
import { LlmRunError } from "@/lib/llm/gemini";
import { getUserConsents } from "@/lib/dpdp/consent";
import { computeResumeScore } from "@/lib/matching/resume-score";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { SeniorityLevel } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";

// Compute the live top-30 most-demanded skills across active jobs. Same
// algorithm as the Insights page; centralised here so resume-score reads from
// authoritative market signal rather than guesses.
async function fetchTop30Demand(admin: ReturnType<typeof createSupabaseAdminClient>): Promise<string[]> {
  const { data: rows } = await admin
    .from("jobs")
    .select("must_have_skills, tech_stack")
    .eq("is_active", true);
  const demand = new Map<string, number>();
  const norm = (s: string) =>
    s.toLowerCase().replace(/\s+/g, "").replace(/[.\-_]/g, "").replace(/js$/, "");
  for (const r of (rows as Array<{ must_have_skills: string[] | null; tech_stack: string[] | null }> | null) ?? []) {
    const seen = new Set<string>();
    // Prefer JD-parsed must-haves (high-quality signal); fall back to tech_stack
    const skills = (r.must_have_skills?.length ? r.must_have_skills : r.tech_stack) ?? [];
    for (const t of skills) {
      const c = norm(t);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      demand.set(c, (demand.get(c) ?? 0) + 1);
    }
  }
  return [...demand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([c]) => c);
}

export async function refreshResumeScore(): Promise<{ ok: true; score: number } | { ok: false; error: string }> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_parsed, target_role_functions")
    .eq("id", user.id)
    .maybeSingle();

  const parsed = (profile as { resume_parsed?: ParsedResume | null } | null)?.resume_parsed;
  if (!parsed) return { ok: false, error: "Upload a resume first." };

  const top30 = await fetchTop30Demand(admin);
  const result = computeResumeScore({
    resume: parsed,
    top30Demand: top30,
    userTargets: ((profile as { target_role_functions?: string[] | null } | null)?.target_role_functions) ?? [],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("profiles") as any).update({
    resume_score: result.score,
    resume_score_breakdown: result.breakdown as unknown as Json,
    resume_tips: result.tips as unknown as Json,
    resume_score_at: new Date().toISOString(),
  }).eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/matches");
  return { ok: true, score: result.score };
}

const INDIA_HUBS = ["Bengaluru", "Hyderabad", "Pune", "Gurugram", "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India"];

// ── Save profile fields (no resume) ──────────────────────────────────────────

export async function saveProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const displayName = (formData.get("display_name") as string).trim();
  const currentRole = (formData.get("current_role") as string).trim();
  const yearsRaw = formData.get("years_experience") as string;
  const currentLpaRaw = formData.get("current_lpa") as string;
  const targetLpaRaw = formData.get("target_lpa") as string;
  const techRaw = (formData.get("tech_stack") as string).trim();
  const hubs = INDIA_HUBS.filter((h) => formData.get(`hub_${h.replace(/\s+/g, "_")}`) === "on");
  const seniority = (formData.get("seniority") as string) || null;

  await supabase.from("profiles").upsert({
    id: user.id,
    display_name: displayName || null,
    current_role: currentRole || null,
    years_experience: yearsRaw ? parseInt(yearsRaw, 10) : null,
    current_lpa: currentLpaRaw ? parseFloat(currentLpaRaw) : null,
    target_lpa: targetLpaRaw ? parseFloat(targetLpaRaw) : null,
    tech_stack: techRaw ? techRaw.split(",").map((t) => t.trim()).filter(Boolean) : [],
    preferred_hubs: hubs,
    seniority: seniority as SeniorityLevel | null,
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
}

// ── Upload PDF and parse ──────────────────────────────────────────────────────

export type UploadResult =
  | { ok: true; dnaScore: number; role: string; years: number; techCount: number }
  | { ok: false; error: string; retryable?: boolean };

function friendlyParseError(err: unknown): { message: string; retryable: boolean } {
  if (err instanceof LlmRunError) {
    switch (err.detail.kind) {
      case "rate_limited":
        return {
          message: "We're a bit busy right now. Please try again in about a minute.",
          retryable: true,
        };
      case "quota_disabled":
        return {
          // limit:0 — the project running the resume parser is misconfigured.
          // Surface a clear, non-technical message; logs carry the underlying reason.
          message: "Resume processing is temporarily unavailable. Please try again later.",
          retryable: true,
        };
      case "auth":
        return {
          message: "Resume processing is temporarily unavailable. Please try again later.",
          retryable: false,
        };
      default:
        return {
          message: "We couldn't read your resume just now. Please try again.",
          retryable: true,
        };
    }
  }
  return {
    message: "We couldn't read your resume just now. Please try again.",
    retryable: true,
  };
}

export async function uploadAndParseResume(formData: FormData): Promise<UploadResult> {
  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  // Check matching consent
  const consents = await getUserConsents(user.id);
  if (!consents.matching) {
    return { ok: false, error: "Enable AI Matching consent in Settings → Privacy to use this feature." };
  }

  const file = formData.get("resume") as File | null;
  if (!file || file.type !== "application/pdf") {
    return { ok: false, error: "Please upload a PDF file." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ok: false, error: "File too large — max 5 MB." };
  }

  // Upload to Supabase Storage
  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const bytes = await file.arrayBuffer();
  const { error: storageError } = await admin.storage
    .from("resumes")
    .upload(path, bytes, { contentType: "application/pdf", upsert: false });
  if (storageError) return { ok: false, error: `Storage error: ${storageError.message}` };

  // Parse the PDF (with retry + key rotation + model fallback under the hood).
  let parsed;
  try {
    const base64 = Buffer.from(bytes).toString("base64");
    parsed = await parseResumePdf(base64);
  } catch (err) {
    // Clean up uploaded file on parse failure so re-upload doesn't accumulate
    // orphaned blobs in Storage.
    await admin.storage.from("resumes").remove([path]);

    // Log the raw provider error for ops; never surface it to the user.
    console.error("[resume-parse] failure", err instanceof LlmRunError ? err.detail : err);

    const { message, retryable } = friendlyParseError(err);
    return { ok: false, error: message, retryable };
  }

  // Delete old resume file if one exists
  const { data: profile } = await supabase
    .from("profiles")
    .select("resume_storage_path")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.resume_storage_path) {
    await admin.storage.from("resumes").remove([profile.resume_storage_path as string]);
  }

  // Update profile with parsed data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any).upsert({
    id: user.id,
    resume_storage_path: path,
    resume_parsed: parsed as unknown as Json,
    display_name: parsed.name || undefined,
    current_role: parsed.current_role || null,
    role_function: parsed.role_function || null,
    target_role_functions: parsed.target_role_functions ?? [],
    years_experience: Math.round(parsed.total_years_experience) || null,
    current_lpa: parsed.estimated_current_lpa ?? null,
    tech_stack: parsed.tech_stack ?? [],
    preferred_hubs: (parsed.preferred_hubs ?? []).filter((h: string) => INDIA_HUBS.includes(h)),
    product_dna_score: parsed.product_dna_score,
  });

  // Compute resume score immediately so the user sees the gauge on first save.
  // Runs against current market signal — cheap, no LLM call.
  try {
    const top30 = await fetchTop30Demand(admin);
    const score = computeResumeScore({
      resume: parsed,
      top30Demand: top30,
      userTargets: parsed.target_role_functions ?? [],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("profiles") as any).update({
      resume_score: score.score,
      resume_score_breakdown: score.breakdown as unknown as Json,
      resume_tips: score.tips as unknown as Json,
      resume_score_at: new Date().toISOString(),
    }).eq("id", user.id);
  } catch (err) {
    console.warn("[resume-score] post-upload compute failed", err);
  }

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");
  revalidatePath("/coach");
  revalidatePath("/insights");

  return {
    ok: true,
    dnaScore: parsed.product_dna_score,
    role: parsed.current_role,
    years: Math.round(parsed.total_years_experience),
    techCount: parsed.tech_stack.length,
  };
}
