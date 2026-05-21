import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StudyPlan } from "@/lib/llm/prompts/interview-study-plan";
import { PlanClient, type DayProgressRow } from "./plan-client";

export const metadata: Metadata = { title: "Study Plan · Interview Lab" };
export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: planRow }, { data: progress }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>),
    (supabase
      .from("interview_study_plan")
      .select("weeks, target_companies, target_role_function, plan, start_date, generated_at")
      .eq("user_id", user.id)
      .maybeSingle() as unknown as Promise<{
        data: {
          weeks: number;
          target_companies: string[];
          target_role_function: string | null;
          plan: StudyPlan;
          start_date: string;
          generated_at: string;
        } | null;
      }>),
    (supabase
      .from("interview_study_day_progress")
      .select("day, dsa_done, story_rehearsed, system_design_done, mock_done, notes")
      .eq("user_id", user.id) as unknown as Promise<{
        data: DayProgressRow[] | null;
      }>),
  ]);

  if (!profile?.resume_parsed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <BackToLab />
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Upload your resume first
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Study Plan is personalised from your parsed resume + readiness scores.{" "}
            <Link href="/profile" className="underline underline-offset-4">Go to Profile</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <BackToLab />
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Study Plan</h1>
        <p className="text-sm text-muted-foreground">
          {planRow
            ? `Your ${planRow.weeks}-week plan, generated ${timeAgo(planRow.generated_at)}. Check off each day to keep your streak.`
            : "A day-by-day plan to lift your readiness scores, anchored to your resume."}
        </p>
      </header>
      <PlanClient
        existing={planRow}
        progress={progress ?? []}
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

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
