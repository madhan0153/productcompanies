import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheatsheetClient, type ExistingCheatsheet } from "./cheatsheet-client";

export const metadata: Metadata = { title: "Cheatsheets · Interview Lab" };
export const dynamic = "force-dynamic";

export default async function CheatsheetsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [{ data: profile }, { data: existing }] = await Promise.all([
    (supabase
      .from("profiles")
      .select("resume_parsed")
      .eq("id", user.id)
      .maybeSingle() as unknown as Promise<{ data: { resume_parsed: unknown } | null }>),
    (supabase
      .from("interview_company_cheatsheet")
      .select("company_slug, role_function, round_type, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }) as unknown as Promise<{
        data: ExistingCheatsheet[] | null;
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
            Cheatsheets are personalised from your parsed resume.{" "}
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
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cheatsheets</h1>
        <p className="text-sm text-muted-foreground">
          One-page interview cheatsheet for a specific company × round, anchored to your resume. Pick a row to generate or
          re-open a cached one.
        </p>
      </header>
      <CheatsheetClient existing={existing ?? []} />
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
