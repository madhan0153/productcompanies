import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileJson, Sparkles } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { JsonResumeSchema, type JsonResume } from "@prodmatch/shared";
import { parsedResumeToJson, emptyJsonResume } from "@/lib/resume/json-mapper";
import type { ParsedResume } from "@/lib/llm/prompts/resume-parse";
import { ResumeEditor } from "./resume-editor";

// Reactive-Resume-inspired structured editor for JSON Resume documents.
// See /NOTICE.md.

export const metadata: Metadata = { title: "Resume editor" };
export const dynamic = "force-dynamic";

export default async function ResumeEditorPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  // Load the latest resume version. Two paths converge on a valid JsonResume:
  //   - row.resume_json present  → re-validate (schema), fall back to empty on failure.
  //   - row.resume_parsed only   → map from ParsedResume.
  //   - no row                   → empty shell so the editor renders cleanly.
  // Cast as any: generated Supabase types don't yet know about resume_json.
  const { data: latest } = await (supabase
    .from("resume_versions")
    .select("id, created_at, source, resume_parsed, resume_json")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle() as unknown as Promise<{
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

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/40 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Resume Editor
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">Edit your resume</h1>
          <p className="text-sm text-muted-foreground">
            Fix any wrong parses inline. Import / export portable{" "}
            <a
              href="https://jsonresume.org/schema/"
              className="underline underline-offset-4 hover:text-primary"
              target="_blank" rel="noreferrer noopener"
            >
              <FileJson className="inline h-3 w-3 align-baseline" /> JSON Resume
            </a>{" "}
            documents. Multiple print-ready templates included.
          </p>
        </div>
      </header>

      <ResumeEditor initial={initial} derivedFrom={derivedFrom} />
    </div>
  );
}
