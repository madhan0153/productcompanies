import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Sparkles, Shield } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { getQuotaState } from "@/lib/resume-intel/quota";
import { computeAtsScorecard } from "@/lib/matching/ats-scorecard";
import { TailorEntry } from "./entry";
import { TailorReview } from "./review";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { BulletRewrite, RewriteMode } from "@/lib/llm/prompts/bullet-rewrite";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import type { EnhancementDecision } from "../tailor-actions";

export const metadata: Metadata = { title: "Tailor for this role" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function TailorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const consents = await getUserConsents(user.id);
  const intelConsent = consents.resume_intelligence === true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_signature, resume_parsed, role_function")
    .eq("id", user.id)
    .maybeSingle() as any) as {
      data: {
        resume_storage_path: string | null;
        resume_signature: string | null;
        resume_parsed: ParsedResume | null;
        role_function: string | null;
      } | null;
    };

  const hasResume = !!profile?.resume_storage_path && !!profile.resume_signature && !!profile.resume_parsed;

  const admin = createSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (admin
    .from("jobs")
    .select("id, title, must_have_skills, companies(name)")
    .eq("id", id)
    .maybeSingle() as any) as {
      data: { id: string; title: string; must_have_skills: string[] | null; companies: { name: string } | null } | null;
    };
  if (!job) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin
    .from("tailored_resumes")
    .select("id, status, mode, diagnosis, rewrites, decisions")
    .eq("user_id", user.id)
    .eq("job_id", id)
    .maybeSingle() as any) as {
      data: {
        id: string;
        status: "pending_review" | "finalised" | "discarded";
        mode: "polish" | "tailor" | null;
        diagnosis: ResumeDiagnosis | null;
        rewrites: Record<string, BulletRewrite> | null;
        decisions: Record<string, EnhancementDecision> | null;
      } | null;
    };

  const pending = row?.status === "pending_review" && row.diagnosis ? row : null;

  const quota = await getQuotaState(user.id, "tailored");

  // Synthesise resume text from parsed JSON for the deterministic ATS
  // scorecard — the profiles table has no raw resume_text column.
  const resumeText = profile?.resume_parsed
    ? [
        profile.resume_parsed.summary ?? "",
        (profile.resume_parsed.tech_stack ?? []).join(", "),
        (profile.resume_parsed.products_built ?? []).join("\n"),
        (profile.resume_parsed.companies ?? []).map((c) => `${c.role ?? ""} — ${c.name}`).join("\n"),
      ].join("\n")
    : "";

  const ats_before = hasResume && profile?.resume_parsed
    ? computeAtsScorecard({
        resume:        profile.resume_parsed,
        resume_text:   resumeText,
        role_function: profile.role_function ?? null,
        // JD must-haves drive the keyword-density axis for the tailored
        // flow — much sharper signal than the role-function default pool.
        required_keywords: job.must_have_skills ?? [],
      })
    : null;

  return (
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/jobs/${id}`}
          className="press tap-target-sm inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition hover:text-foreground focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to role
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3 w-3 text-success" aria-hidden />
          <span>{quota.used}/{quota.limit} this month</span>
        </div>
      </div>

      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {job.companies?.name ?? "—"} · Tailor resume
        </p>
        <h1 className="mt-0.5 flex items-center gap-2 text-lg font-semibold leading-tight sm:text-xl">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <span className="truncate">{job.title}</span>
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          AI surfaces JD-relevant signal in your resume. You approve every change.{" "}
          <strong className="text-foreground/90">We never invent experience.</strong>
        </p>
      </header>

      {!hasResume && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="text-sm font-semibold text-warning">Upload your resume first</p>
          <Link
            href="/profile"
            className="press tap-target-sm mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Go to profile
          </Link>
        </div>
      )}

      {hasResume && !intelConsent && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
          <p className="text-sm font-semibold">Enable Resume Intelligence consent</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            One toggle in Privacy settings — we only run on your click.
          </p>
          <Link
            href="/settings/privacy"
            className="press tap-target-sm mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Open Privacy settings
          </Link>
        </div>
      )}

      {hasResume && intelConsent && !pending && (
        <TailorEntry
          jobId={id}
          quotaUsed={quota.used}
          quotaLimit={quota.limit}
          quotaExhausted={quota.exhausted}
          mustHaves={job.must_have_skills ?? []}
        />
      )}

      {hasResume && intelConsent && pending && ats_before && (
        <TailorReview
          jobId={id}
          rowId={pending.id}
          mode={(pending.mode ?? "polish") as RewriteMode}
          diagnosis={pending.diagnosis!}
          rewrites={pending.rewrites ?? {}}
          decisions={pending.decisions ?? {}}
          atsBefore={ats_before}
        />
      )}
    </div>
  );
}
