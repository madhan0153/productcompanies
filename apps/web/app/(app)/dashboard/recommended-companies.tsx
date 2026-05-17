// Sprint 6 — Recommended companies, ranked by USER'S match quality at each
// company (not raw new-job count). Replaces "Hiring this week" which was
// just a noisy company-popularity contest. For a Databricks/ADF Data
// Engineer, Apple + SAP Labs ranked surfaced ahead of Amazon (which is 70%
// warehouse/ops noise).

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

export interface CompanyRanking {
  name: string;
  slug: string;
  logoUrl: string | null;
  /** How many of the user's matches at this company are >=60 (plausible+). */
  shortlist: number;
  /** Best score the user has at this company. */
  bestScore: number;
  /** Top job for deep-link. */
  topJobId: string | null;
}

export function rankCompaniesForUser(
  rows: Array<{
    score: number;
    job_id: string;
    jobs: { id: string; companies: { name: string; slug: string; logo_url: string | null } | null } | null;
  }>,
  limit = 5,
): CompanyRanking[] {
  const bySlug = new Map<string, CompanyRanking>();
  for (const r of rows) {
    const co = r.jobs?.companies;
    if (!co) continue;
    let entry = bySlug.get(co.slug);
    if (!entry) {
      entry = {
        name: co.name,
        slug: co.slug,
        logoUrl: co.logo_url,
        shortlist: 0,
        bestScore: 0,
        topJobId: null,
      };
      bySlug.set(co.slug, entry);
    }
    if (r.score >= 60) entry.shortlist++;
    if (r.score > entry.bestScore) {
      entry.bestScore = r.score;
      entry.topJobId = r.job_id;
    }
  }
  return [...bySlug.values()]
    .filter((c) => c.bestScore >= 40) // ignore companies where user has nothing usable
    .sort((a, b) => {
      // Tier 1: more shortlist hits wins
      if (b.shortlist !== a.shortlist) return b.shortlist - a.shortlist;
      // Tier 2: higher best score wins
      return b.bestScore - a.bestScore;
    })
    .slice(0, limit);
}

export function RecommendedCompaniesCard({ companies }: { companies: CompanyRanking[] }) {
  if (companies.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Recommended companies</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We&apos;ll suggest companies once you have at least one match scoring 40+.
        </p>
      </section>
    );
  }
  const maxShortlist = Math.max(...companies.map((c) => c.shortlist), 1);

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <header className="mb-4 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">Best companies for you</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">By your match quality, not popularity</p>
        </div>
        <Link
          href="/matches?min_score=60"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground transition hover:text-primary focus-ring rounded"
        >
          See shortlist <ChevronRight className="h-3 w-3" />
        </Link>
      </header>
      <ul className="space-y-2.5">
        {companies.map((c) => (
          <li key={c.slug}>
            <Link
              href={c.topJobId ? `/jobs/${c.topJobId}` : `/matches?c=${c.slug}`}
              className="group flex items-center gap-3 rounded-md px-1 py-1 -mx-1 transition hover:bg-secondary/40 focus-ring"
            >
              <CompanyLogo name={c.name} logoUrl={c.logoUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
              <div className="w-20 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${(c.shortlist / maxShortlist) * 100}%` }}
                  aria-hidden
                />
              </div>
              <span className="w-12 shrink-0 text-right text-[11px] font-semibold tabular-nums" title={`${c.shortlist} matches ≥60, best ${Math.round(c.bestScore)}`}>
                {c.shortlist > 0 ? `${c.shortlist} fit` : `top ${Math.round(c.bestScore)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground/70">
        Ranked by plausible-or-better match count, tie-broken by best score
      </p>
    </section>
  );
}
