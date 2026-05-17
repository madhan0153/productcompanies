import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, MapPin, Briefcase, Building2, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";
import { StaggerList } from "@/components/stagger-list";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Jobs" };

// Seniority pill — collapses six raw colors to three semantic tones.
const SENIORITY_TONE: Record<string, string> = {
  intern:    "bg-primary-soft text-primary-soft-foreground border-primary/20",
  junior:    "bg-primary-soft text-primary-soft-foreground border-primary/20",
  mid:       "bg-secondary text-foreground border-border",
  senior:    "bg-warning/10 text-warning border-warning/20",
  staff:     "bg-success/10 text-success border-success/20",
  principal: "bg-success/10 text-success border-success/20",
  manager:   "bg-primary-soft text-primary-soft-foreground border-primary/20",
  director:  "bg-primary-soft text-primary-soft-foreground border-primary/20",
};

type JobRow = {
  id: string;
  title: string;
  location: string | null;
  hubs: string[] | null;
  tech_stack: string[] | null;
  seniority: string | null;
  comp_lpa_min: number | null;
  comp_lpa_max: number | null;
  min_experience_years: number | null;
  apply_url: string | null;
  posted_at: string | null;
  companies: { name: string; slug: string; logo_url: string | null } | null;
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; q?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const selectedSlug = params.c ?? "";
  const query = (params.q ?? "").toLowerCase().trim();

  const [{ data: rawJobs }, { data: companies }] = await Promise.all([
    supabase
      .from("jobs")
      .select(`
        id, title, location, hubs, tech_stack, seniority,
        comp_lpa_min, comp_lpa_max, min_experience_years,
        apply_url, posted_at,
        companies ( name, slug, logo_url )
      `)
      .eq("is_active", true)
      .order("freshness_score", { ascending: false })
      .limit(500),
    supabase.from("companies").select("name, slug").order("name"),
  ]);

  const allJobs = (rawJobs as unknown as JobRow[]) ?? [];

  const jobs = allJobs.filter((j) => {
    if (selectedSlug && j.companies?.slug !== selectedSlug) return false;
    if (query) {
      const haystack = `${j.title} ${j.companies?.name ?? ""} ${(j.tech_stack ?? []).join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">All jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allJobs.length} active roles from 18 product companies
        </p>
      </div>

      {/* Filters — mobile-first: stack vertically until sm */}
      <form method="GET" className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative min-w-0 flex-1 sm:min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search title, company, tech…"
            className="tap-target w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <select
          name="c"
          defaultValue={selectedSlug}
          className="tap-target rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All companies</option>
          {(companies ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <button
            type="submit"
            className="press tap-target rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Filter
          </button>

          {(selectedSlug || query) && (
            <Link
              href="/jobs"
              className="press tap-target inline-flex items-center rounded-md border border-border bg-card px-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {/* Result count when filtered */}
      {(selectedSlug || query) && (
        <p className="text-sm text-muted-foreground">
          {jobs.length} role{jobs.length !== 1 ? "s" : ""} match
          {query && <> &quot;{params.q}&quot;</>}
          {selectedSlug && (
            <> at {companies?.find((c) => c.slug === selectedSlug)?.name ?? selectedSlug}</>
          )}
        </p>
      )}

      {/* Job list */}
      {jobs.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="No jobs found"
          body="Try clearing your filters or widening the search."
          actions={[{ label: "Clear filters", href: "/jobs", variant: "primary" }]}
        />
      ) : (
        <StaggerList className="space-y-3">
          {jobs.map((job) => {
            const company = job.companies;
            const tech = job.tech_stack ?? [];
            const hubs = job.hubs ?? [];

            return (
              <div
                key={job.id}
                className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:bg-secondary/40 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={44} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
                        {job.seniority && (
                          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${SENIORITY_TONE[job.seniority] ?? "bg-secondary text-foreground border-border"}`}>
                            {job.seniority}
                          </span>
                        )}
                      </div>

                      <Link href={`/jobs/${job.id}`} className="block focus-ring rounded">
                        <h2 className="font-semibold leading-snug transition group-hover:text-primary">
                          {job.title}
                        </h2>
                      </Link>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {hubs.slice(0, 3).map((h) => (
                          <span key={h} className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{h}
                          </span>
                        ))}
                        {job.comp_lpa_max != null && (
                          <span className="font-medium text-primary">Up to ₹{job.comp_lpa_max} LPA</span>
                        )}
                        {job.min_experience_years != null && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />{job.min_experience_years}+ yrs
                          </span>
                        )}
                      </div>

                      {tech.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {tech.slice(0, 8).map((t) => (
                            <span key={t} className="rounded border border-border bg-secondary px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                              {t}
                            </span>
                          ))}
                          {tech.length > 8 && (
                            <span className="text-xs text-muted-foreground">+{tech.length - 8}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="press tap-target-sm rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-secondary focus-ring"
                    >
                      View details
                    </Link>
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="press tap-target-sm inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
                      >
                        Apply <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </StaggerList>
      )}
    </div>
  );
}
