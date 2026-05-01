import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, ExternalLink, MessageSquare, Trash2, Sparkles, Pencil,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { addInterviewNote, deleteInterviewNote, updateStatus } from "../actions";

export const metadata: Metadata = { title: "Application detail" };

type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
const STATUS_TABS: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];

const STATUS_COLORS: Record<AppStatus, string> = {
  saved: "bg-sky-400/10 text-sky-400 border-sky-400/20",
  applied: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  interviewing: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  offer: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rejected: "bg-rose-400/10 text-rose-400 border-rose-400/20",
  withdrawn: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

type AppRow = {
  id: string;
  status: AppStatus;
  applied_at: string | null;
  notes: string | null;
  next_action_at: string | null;
  created_at: string;
  job_id: string;
  jobs: {
    id: string;
    title: string;
    apply_url: string | null;
    location: string | null;
    tech_stack: string[] | null;
    seniority: string | null;
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
};

type StoryRow = {
  id: string;
  title: string;
  situation: string | null;
  task: string | null;
  action: string | null;
  result: string | null;
  tags: string[] | null;
};

function tokenise(s: string): Set<string> {
  return new Set(
    s.toLowerCase().match(/[a-z][a-z0-9+]{2,}/g) ?? [],
  );
}

// Score relevance of a story to a job's signals (title + tech_stack + seniority).
// Pure heuristic — no LLM call. Returns a 0..N score plus the matching tokens.
function scoreStoryRelevance(
  story: StoryRow,
  signals: { title: string; tech: string[]; seniority: string | null },
): { score: number; reasons: string[] } {
  const haystack = [
    story.title, ...(story.tags ?? []),
    story.situation ?? "", story.task ?? "", story.action ?? "", story.result ?? "",
  ].join(" ");
  const storyTokens = tokenise(haystack);

  const reasons: string[] = [];
  let score = 0;

  for (const t of signals.tech) {
    if (storyTokens.has(t.toLowerCase())) {
      score += 3;
      reasons.push(t);
    }
  }
  for (const t of tokenise(signals.title)) {
    if (storyTokens.has(t)) score += 1;
  }
  if (signals.seniority && storyTokens.has(signals.seniority.toLowerCase())) {
    score += 2;
    reasons.push(signals.seniority);
  }

  return { score, reasons: [...new Set(reasons)].slice(0, 4) };
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;

  // Join through jobs directly so we don't depend on matches existing.
  const [{ data: rawApp }, { data: rawNotes }, { data: rawStories }] = await Promise.all([
    supabase.from("applications")
      .select(`
        id, status, applied_at, notes, next_action_at, created_at, job_id,
        jobs ( id, title, apply_url, location, tech_stack, seniority,
               companies (name, slug, logo_url) )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("interview_notes")
      .select("id, round, interviewer, notes, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("stories")
      .select("id, title, situation, task, action, result, tags")
      .eq("user_id", user.id),
  ]);

  const app = rawApp as unknown as AppRow | null;
  const notes = rawNotes ?? [];
  const stories = (rawStories as StoryRow[] | null) ?? [];

  if (!app) notFound();

  const job = app.jobs;
  const company = job?.companies;
  const appStatus = app.status;

  // Rank stories by relevance to this role
  const ranked = job
    ? stories
        .map((s) => ({
          story: s,
          ...scoreStoryRelevance(s, {
            title: job.title,
            tech: job.tech_stack ?? [],
            seniority: job.seniority,
          }),
        }))
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
    : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition focus-ring rounded">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card/50 p-6 elev-1 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={48} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{company?.name ?? "Unknown company"}</span>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[appStatus]}`}>
                  {appStatus}
                </span>
              </div>
              <h1 className="font-display text-xl font-semibold leading-tight">
                {job?.id ? (
                  <Link href={`/jobs/${job.id}`} className="hover:text-primary transition">
                    {job.title}
                  </Link>
                ) : "Role no longer listed"}
              </h1>
              {job?.location && (
                <p className="text-xs text-muted-foreground">{job.location}</p>
              )}
            </div>
          </div>
          {job?.apply_url && (
            <a
              href={job.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="press inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Apply
            </a>
          )}
        </div>

        {app.notes && (
          <p className="mt-3 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
            {app.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {app.applied_at && <span>Applied {formatDate(app.applied_at)}</span>}
          {app.next_action_at && (
            <span className="text-amber-400">Follow-up: {formatDate(app.next_action_at)}</span>
          )}
        </div>

        {/* Status change */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <span className="text-xs text-muted-foreground">Move to:</span>
          {STATUS_TABS.filter((s) => s !== appStatus).map((s) => (
            <form key={s} action={updateStatus}>
              <input type="hidden" name="app_id" value={app.id} />
              <input type="hidden" name="status" value={s} />
              <button
                type="submit"
                className="press rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Interview prep — STAR stories that may fit */}
      {ranked.length > 0 && (
        <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 via-card/40 to-card/40 p-6">
          <header className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <h2 className="font-display text-sm font-semibold">Stories that may fit this role</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Picked from your Story Bank based on the job&apos;s tech, title, and seniority.
                </p>
              </div>
            </div>
            <Link href="/stories" className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition">
              All stories →
            </Link>
          </header>
          <ul className="space-y-2">
            {ranked.map(({ story, reasons }) => (
              <li key={story.id}>
                <Link
                  href={`/stories?highlight=${story.id}`}
                  className="group flex items-start gap-3 rounded-xl border border-border bg-card/50 p-3 transition hover:border-primary/30 hover:bg-card/80"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Pencil className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{story.title}</p>
                    {reasons.length > 0 && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        Matches:
                        {reasons.map((r) => (
                          <span key={r} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            {r}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Interview notes */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Interview notes ({notes.length})
        </h2>

        <form action={addInterviewNote} className="mb-5 space-y-3 rounded-xl border border-border bg-secondary/30 p-4">
          <input type="hidden" name="app_id" value={app.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Round</label>
              <input
                name="round"
                placeholder="e.g. HR Screen"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Interviewer</label>
              <input
                name="interviewer"
                placeholder="Name / LinkedIn"
                className="w-full rounded-lg border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Questions asked, feedback, next steps…"
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="press rounded-xl bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 focus-ring"
          >
            Add note
          </button>
        </form>

        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="group rounded-xl border border-border bg-card/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    {(note.round || note.interviewer) && (
                      <p className="text-xs font-medium">
                        {note.round && <span className="text-primary">{note.round}</span>}
                        {note.round && note.interviewer && <span className="text-muted-foreground"> · </span>}
                        {note.interviewer && <span className="text-muted-foreground">{note.interviewer}</span>}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(note.created_at)}
                    </p>
                  </div>
                  <form action={deleteInterviewNote}>
                    <input type="hidden" name="note_id" value={note.id} />
                    <input type="hidden" name="app_id" value={app.id} />
                    <button
                      type="submit"
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-ring"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
                {note.notes && (
                  <p className="mt-2 text-sm text-foreground/80 whitespace-pre-wrap">{note.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No notes yet — add your first above.</p>
        )}
      </div>
    </div>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" });
  } catch { return ""; }
}
