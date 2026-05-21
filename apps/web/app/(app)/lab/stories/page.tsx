import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoryBankClient, type StoryRow } from "./story-bank-client";

export const metadata: Metadata = { title: "Story Bank · Interview Lab" };
export const dynamic = "force-dynamic";

export default async function StoryBankPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: stories }, { data: profile }] = await Promise.all([
    (supabase
      .from("interview_stories")
      .select("id, competency, title, situation, task, action, result, source_company, source_role, suggested_questions, is_starred, polished, updated_at")
      .eq("user_id", user.id)
      .order("is_starred", { ascending: false })
      .order("polished", { ascending: false })
      .order("created_at", { ascending: true }) as unknown as Promise<{
        data: StoryRow[] | null;
      }>),
    (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>),
  ]);

  const hasResume = Boolean(profile?.resume_parsed);

  if (!hasResume) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <BackToLab />
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-200">
            <AlertTriangle className="h-4 w-4" /> Upload your resume first
          </p>
          <p className="mt-1 text-xs text-amber-200/80">
            Story Bank reads your parsed resume to generate STAR stories.{" "}
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Story Bank</h1>
        <p className="text-sm text-muted-foreground">
          STAR stories generated from your resume. Tap any story to expand and edit. <strong>Save</strong> stores your edits;
          <strong> Polish</strong> asks AI to tighten the prose without changing the facts. Starred stories show first.
        </p>
      </header>

      <StoryBankClient initial={stories ?? []} />
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
