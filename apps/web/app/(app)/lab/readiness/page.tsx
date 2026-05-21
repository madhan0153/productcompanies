import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReadinessAssessmentForm } from "./assessment-form";

export const metadata: Metadata = { title: "Readiness check · Interview Lab" };
export const dynamic = "force-dynamic";

export default async function ReadinessPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Pull prior assessment to pre-fill, and target_role_function for default.
  const [{ data: prior }, { data: profile }] = await Promise.all([
    (supabase
      .from("interview_readiness")
      .select("assessment_answers, dsa_score, system_design_score, behavioral_score, domain_score, actions, target_role_function, updated_at")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: {
          assessment_answers: unknown;
          dsa_score: number;
          system_design_score: number;
          behavioral_score: number;
          domain_score: number;
          actions: unknown;
          target_role_function: string | null;
          updated_at: string;
        } | null;
      }>),
    (supabase
      .from("profiles")
      .select("target_role_functions, resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: { target_role_functions: string[] | null; resume_parsed: unknown } | null;
      }>),
  ]);

  if (!profile?.resume_parsed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <BackToLab />
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-medium text-amber-200">Upload your resume first.</p>
          <p className="mt-1 text-xs text-amber-200/80">
            The readiness check uses your parsed resume to anchor the scores.{" "}
            <Link href="/profile" className="underline underline-offset-4">Go to Profile</Link>.
          </p>
        </div>
      </div>
    );
  }

  const defaultRoleFunction =
    prior?.target_role_function ||
    profile?.target_role_functions?.[0] ||
    "backend";

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <BackToLab />
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Readiness check</h1>
        <p className="text-sm text-muted-foreground">
          12 quick questions. Mobile-friendly, ~2 minutes. We&apos;ll return 4 sub-scores + the one thing to do this week per dimension.
        </p>
      </header>
      <ReadinessAssessmentForm
        defaultRoleFunction={defaultRoleFunction}
        priorAnswers={(prior?.assessment_answers as Record<string, unknown> | null) ?? null}
        priorResult={
          prior
            ? {
                dsa_score: prior.dsa_score,
                system_design_score: prior.system_design_score,
                behavioral_score: prior.behavioral_score,
                domain_score: prior.domain_score,
                actions: (prior.actions as Array<{ dimension: string; headline: string; why: string; estimated_lift: number }>) ?? [],
                updated_at: prior.updated_at,
              }
            : null
        }
      />
    </div>
  );
}

function BackToLab() {
  return (
    <Link href="/lab" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-3 w-3" /> Back to Interview Lab
    </Link>
  );
}
