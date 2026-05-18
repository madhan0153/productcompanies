import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Sparkles, Shield, FileText } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUserConsents } from "@/lib/dpdp/consent";
import { getQuotaState } from "@/lib/resume-intel/quota";
import { EnhanceEntry } from "./entry";
import { EnhanceReview } from "./review";
import type { ResumeDiagnosis } from "@/lib/llm/prompts/resume-diagnose";
import type { BulletRewrite } from "@/lib/llm/prompts/bullet-rewrite";
import type { AtsScorecard } from "@/lib/matching/ats-scorecard";
import type { EnhancementDecision } from "../enhance-actions";

export const metadata: Metadata = { title: "Enhance my resume" };
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EnhancedRow {
  id: string;
  diagnosis: ResumeDiagnosis;
  rewrites: Record<string, BulletRewrite>;
  decisions: Record<string, EnhancementDecision>;
  ats_before: AtsScorecard;
  ats_after: AtsScorecard | null;
  status: "pending_review" | "finalised" | "discarded";
  generated_at: string;
  finalised_at: string | null;
}

export default async function EnhancePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase
    .from("profiles")
    .select("resume_storage_path, resume_signature, role_function")
    .eq("id", user.id)
    .maybeSingle() as any) as { data: { resume_storage_path: string | null; resume_signature: string | null; role_function: string | null } | null };

  const hasResume = !!profile?.resume_storage_path && !!profile.resume_signature;
  const consents = await getUserConsents(user.id);
  const consentGranted = consents.resume_intelligence === true;

  const admin = createSupabaseAdminClient();

  // Find the latest pending row for the current resume signature.
  let pending: EnhancedRow | null = null;
  if (hasResume) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin
      .from("enhanced_resumes")
      .select("id, diagnosis, rewrites, decisions, ats_before, ats_after, status, generated_at, finalised_at")
      .eq("user_id", user.id)
      .eq("source_resume_signature", profile!.resume_signature!)
      .eq("status", "pending_review")
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle() as any) as { data: EnhancedRow | null };
    pending = data;
  }

  const quota = await getQuotaState(user.id, "enhanced");

  return (
    <div className="space-y-4 pb-8">
      {/* Mobile-first top bar */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/profile"
          className="press tap-target-sm inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition hover:text-foreground focus-ring"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Profile
        </Link>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Shield className="h-3 w-3 text-success" aria-hidden />
          <span>{quota.used}/{quota.limit} used this month</span>
        </div>
      </div>

      <header>
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          <Sparkles className="h-5 w-5 text-primary" aria-hidden />
          Enhance my resume
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
          AI reviews your resume for ATS readability and bullet quality. Every change is shown
          to you before saving. <strong className="text-foreground/90">We never invent experience.</strong>
        </p>
      </header>

      {!hasResume && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warning">
            <FileText className="h-4 w-4" aria-hidden /> Upload your resume first
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            We need your parsed resume to run this enhancement.
          </p>
          <Link
            href="/profile"
            className="press tap-target-sm mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Go to profile
          </Link>
        </div>
      )}

      {hasResume && !consentGranted && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-4">
          <p className="text-sm font-semibold">Enable Resume Intelligence consent</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Toggle &quot;Resume Intelligence&quot; on under Settings → Privacy to use this feature.
            We only run the diagnosis when you click; nothing is automated.
          </p>
          <Link
            href="/settings/privacy"
            className="press tap-target-sm mt-3 inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Open Privacy settings
          </Link>
        </div>
      )}

      {hasResume && consentGranted && !pending && (
        <EnhanceEntry
          quotaUsed={quota.used}
          quotaLimit={quota.limit}
          quotaExhausted={quota.exhausted}
          roleFunction={profile?.role_function ?? null}
        />
      )}

      {hasResume && consentGranted && pending && (
        <EnhanceReview row={pending} />
      )}
    </div>
  );
}
