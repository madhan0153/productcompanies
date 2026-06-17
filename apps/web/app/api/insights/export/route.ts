import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type JobLite, type CompanyLite,
  aggregate, adjacencyUnlocks, companyStackDemand,
} from "@/lib/insights/aggregate";
import { safeRoute, unauthorized } from "@/lib/http/api";

export const dynamic = "force-dynamic";

// JSON snapshot of the user's insights — useful as a "save state" before
// learning a new skill so you can compare progress later. Pure-data, no LLM.
export const GET = safeRoute("insights.export", async () => {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized("Please sign in to export your insights.");

  const [{ data: profile }, { data: rawJobs }, { data: companies }] = await Promise.all([
    supabase.from("profiles")
      .select("tech_stack, seniority, target_lpa, current_lpa, preferred_hubs")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("jobs")
      .select("id, company_id, tech_stack, seniority, comp_lpa_min, comp_lpa_max, hubs")
      .eq("is_active", true),
    supabase.from("companies").select("id, name, slug, logo_url"),
  ]);

  const jobs = (rawJobs as JobLite[] | null) ?? [];
  const companyMap = new Map<string, CompanyLite>(
    ((companies as CompanyLite[]) ?? []).map((c) => [c.id, c]),
  );
  const agg = aggregate(jobs, profile ?? null);
  const adjacency = adjacencyUnlocks(jobs, profile ?? null, 8);
  const compDemand = companyStackDemand(jobs, profile ?? null).slice(0, 12);

  const payload = {
    exported_at: new Date().toISOString(),
    profile_snapshot: {
      seniority: profile?.seniority ?? null,
      tech_stack: profile?.tech_stack ?? [],
      target_lpa: profile?.target_lpa ?? null,
      preferred_hubs: profile?.preferred_hubs ?? [],
    },
    market_summary: {
      active_roles: jobs.length,
      coverage_top30_pct: agg.coverage,
      tracked_skills: agg.demand.size,
    },
    your_stack: agg.yours,
    top_gaps: agg.gaps,
    adjacency_unlocks: adjacency,
    comp_benchmarks: agg.compStats,
    hiring_hubs: agg.topHubs.map(([hub, roles]) => ({ hub, roles })),
    companies_hiring_your_stack: compDemand.map((c) => ({
      company: companyMap.get(c.companyId)?.name ?? null,
      slug: companyMap.get(c.companyId)?.slug ?? null,
      roles_total: c.rolesTotal,
      roles_matching_stack: c.rolesMatchingStack,
      top_matched_techs: [...c.matchedTechs.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tech, n]) => ({ tech, n })),
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="prodmatch-insights-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
