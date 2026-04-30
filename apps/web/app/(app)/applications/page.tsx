import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, StickyNote, ChevronRight } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddApplicationButton } from "./add-form";
import { updateStatus, deleteApplication } from "./actions";

export const metadata: Metadata = { title: "Applications" };

type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

const STATUS_COLORS: Record<AppStatus, string> = {
  saved: "bg-sky-400/10 text-sky-400 border-sky-400/20",
  applied: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  interviewing: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  offer: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  rejected: "bg-rose-400/10 text-rose-400 border-rose-400/20",
  withdrawn: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
};

const STATUS_TABS: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];

type AppRow = {
  id: string;
  status: AppStatus;
  applied_at: string | null;
  notes: string | null;
  next_action_at: string | null;
  created_at: string;
  job_id: string;
};

type MatchRow = {
  job_id: string;
  score: number;
  jobs: { id: string; title: string; apply_url: string | null; companies: { name: string; slug: string } | null } | null;
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const activeStatus = (params.status as AppStatus) || null;

  const [{ data: rawApps }, { data: rawMatches }] = await Promise.all([
    supabase.from("applications")
      .select("id, status, applied_at, notes, next_action_at, created_at, job_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("matches")
      .select("job_id, score, jobs(id, title, apply_url, companies(name, slug))")
      .eq("user_id", user.id)
      .order("score", { ascending: false })
      .limit(200),
  ]);

  const apps = (rawApps ?? []) as AppRow[];
  const matches = (rawMatches as unknown as MatchRow[]) ?? [];

  // Build job map from matches
  const jobMap = new Map<string, MatchRow["jobs"]>(
    matches.map((m) => [m.job_id, m.jobs]),
  );

  const filtered = activeStatus
    ? apps.filter((a) => a.status === activeStatus)
    : apps;

  // Jobs list for add form
  const jobsForForm = matches
    .filter((m) => m.jobs)
    .map((m) => ({ id: m.job_id, title: m.jobs!.title, company: m.jobs!.companies?.name ?? "" }));

  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps.length > 0 ? `${apps.length} application${apps.length !== 1 ? "s" : ""} tracked` : "Start tracking your job applications"}
          </p>
        </div>
        <AddApplicationButton jobs={jobsForForm} />
      </div>

      {/* Status tabs */}
      {apps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <TabChip href="/applications" active={!activeStatus} label="All" count={apps.length} />
          {STATUS_TABS.filter((s) => (counts[s] ?? 0) > 0).map((s) => (
            <TabChip
              key={s}
              href={`/applications?status=${s}`}
              active={activeStatus === s}
              label={s.charAt(0).toUpperCase() + s.slice(1)}
              count={counts[s] ?? 0}
            />
          ))}
        </div>
      )}

      {/* Application list */}
      {filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((app) => {
            const job = jobMap.get(app.job_id);
            const title = job?.title ?? "Unknown role";
            const company = job?.companies?.name ?? "Unknown company";
            const applyUrl = job?.apply_url;

            return (
              <div
                key={app.id}
                className="group rounded-2xl border border-border bg-card/40 p-5 transition hover:border-primary/30 hover:bg-card/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">{company}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <h3 className="font-medium">{title}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {app.applied_at && <span>Applied {formatDate(app.applied_at)}</span>}
                      {app.next_action_at && (
                        <span className="text-amber-400">Follow up {formatDate(app.next_action_at)}</span>
                      )}
                      {app.notes && (
                        <span className="flex items-center gap-1">
                          <StickyNote className="h-3 w-3" /> {app.notes.slice(0, 60)}{app.notes.length > 60 ? "…" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {applyUrl && (
                      <a
                        href={applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        <ExternalLink className="h-3 w-3" /> Apply
                      </a>
                    )}
                    <Link
                      href={`/applications/${app.id}`}
                      className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                    >
                      Notes <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Quick status update */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground mr-1">Move to:</span>
                  {STATUS_TABS.filter((s) => s !== app.status).map((s) => (
                    <form key={s} action={updateStatus}>
                      <input type="hidden" name="app_id" value={app.id} />
                      <input type="hidden" name="status" value={s} />
                      <button
                        type="submit"
                        className="rounded-lg border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                      >
                        {s}
                      </button>
                    </form>
                  ))}
                  <form action={deleteApplication} className="ml-auto">
                    <input type="hidden" name="app_id" value={app.id} />
                    <button
                      type="submit"
                      className="rounded-lg border border-rose-500/20 px-2 py-0.5 text-xs text-rose-400 transition hover:bg-rose-500/10"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {activeStatus
              ? `No ${activeStatus} applications yet.`
              : `No applications tracked yet — click "Add application" to start.`}
          </p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

function TabChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-primary/20" : "bg-secondary"}`}>
        {count}
      </span>
    </Link>
  );
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (diff === 0) return "today";
    if (diff === 1) return "yesterday";
    if (diff < 7) return `${diff}d ago`;
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
}
