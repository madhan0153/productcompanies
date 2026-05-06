import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ExternalLink, MapPin, Briefcase, Building2, Search } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyLogo } from "@/components/company-logo";

export const metadata: Metadata = { title: "Jobs" };

const SENIORITY_COLORS: Record<string, string> = {
  intern:    "text-sky-400 bg-sky-400/10",
  junior:    "text-emerald-400 bg-emerald-400/10",
  mid:       "text-violet-400 bg-violet-400/10",
  senior:    "text-amber-400 bg-amber-400/10",
  staff:     "text-rose-400 bg-rose-400/10",
  principal: "text-rose-400 bg-rose-400/10",
  manager:   "text-fuchsia-400 bg-fuchsia-400/10",
  director:  "text-fuchsia-400 bg-fuchsia-400/10",
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">All jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {allJobs.length} active roles from 18 product companies
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search title, company, tech…"
            className="w-full rounded-xl border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Company filter */}
        <select
          name="c"
          defaultValue={selectedSlug}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
        >
          <option value="">All companies</option>
          {(companies ?? []).map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>

        <button
          type="submit"
          className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90"
        >
          Filter
        </button>

        {(selectedSlug || query) && (
          <Link
            href="/jobs"
            className="rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            Clear
          </Link>
        )}
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
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">No jobs found</p>
          <p className="mt-1 text-xs text-muted-foreground">Try clearing your filters.</p>
          <Link href="/jobs" className="mt-3 inline-block text-xs text-primary hover:underline">
            Clear filters →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const company = job.companies;
            const tech = job.tech_stack ?? [];
            const hubs = job.hubs ?? [];

            return (
              <div
                key={job.id}
                className="group rounded-2xl border border-border bg-card/40 p-5 transition hover:border-primary/30 hover:bg-card/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <CompanyLogo name={company?.name ?? "?"} logoUrl={company?.logo_url ?? null} size={44} />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{company?.name}</span>
                        {job.seniority && (
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SENIORITY_COLORS[job.seniority] ?? "bg-secondary text-foreground"}`}>
                            {job.seniority}
                          </span>
                        )}
                      </div>

                      <Link href={`/jobs/${job.id}`} className="block">
                        <h2 className="font-medium leading-snug group-hover:text-primary transition">
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
                          <span className="text-primary/80">Up to {job.comp_lpa_max} LPA</span>
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
                            <span key={t} className="rounded-md bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
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

                  <div className="flex shrink-0 items-center gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition hover:border-primary/40 hover:bg-secondary"
                    >
                      View details
                    </Link>
                    {job.apply_url && (
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-lg bg-primary/90 px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary"
                      >
                        Apply <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
