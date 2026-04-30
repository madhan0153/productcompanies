import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MessageSquare, Trash2 } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;

  const [{ data: app }, { data: notes }] = await Promise.all([
    supabase.from("applications")
      .select("id, status, applied_at, notes, next_action_at, created_at, job_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("interview_notes")
      .select("id, round, interviewer, notes, created_at")
      .eq("application_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!app) notFound();

  // Get job info from matches
  const { data: matchData } = await supabase.from("matches")
    .select("job_id, jobs(id, title, apply_url, location, companies(name, slug))")
    .eq("user_id", user.id)
    .eq("job_id", app.job_id)
    .maybeSingle();

  const jobRaw = matchData?.jobs as unknown as {
    id: string; title: string; apply_url: string | null;
    location: string | null;
    companies: { name: string; slug: string } | null;
  } | null;

  const appStatus = app.status as AppStatus;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Back */}
      <Link href="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition">
        <ArrowLeft className="h-4 w-4" /> Back to applications
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {jobRaw?.companies?.name ?? "Unknown company"}
              </span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[appStatus]}`}>
                {appStatus}
              </span>
            </div>
            <h1 className="text-xl font-semibold">{jobRaw?.title ?? "Unknown role"}</h1>
            {jobRaw?.location && (
              <p className="text-xs text-muted-foreground">{jobRaw.location}</p>
            )}
          </div>
          {jobRaw?.apply_url && (
            <a
              href={jobRaw.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
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
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            </form>
          ))}
        </div>
      </div>

      {/* Interview notes */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Interview notes ({notes?.length ?? 0})
        </h2>

        {/* Add note form */}
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
            className="rounded-xl bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90"
          >
            Add note
          </button>
        </form>

        {/* Notes list */}
        {(notes ?? []).length > 0 ? (
          <div className="space-y-3">
            {(notes ?? []).map((note) => (
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
                      className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
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
