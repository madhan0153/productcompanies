import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import {
  ArrowLeft, ExternalLink, MessageSquare, Trash2, Sparkles, Pencil,
} from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { SectionCard } from "@/components/section-card";
import { addInterviewNote, deleteInterviewNote, updateStatus } from "../actions";

export const metadata: Metadata = { title: "Application detail" };

type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";
const STATUS_TABS: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];

const STATUS_TONE: Record<AppStatus, string> = {
  saved:        "bg-primary-soft text-primary-soft-foreground border-primary/20",
  applied:      "bg-primary-soft text-primary-soft-foreground border-primary/20",
  interviewing: "bg-warning/10 text-warning border-warning/20",
  offer:        "bg-success/10 text-success border-success/20",
  rejected:     "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn:    "bg-muted text-muted-foreground border-border",
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
    <div className="mx-auto max-w-3xl space-y-5 pb-6">
      <Link href="/applications" className="inline-flex items-center gap-1.5 rounded text-sm text-muted-foreground transition hover:text-foreground focus-ring">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-start gap-3">
            <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={48} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">{company?.name ?? "Unknown company"}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TONE[appStatus]}`}>
                  {appStatus}
                </span>
              </div>
              <h1 className="text-xl font-semibold leading-tight">
                {job?.id ? (
                  <Link href={`/jobs/${job.id}`} className="transition hover:text-primary focus-ring rounded">
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
              className="press tap-target inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Apply
            </a>
          )}
        </div>

        {app.notes && (
          <p className="mt-4 rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
            {app.notes}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {app.applied_at && <span>Applied {formatDate(app.applied_at)}</span>}
          {app.next_action_at && (
            <span className="text-warning">Follow-up: {formatDate(app.next_action_at)}</span>
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
                className="press tap-target-sm rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize transition hover:border-primary/40 hover:text-foreground focus-ring"
              >
                {s}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Interview prep — STAR stories that may fit */}
      {ranked.length > 0 && (
        <SectionCard
          title="Stories that may fit this role"
          subtitle="Picked from your story library by tech, title, and seniority"
          icon={<Sparkles className="h-4 w-4" />}
        >
          <ul className="space-y-2">
            {ranked.map(({ story, reasons }) => (
              <li key={story.id}>
                <div className="group flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3 transition hover:border-primary/30 hover:bg-secondary">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{story.title}</p>
                    {reasons.length > 0 && (
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        Matches:
                        {reasons.map((r) => (
                          <span key={r} className="rounded bg-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-primary-soft-foreground">
                            {r}
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {/* Interview notes */}
      <SectionCard
        title={`Interview notes (${notes.length})`}
        icon={<MessageSquare className="h-4 w-4" />}
      >
        <form action={addInterviewNote} className="mb-5 space-y-3 rounded-lg border border-border bg-secondary/30 p-4">
          <input type="hidden" name="app_id" value={app.id} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Round</label>
              <input
                name="round"
                placeholder="e.g. HR Screen"
                className="tap-target w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Interviewer</label>
              <input
                name="interviewer"
                placeholder="Name / LinkedIn"
                className="tap-target w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Notes</label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Questions asked, feedback, next steps…"
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="press tap-target rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Add note
          </button>
        </form>

        {notes.length > 0 ? (
          <div className="space-y-3">
            {notes.map((note) => (
              <div key={note.id} className="group rounded-lg border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
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
                      className="tap-target-sm rounded-md p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100 focus-ring"
                      aria-label="Delete note"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
                {note.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{note.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-muted-foreground">No notes yet — add your first above.</p>
        )}
      </SectionCard>
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
