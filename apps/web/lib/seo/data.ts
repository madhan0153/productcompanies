// Aggregate data loaders for public SEO pages. Server-only.
//
// Every loader is defensive: if Supabase blips, we return empty rather
// than break a sitemap or landing page. Public pages must NEVER 500
// on an internal data fault — Google would deindex.

import { CRAWLER_META } from "@prodmatch/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CompanySummary {
  slug: string;
  name: string;
  logoUrl: string | null;
  activeJobs: number;
}

export async function loadCompanySummaries(): Promise<CompanySummary[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: companies } = await (supabase
      .from("companies")
      .select("id, slug, name, logo_url") as unknown as Promise<{
        data: Array<{ id: string; slug: string; name: string; logo_url: string | null }> | null;
      }>);
    if (!companies) return CRAWLER_META.map((c) => ({ slug: c.slug, name: c.name, logoUrl: null, activeJobs: 0 }));

    // Count active jobs per company in one round-trip-ish — head counts.
    const counts = await Promise.all(
      companies.map((c) =>
        supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("company_id", c.id)
          .eq("is_active", true),
      ),
    );

    return companies.map((c, i) => ({
      slug: c.slug,
      name: c.name,
      logoUrl: c.logo_url,
      activeJobs: counts[i]?.count ?? 0,
    })).sort((a, b) => b.activeJobs - a.activeJobs);
  } catch {
    return CRAWLER_META.map((c) => ({ slug: c.slug, name: c.name, logoUrl: null, activeJobs: 0 }));
  }
}

export interface JobListItem {
  id: string;
  title: string;
  location: string | null;
  hubs: string[] | null;
  techStack: string[] | null;
  seniority: string | null;
  postedAt: string | null;
  lastSeenAt: string | null;
  applyUrl: string | null;
  compLpaMin: number | null;
  compLpaMax: number | null;
  isLikelyGhost: boolean | null;
  jdSummary: string | null;
  roleFunctionJd: string | null;
  company: {
    slug: string;
    name: string;
    logoUrl: string | null;
  };
}

interface LoadJobsOpts {
  companySlug?: string;
  hub?: string;
  roleFunction?: string;
  limit?: number;
}

export async function loadActiveJobs(opts: LoadJobsOpts = {}): Promise<JobListItem[]> {
  try {
    const supabase = await createSupabaseServerClient();
    let q: any = supabase
      .from("jobs")
      .select(`
        id, title, location, hubs, tech_stack, seniority, posted_at, last_seen_at,
        apply_url, comp_lpa_min, comp_lpa_max, is_likely_ghost, jd_summary, role_function_jd,
        companies!inner ( slug, name, logo_url )
      `)
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(opts.limit ?? 60);

    if (opts.companySlug) q = q.eq("companies.slug", opts.companySlug);
    if (opts.hub) q = q.contains("hubs", [opts.hub]);
    if (opts.roleFunction) q = q.eq("role_function_jd", opts.roleFunction);

    const { data } = (await q) as {
      data: Array<{
        id: string;
        title: string;
        location: string | null;
        hubs: string[] | null;
        tech_stack: string[] | null;
        seniority: string | null;
        posted_at: string | null;
        last_seen_at: string | null;
        apply_url: string | null;
        comp_lpa_min: number | null;
        comp_lpa_max: number | null;
        is_likely_ghost: boolean | null;
        jd_summary: string | null;
        role_function_jd: string | null;
        companies: { slug: string; name: string; logo_url: string | null } | null;
      }> | null;
    };

    return (data ?? [])
      .filter((row) => row.companies)
      .map((row) => ({
        id: row.id,
        title: row.title,
        location: row.location,
        hubs: row.hubs,
        techStack: row.tech_stack,
        seniority: row.seniority,
        postedAt: row.posted_at,
        lastSeenAt: row.last_seen_at,
        applyUrl: row.apply_url,
        compLpaMin: row.comp_lpa_min,
        compLpaMax: row.comp_lpa_max,
        isLikelyGhost: row.is_likely_ghost,
        jdSummary: row.jd_summary,
        roleFunctionJd: row.role_function_jd,
        company: {
          slug: row.companies!.slug,
          name: row.companies!.name,
          logoUrl: row.companies!.logo_url,
        },
      }));
  } catch {
    return [];
  }
}

export async function loadJobById(id: string): Promise<JobListItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = (await (supabase
      .from("jobs")
      .select(`
        id, title, location, hubs, tech_stack, seniority, posted_at, last_seen_at,
        apply_url, comp_lpa_min, comp_lpa_max, is_likely_ghost, jd_summary, role_function_jd,
        is_active,
        companies!inner ( slug, name, logo_url )
      `)
      .eq("id", id)
      .maybeSingle())) as {
        data: {
          id: string;
          title: string;
          location: string | null;
          hubs: string[] | null;
          tech_stack: string[] | null;
          seniority: string | null;
          posted_at: string | null;
          last_seen_at: string | null;
          apply_url: string | null;
          comp_lpa_min: number | null;
          comp_lpa_max: number | null;
          is_likely_ghost: boolean | null;
          jd_summary: string | null;
          role_function_jd: string | null;
          is_active: boolean;
          companies: { slug: string; name: string; logo_url: string | null } | null;
        } | null;
      };
    if (!data || !data.companies || !data.is_active) return null;
    return {
      id: data.id,
      title: data.title,
      location: data.location,
      hubs: data.hubs,
      techStack: data.tech_stack,
      seniority: data.seniority,
      postedAt: data.posted_at,
      lastSeenAt: data.last_seen_at,
      applyUrl: data.apply_url,
      compLpaMin: data.comp_lpa_min,
      compLpaMax: data.comp_lpa_max,
      isLikelyGhost: data.is_likely_ghost,
      jdSummary: data.jd_summary,
      roleFunctionJd: data.role_function_jd,
      company: {
        slug: data.companies.slug,
        name: data.companies.name,
        logoUrl: data.companies.logo_url,
      },
    };
  } catch {
    return null;
  }
}

/** Aggregate hubs (city counts) for a single company. Used on company pages. */
export async function loadCompanyHubBreakdown(companySlug: string): Promise<Record<string, number>> {
  const jobs = await loadActiveJobs({ companySlug, limit: 500 });
  const out: Record<string, number> = {};
  for (const job of jobs) {
    for (const hub of job.hubs ?? []) {
      out[hub] = (out[hub] ?? 0) + 1;
    }
  }
  return out;
}

/** Most-mentioned skills across a company's active JDs — top 20. */
export async function loadCompanyTopSkills(companySlug: string): Promise<string[]> {
  const jobs = await loadActiveJobs({ companySlug, limit: 500 });
  const counts = new Map<string, number>();
  for (const job of jobs) {
    for (const skill of job.techStack ?? []) {
      const key = skill.trim();
      if (!key || key.length < 2) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([skill]) => skill);
}
