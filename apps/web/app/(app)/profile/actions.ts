"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { createHash } from "node:crypto";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseResumePdf } from "@/lib/llm/prompts/resume-parse";
import { LlmRunError } from "@/lib/llm/gemini";
import { getUserConsents } from "@/lib/dpdp/consent";
import { computeResumeScore } from "@/lib/matching/resume-score";
import { computeDnaBreakdown } from "@/lib/matching/dna-breakdown";
import { snapshotCurrentResume } from "@/lib/matching/resume-versions";
import { embed, buildResumeEmbedText } from "@/lib/llm/embed";
import { enqueueUserRecompute } from "@/lib/queue/recompute";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { SeniorityLevel } from "@/lib/supabase/types";
import type { Json } from "@/lib/supabase/types";

// Content-only signature for the parsed resume — drives the Fit-Card cache.
// Fields chosen to match what the Fit Card prompt reads. Stable across PDF
// re-uploads if the underlying content is identical; flips immediately when
// the user actually edits role, years, stack, or projects.
function computeResumeSignature(parsed: ParsedResume): string {
  const stable = JSON.stringify({
    role_function:          parsed.role_function ?? "",
    target_role_functions:  [...(parsed.target_role_functions ?? [])].sort(),
    total_years_experience: Math.round((parsed.total_years_experience ?? 0) * 10) / 10,
    tech_stack:             [...(parsed.tech_stack ?? [])].map((s) => s.toLowerCase().trim()).sort(),
    companies:              (parsed.companies ?? []).map((c) => ({
                              name: (c.name ?? "").toLowerCase().trim(),
                              role: (c.role ?? "").toLowerCase().trim(),
                              years: Math.round((c.years ?? 0) * 10) / 10,
                              is_product_company: Boolean(c.is_product_company),
                            })),
    products_built:         [...(parsed.products_built ?? [])].map((s) => s.trim()).sort(),
    summary:                (parsed.summary ?? "").trim(),
  });
  return createHash("sha256").update(stable).digest("hex");
}

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
  // Recompute DNA breakdown too — both derive from the same parsed resume, so
  // a manual refresh keeps them in lock-step. resume_signature stays stable
  // (parsed content unchanged), so cached Fit Cards remain valid.
  const dna = computeDnaBreakdown(parsed);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("profiles") as any).update({
    resume_score: result.score,
    resume_score_breakdown: result.breakdown as unknown as Json,
    resume_tips: result.tips as unknown as Json,
    resume_score_at: new Date().toISOString(),
    product_dna_score: dna.total,
    dna_breakdown: dna as unknown as Json,
  }).eq("id", user.id);

  revalidatePath("/profile");
  revalidatePath("/dashboard");
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
  // Sprint 4 Item 26 — empty / near-empty PDFs are usually scan-failures or
  // accidental empty exports. The Gemini PDF parser returns generic errors
  // on them; catch upfront with a friendlier message.
  if (file.size < 4 * 1024) {
    return { ok: false, error: "PDF is too small to be a real resume — re-export and try again." };
  }

  // Upload to Supabase Storage
  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const bytes = await file.arrayBuffer();
  // Light header check — every valid PDF starts with "%PDF-" within the first
  // few bytes. Catches "renamed .docx as .pdf" and similar mistakes.
  const head = new Uint8Array(bytes.slice(0, 5));
  const headStr = String.fromCharCode(...head);
  if (!headStr.startsWith("%PDF-")) {
    return { ok: false, error: "File doesn't look like a real PDF. Re-export from your resume tool and try again." };
  }
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

  // Sprint 2 Item 8 — snapshot the existing parsed profile before we overwrite
  // it, so the user can revert. Pull the columns we need; if any is missing
  // (first-ever upload) we simply skip the snapshot.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_parsed, product_dna_score, dna_breakdown, resume_signature")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: {
      resume_storage_path: string | null;
      resume_parsed: unknown;
      product_dna_score: number | null;
      dna_breakdown: unknown | null;
      resume_signature: string | null;
    } | null };

  if (profile?.resume_parsed) {
    await snapshotCurrentResume(admin, {
      userId:              user.id,
      resume_parsed:       profile.resume_parsed,
      resume_storage_path: profile.resume_storage_path,
      product_dna_score:   profile.product_dna_score,
      dna_breakdown:       profile.dna_breakdown,
      resume_signature:    profile.resume_signature,
      source:              "overwrite",
    });
  }

  // Delete old resume file if one exists
  if (profile?.resume_storage_path) {
    await admin.storage.from("resumes").remove([profile.resume_storage_path as string]);
  }

  // Deterministic DNA breakdown — no LLM, transparent. Replaces the opaque
  // single integer from the parser with a 4-axis structure the user can
  // audit on the dashboard + profile.
  const dnaBreakdown = computeDnaBreakdown(parsed);

  // Content signature — used by the Fit-Card cache to skip Gemini calls
  // when neither the resume nor the JD have changed since the cached card.
  const resumeSignature = computeResumeSignature(parsed);

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
    // product_dna_score is now the deterministic sum of the visible axes —
    // a single source of truth. The Gemini-supplied number is discarded.
    product_dna_score: dnaBreakdown.total,
    dna_breakdown: dnaBreakdown as unknown as Json,
    resume_signature: resumeSignature,
  });

  // ── EARLY RESPONSE — everything below runs after the response is flushed.
  // Why: the resume score / embedding / market-demand calls add another
  // 4-8s to the request. On a cold start (dev compile or Vercel) the total
  // blocking time can exceed the client's patience and the user sees
  // "Something went wrong / unexpected response from server". By deferring
  // to after() we keep the response under ~15s on a warm path and ~30s on
  // a cold path — both well within the 60s maxDuration.
  //
  // What the user sees immediately: parse succeeded, profile populated,
  // DNA + role + years all rendered. Score gauge + embedding land within
  // a few seconds in the background; matches auto-recompute via the
  // existing enqueue facade.
  after(async () => {
    // 1. Resume score against current market signal (cheap, no LLM).
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

    // 2. Phase I — embed the resume for semantic JD↔resume alignment at
    //    match time. One Gemini text-embedding-004 call; soft-fail on 429.
    try {
      const resumeEmbedding = await embed(buildResumeEmbedText(parsed));
      if (resumeEmbedding.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from("profiles") as any).update({
          resume_embedding: resumeEmbedding,
          resume_embedding_at: new Date().toISOString(),
        }).eq("id", user.id);
      }
    } catch (err) {
      console.warn("[resume-embed] post-upload embed failed", err);
    }

    // 3. Path revalidations — invalidate cached pages so the next nav
    //    sees the new resume/score.
    revalidatePath("/profile");
    revalidatePath("/dashboard");
    revalidatePath("/matches");
    revalidatePath("/coach");
    revalidatePath("/insights");
  });

  // Sprint 4 Item 13 — match recompute already runs via after() inside
  // enqueueUserRecompute. Triggered immediately; doesn't add to response time.
  enqueueUserRecompute(user.id, { forceFull: true, source: "resume_upload" });

  return {
    ok: true,
    dnaScore: parsed.product_dna_score,
    role: parsed.current_role,
    years: Math.round(parsed.total_years_experience),
    techCount: parsed.tech_stack.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sprint 2 Item 8 — list versions + revert action.
// ─────────────────────────────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RevertResult =
  | { ok: true; revertedAt: string }
  | { ok: false; error: string };

export async function revertResumeToVersion(versionId: string): Promise<RevertResult> {
  if (!UUID_RE.test(versionId)) return { ok: false, error: "Invalid version id." };

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // 1. Load the target snapshot (RLS scoped to user via select policy).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: snap, error: snapErr } = await (admin
    .from("resume_versions")
    .select("id, user_id, resume_parsed, resume_storage_path, product_dna_score, dna_breakdown, resume_signature")
    .eq("id", versionId)
    .eq("user_id", user.id)
    .maybeSingle() as any) as { data: {
      id: string;
      user_id: string;
      resume_parsed: ParsedResume;
      resume_storage_path: string | null;
      product_dna_score: number | null;
      dna_breakdown: unknown | null;
      resume_signature: string | null;
    } | null; error: { message: string } | null };
  if (snapErr)  return { ok: false, error: snapErr.message };
  if (!snap)    return { ok: false, error: "Snapshot not found." };

  // 2. Snapshot the CURRENT state before we overwrite it (so revert is undoable).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: current } = await (admin
    .from("profiles")
    .select("resume_parsed, resume_storage_path, product_dna_score, dna_breakdown, resume_signature")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: {
      resume_parsed: unknown;
      resume_storage_path: string | null;
      product_dna_score: number | null;
      dna_breakdown: unknown | null;
      resume_signature: string | null;
    } | null };

  if (current?.resume_parsed) {
    await snapshotCurrentResume(admin, {
      userId:              user.id,
      resume_parsed:       current.resume_parsed,
      resume_storage_path: current.resume_storage_path,
      product_dna_score:   current.product_dna_score,
      dna_breakdown:       current.dna_breakdown,
      resume_signature:    current.resume_signature,
      source:              "manual_revert",
    });
  }

  // 3. Restore. NB: resume_storage_path may point to a PDF that was already
  //    deleted in Sprint-2 Item-8 flows (we currently nuke prior PDFs on
  //    re-upload). We still restore the parsed JSON + score so matching
  //    works; the user can re-upload the PDF later if they want it back.
  const restored = snap.resume_parsed;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updErr } = await (admin.from("profiles") as any).update({
    resume_parsed:         restored as unknown as Json,
    resume_storage_path:   snap.resume_storage_path,
    product_dna_score:     snap.product_dna_score,
    dna_breakdown:         snap.dna_breakdown as Json | null,
    resume_signature:      snap.resume_signature,
    // Mirror the convenience fields the parser otherwise sets directly.
    role_function:         restored.role_function ?? null,
    target_role_functions: restored.target_role_functions ?? [],
    years_experience:      Math.round(restored.total_years_experience ?? 0) || null,
    current_role:          restored.current_role ?? null,
    tech_stack:            restored.tech_stack ?? [],
    preferred_hubs:        (restored.preferred_hubs ?? []).filter((h: string) => INDIA_HUBS.includes(h)),
  }).eq("id", user.id);
  if (updErr) return { ok: false, error: updErr.message };

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  revalidatePath("/matches");

  return { ok: true, revertedAt: new Date().toISOString() };
}

export type ResumeVersionLite = {
  id: string;
  product_dna_score: number | null;
  source: "overwrite" | "manual_revert";
  created_at: string;
  current_role: string | null;
  total_years_experience: number | null;
};

export async function listResumeVersions(): Promise<ResumeVersionLite[]> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase
    .from("resume_versions")
    .select("id, product_dna_score, source, created_at, resume_parsed")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10) as any) as { data: Array<{
      id: string;
      product_dna_score: number | null;
      source: "overwrite" | "manual_revert";
      created_at: string;
      resume_parsed: { current_role?: string | null; total_years_experience?: number | null } | null;
    }> | null };

  return (data ?? []).map((r) => ({
    id:                     r.id,
    product_dna_score:      r.product_dna_score,
    source:                 r.source,
    created_at:             r.created_at,
    current_role:           r.resume_parsed?.current_role ?? null,
    total_years_experience: r.resume_parsed?.total_years_experience ?? null,
  }));
}
