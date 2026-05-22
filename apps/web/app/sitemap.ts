// /sitemap.xml — Next.js File-based metadata.
//
// Enumerates every publicly-crawlable URL across the static templates
// (companies, cities, roles, dsa patterns) and the dynamic job listings
// pulled live from Supabase. Build-time + ISR friendly: this route runs
// on the server every time the sitemap is requested.

import type { MetadataRoute } from "next";
import { CRAWLER_META, DSA_CATALOG, DSA_PATTERN_ROADMAP } from "@prodmatch/shared";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { INDIA_HUBS, hubToSlug, absoluteUrl } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";
import { COMPETITORS } from "@/lib/seo/comparisons";
import { PILLAR_GUIDES } from "@/lib/seo/guides";

export const revalidate = 3600; // 1 hour

type SitemapEntry = MetadataRoute.Sitemap[number];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Static / template-driven pages ─────────────────────────────────────
  const staticEntries: SitemapEntry[] = [
    { url: absoluteUrl("/"),          lastModified: now, changeFrequency: "daily",   priority: 1.0 },
    { url: absoluteUrl("/companies"), lastModified: now, changeFrequency: "daily",   priority: 0.9 },
    { url: absoluteUrl("/cities"),    lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: absoluteUrl("/roles"),     lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: absoluteUrl("/about"),     lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: absoluteUrl("/privacy"),   lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/terms"),     lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: absoluteUrl("/dsa"),       lastModified: now, changeFrequency: "weekly",  priority: 0.7 },
    { url: absoluteUrl("/dsa/patterns"), lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: absoluteUrl("/guides"),    lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: absoluteUrl("/compare"),   lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const guideEntries: SitemapEntry[] = PILLAR_GUIDES.map((g) => ({
    url: absoluteUrl(`/guides/${g.slug}`),
    lastModified: new Date(g.dateModified ?? g.datePublished),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const compareEntries: SitemapEntry[] = COMPETITORS.map((c) => ({
    url: absoluteUrl(`/compare/${c.slug}`),
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const companyEntries: SitemapEntry[] = CRAWLER_META.map((c) => ({
    url: absoluteUrl(`/companies/${c.slug}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.9,
  }));

  // Company × role cross-products. ~234 pages (18 cos × 13 roles).
  const companyRoleEntries: SitemapEntry[] = CRAWLER_META.flatMap((c) =>
    PUBLIC_ROLES.map((r) => ({
      url: absoluteUrl(`/companies/${c.slug}/${r.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  );

  const cityEntries: SitemapEntry[] = INDIA_HUBS.map((hub) => ({
    url: absoluteUrl(`/cities/${hubToSlug(hub)}`),
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // City × role cross-products. ~117 pages (9 hubs × 13 roles).
  const cityRoleEntries: SitemapEntry[] = INDIA_HUBS.flatMap((hub) =>
    PUBLIC_ROLES.map((r) => ({
      url: absoluteUrl(`/cities/${hubToSlug(hub)}/${r.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  );

  const roleEntries: SitemapEntry[] = PUBLIC_ROLES.map((r) => ({
    url: absoluteUrl(`/roles/${r.slug}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const dsaPatternEntries: SitemapEntry[] = DSA_PATTERN_ROADMAP.map((p) => ({
    url: absoluteUrl(`/dsa/patterns#${p.pattern}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  const dsaProblemEntries: SitemapEntry[] = DSA_CATALOG.map((p) => ({
    url: absoluteUrl(`/dsa/${p.slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  // ── Dynamic — live job listings ────────────────────────────────────────
  // Pulled from Supabase via the anon client (RLS allows anonymous SELECT
  // on active jobs). Capped at 10 000 entries per the sitemap.xml spec.
  // For larger inventories, split into a sitemap index.
  const jobEntries: SitemapEntry[] = await loadActiveJobEntries();

  return [
    ...staticEntries,
    ...guideEntries,
    ...compareEntries,
    ...companyEntries,
    ...companyRoleEntries,
    ...cityEntries,
    ...cityRoleEntries,
    ...roleEntries,
    ...dsaPatternEntries,
    ...dsaProblemEntries,
    ...jobEntries,
  ];
}

async function loadActiveJobEntries(): Promise<SitemapEntry[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await (supabase
      .from("jobs")
      .select("id, last_seen_at, posted_at")
      .eq("is_active", true)
      .order("last_seen_at", { ascending: false, nullsFirst: false })
      .limit(10_000) as unknown as Promise<{
        data: Array<{ id: string; last_seen_at: string | null; posted_at: string | null }> | null;
      }>);
    return (data ?? []).map((job) => ({
      url: absoluteUrl(`/listings/${job.id}`),
      lastModified: new Date(job.last_seen_at ?? job.posted_at ?? Date.now()),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    // Sitemap should never 500 — empty job set is acceptable if the DB blips.
    return [];
  }
}
