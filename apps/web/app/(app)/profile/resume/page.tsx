import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileJson, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonResumeSchema, type JsonResume } from "@prodmatch/shared";
import { parsedResumeToJson, emptyJsonResume } from "@/lib/resume/json-mapper";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import { ResumeEditor } from "./resume-editor";

export const metadata: Metadata = { title: "Resume editor" };
export const dynamic = "force-dynamic";

export default async function ResumeEditorPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await (supabase
    .from("profiles")
    .select("pending_resume_version_id, active_resume_version_id, matches_resume_version_id")
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{
      data: {
        pending_resume_version_id: string | null;
        active_resume_version_id: string | null;
        matches_resume_version_id: string | null;
      } | null;
    }>);
  const reviewVersionId = profile?.pending_resume_version_id ?? null;
  const activeResumeVersionId = profile?.active_resume_version_id ?? null;
  const matchesResumeVersionId = profile?.matches_resume_version_id ?? null;

  let versionQuery = supabase
    .from("resume_versions")
    .select("id, created_at, source, resume_parsed, resume_json")
    .eq("user_id", user.id);
  versionQuery = reviewVersionId
    ? versionQuery.eq("id", reviewVersionId).limit(1)
    : versionQuery.order("created_at", { ascending: false }).limit(1);

  const { data: latest } = await (versionQuery.maybeSingle() as unknown as Promise<{
    data: {
      id: string;
      created_at: string;
      source: string;
      resume_parsed: unknown;
      resume_json: unknown;
    } | null;
  }>);

  let initial: JsonResume;
  let derivedFrom: "json" | "parsed" | "empty";
  if (latest?.resume_json) {
    const parsed = JsonResumeSchema.safeParse(latest.resume_json);
    initial = parsed.success ? parsed.data : emptyJsonResume();
    derivedFrom = parsed.success ? "json" : "empty";
  } else if (latest?.resume_parsed) {
    initial = parsedResumeToJson(latest.resume_parsed as ParsedResume);
    derivedFrom = "parsed";
  } else {
    initial = emptyJsonResume();
    derivedFrom = "empty";
  }

  const isReview = Boolean(reviewVersionId && latest?.id === reviewVersionId);
  const needsCompute = Boolean(
    !isReview &&
    latest?.id &&
    activeResumeVersionId === latest.id &&
    activeResumeVersionId !== matchesResumeVersionId,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> {isReview ? "Review Parsed Resume" : "Resume Editor"}
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {isReview ? "Review & edit your parsed resume" : "Edit your resume"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isReview ? (
              "Check every section before it becomes your active matching profile. Matches stay on your previous resume until you submit."
            ) : (
              <>
                Fix any wrong parses inline. Import / export portable{" "}
                <a
                  href="https://jsonresume.org/schema/"
                  className="underline underline-offset-4 hover:text-primary"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <FileJson className="inline h-3 w-3 align-baseline" /> JSON Resume
                </a>{" "}
                documents. Multiple print-ready templates included.
              </>
            )}
          </p>
        </div>
      </header>

      <ResumeEditor
        initial={initial}
        derivedFrom={isReview ? "pending" : derivedFrom}
        mode={isReview ? "review" : "edit"}
        versionId={latest?.id ?? null}
        needsCompute={needsCompute}
      />
    </div>
  );
}
