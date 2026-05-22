import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExternalLink, StickyNote, ChevronRight, BookOpen, CalendarClock, Download, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";
import { AddApplicationButton } from "./add-form";
import { StatusActions } from "./status-actions";
import { deleteApplication } from "./actions";

export const metadata: Metadata = { title: "Applications" };

type AppStatus = "saved" | "applied" | "interviewing" | "offer" | "rejected" | "withdrawn";

// Semantic status palette — every page in the app uses these same six mappings.
const STATUS_TONE: Record<AppStatus, string> = {
  saved:        "bg-primary-soft text-primary-soft-foreground border-primary/20",
  applied:      "bg-primary-soft text-primary-soft-foreground border-primary/20",
  interviewing: "bg-warning/10 text-warning border-warning/20",
  offer:        "bg-success/10 text-success border-success/20",
  rejected:     "bg-destructive/10 text-destructive border-destructive/20",
  withdrawn:    "bg-muted text-muted-foreground border-border",
};

const STATUS_TABS: AppStatus[] = ["saved", "applied", "interviewing", "offer", "rejected", "withdrawn"];

type AppWithJob = {
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
    companies: { name: string; slug: string; logo_url: string | null } | null;
  } | null;
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

  const [{ data: rawApps }, { data: rawJobs }] = await Promise.all([
    supabase.from("applications")
      .select("id, status, applied_at, notes, next_action_at, created_at, job_id, jobs(id, title, apply_url, companies(name, slug, logo_url))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("jobs")
      .select("id, title, companies(name)")
      .eq("is_active", true)
      .order("freshness_score", { ascending: false })
      .limit(200),
  ]);

  const apps = (rawApps as unknown as AppWithJob[]) ?? [];

  const filtered = activeStatus
    ? apps.filter((a) => a.status === activeStatus)
    : apps;

  type JobForForm = { id: string; title: string; companies: { name: string } | null };
  const jobsForForm = ((rawJobs as unknown as JobForForm[]) ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    company: j.companies?.name ?? "",
  }));

  const counts = apps.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {});

  // Follow-ups: overdue, today, upcoming (within 14 days)
  const now = Date.now();
  const day = 86400000;
  const followups = apps
    .filter((a) => a.next_action_at && a.status !== "rejected" && a.status !== "withdrawn")
    .map((a) => ({ app: a, when: new Date(a.next_action_at!).getTime() }))
    .sort((a, b) => a.when - b.when);

  const overdue = followups.filter((f) => f.when < now - day);
  const dueToday = followups.filter((f) => f.when >= now - day && f.when < now + day);
  const upcoming = followups.filter((f) => f.when >= now + day && f.when < now + 14 * day);

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {apps.length > 0 ? `${apps.length} application${apps.length !== 1 ? "s" : ""} tracked` : "Start tracking your job applications"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {followups.length > 0 && (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- API download, not a page navigation
            <a
              href="/api/applications/calendar"
              className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
              title="Download an iCalendar file with all your follow-ups"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Subscribe (.ics)</span>
              <span className="sm:hidden">ICS</span>
            </a>
          )}
          <AddApplicationButton jobs={jobsForForm} />
        </div>
      </div>

      {/* Follow-ups overview */}
      {(overdue.length + dueToday.length + upcoming.length) > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <header className="mb-3 flex flex-wrap items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Follow-ups</h2>
            <span className="ml-auto text-xs text-muted-foreground">
              <span className={overdue.length > 0 ? "text-destructive" : ""}>{overdue.length} overdue</span>
              {" · "}
              <span className={dueToday.length > 0 ? "text-warning" : ""}>{dueToday.length} today</span>
              {" · "}
              {upcoming.length} this fortnight
            </span>
          </header>
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {[...overdue, ...dueToday, ...upcoming].slice(0, 8).map(({ app: a, when }) => {
              const job = a.jobs;
              const company = job?.companies;
              const isOverdue = when < now - day;
              const isToday = when >= now - day && when < now + day;
              const tone = isOverdue
                ? "border-destructive/30 bg-destructive/5"
                : isToday
                  ? "border-warning/30 bg-warning/5"
                  : "border-border bg-secondary/40";
              const timeTone = isOverdue ? "text-destructive" : isToday ? "text-warning" : "text-muted-foreground";
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${tone}`}
                >
                  <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={28} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{job?.title ?? "Role"}</p>
                    <p className="truncate text-xs text-muted-foreground">{company?.name ?? ""}</p>
                  </div>
                  <span className={`inline-flex shrink-0 items-center gap-1 text-xs font-medium ${timeTone}`}>
                    {isOverdue && <AlertCircle className="h-3 w-3" />}
                    {formatRelative(a.next_action_at!)}
                  </span>
                  <Link
                    href={`/applications/${a.id}`}
                    className="press tap-target-sm shrink-0 rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
                  >
                    Open
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Status tabs */}
      {apps.length > 0 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
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
        <StaggerList className="space-y-3">
          {filtered.map((app) => {
            const job = app.jobs;
            const company = job?.companies;
            const title = job?.title ?? "Role no longer listed";
            const companyName = company?.name ?? "—";

            return (
              <div
                key={app.id}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyLogo name={companyName} logoUrl={company?.logo_url ?? null} size={40} />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">{companyName}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <h3 className="font-semibold leading-snug">
                        {job ? (
                          <Link href={`/jobs/${job.id}`} className="transition hover:text-primary focus-ring rounded">
                            {title}
                          </Link>
                        ) : title}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {app.applied_at && <span>Applied {formatDate(app.applied_at)}</span>}
                        {app.next_action_at && (
                          <span className="text-warning">Follow up {formatDate(app.next_action_at)}</span>
                        )}
                        {app.notes && (
                          <span className="flex items-center gap-1">
                            <StickyNote className="h-3 w-3" /> {app.notes.slice(0, 60)}{app.notes.length > 60 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {job?.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
                      >
                        <ExternalLink className="h-3 w-3" /> Apply
                      </a>
                    )}
                    <Link
                      href={`/applications/${app.id}`}
                      className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
                    >
                      Notes <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

                {/* Quick status update */}
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  <StatusActions appId={app.id} currentStatus={app.status} />
                  <form action={deleteApplication} className="ml-auto">
                    <input type="hidden" name="app_id" value={app.id} />
                    <button
                      type="submit"
                      className="press tap-target-sm inline-flex items-center gap-1 rounded-md border border-destructive/20 px-2.5 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 focus-ring"
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </StaggerList>
      ) : activeStatus ? (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title={`No ${activeStatus} applications yet`}
          body="As you progress through your job search, applications you move into this stage will show up here."
          actions={[{ label: "View all", href: "/applications", variant: "primary" }]}
        />
      ) : (
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="Track your job search end to end"
          body="Save roles you're considering, log when you apply, capture interview rounds, and compare offers — all in one private workspace."
          actions={[{ label: "Browse matches", href: "/matches", variant: "primary" }]}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AppStatus }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TONE[status]}`}>
      {status}
    </span>
  );
}

function TabChip({ href, active, label, count }: { href: string; active: boolean; label: string; count: number }) {
  return (
    <Link
      href={href}
      className={[
        "press tap-target-sm inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition focus-ring",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      ].join(" ")}
    >
      {label}
      <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
        {count}
      </span>
    </Link>
  );
}

function formatRelative(iso: string) {
  try {
    const d = new Date(iso);
    const diff = Math.round((d.getTime() - Date.now()) / 86400000);
    if (diff <= -1) return `${Math.abs(diff)}d overdue`;
    if (diff === 0) return "today";
    if (diff === 1) return "tomorrow";
    if (diff < 7) return `in ${diff}d`;
    if (diff < 30) return `in ${Math.round(diff / 7)}w`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  } catch { return ""; }
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
