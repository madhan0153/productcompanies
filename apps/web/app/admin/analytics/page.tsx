import type { Metadata } from "next";
import { BarChart3, TrendingUp, Users, Target } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  MetricStrip, MiniMetric, PageHeader, Panel, RankList,
} from "@/components/admin/admin-ui";

export const metadata: Metadata = { title: "Admin · Analytics" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  role_function: string | null;
  resume_parsed: unknown;
  resume_score: number | null;
  product_dna_score: number | null;
  last_match_compute_at: string | null;
  created_at: string;
};

type MatchRow = {
  verdict: string | null;
  score: number;
  computed_at: string;
};

export default async function AdminAnalyticsPage() {
  const admin    = createSupabaseAdminClient();
  const since30d = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
  const since7d  = new Date(Date.now() - 7 * 24 * 3_600_000).toISOString();

  const [
    profilesResult,
    matchesResult,
    enhancedResult,
    tailoredResult,
    snapshotsResult,
    newUsersResult,
    activeUsersResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id, role_function, resume_parsed, resume_score, product_dna_score, last_match_compute_at, created_at")
      .limit(1000) as any,
    admin
      .from("matches")
      .select("verdict, score, computed_at")
      .gte("computed_at", since30d)
      .limit(2000) as any,
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_match_compute_at", since7d),
  ]);

  const profiles = (profilesResult.data ?? []) as ProfileRow[];
  const matches  = (matchesResult.data  ?? []) as MatchRow[];

  // Top skills
  const skillCounts = new Map<string, number>();
  for (const p of profiles) {
    const arr = extractStringArray(p.resume_parsed, "tech_stack");
    for (const skill of arr) {
      const k = skill.trim();
      if (k) skillCounts.set(k, (skillCounts.get(k) ?? 0) + 1);
    }
  }
  const topSkills = topValues(skillCounts, 12);

  // Role mix
  const roleCounts = new Map<string, number>();
  for (const p of profiles) {
    const r = p.role_function?.trim();
    if (r) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  }
  const roleMix = topValues(roleCounts, 10);

  // Match verdicts
  const verdictCounts = new Map<string, number>();
  for (const m of matches) {
    const v = m.verdict ?? "scored";
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1);
  }
  const verdicts = topValues(verdictCounts, 6);

  // Score distribution buckets
  const buckets = [0, 0, 0, 0, 0]; // <40, 40-59, 60-74, 75-89, 90+
  for (const m of matches) {
    if (m.score < 40)       buckets[0]++;
    else if (m.score < 60)  buckets[1]++;
    else if (m.score < 75)  buckets[2]++;
    else if (m.score < 90)  buckets[3]++;
    else                    buckets[4]++;
  }

  // Resume score distribution
  const scores = profiles.map((p) => p.resume_score ?? p.product_dna_score).filter((s): s is number => s != null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

  const strongFit = matches.filter((m) => m.verdict === "strong_fit").length;
  const strongFitRate = matches.length > 0 ? Math.round((strongFit / matches.length) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Analytics"
        title="Analytics & Insights"
        description="User engagement, match quality, top skills, and role mix across the platform."
      />

      <MetricStrip>
        <MiniMetric label="New users (7d)"    value={newUsersResult.count ?? 0} />
        <MiniMetric label="Active users (7d)" value={activeUsersResult.count ?? 0} />
        <MiniMetric label="Avg resume score"  value={avgScore} />
        <MiniMetric label="Strong fit rate"   value={`${strongFitRate}%`} />
      </MetricStrip>

      {/* AI artifacts */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-primary" />}
          label="Enhanced resumes"
          value={String(enhancedResult.count ?? 0)}
          sub="AI-reviewed & rewritten"
        />
        <KpiCard
          icon={<Target className="h-5 w-5 text-violet-500" />}
          label="Tailored resumes"
          value={String(tailoredResult.count ?? 0)}
          sub="JD-matched outputs"
        />
        <KpiCard
          icon={<Users className="h-5 w-5 text-emerald-500" />}
          label="Resume snapshots"
          value={String(snapshotsResult.count ?? 0)}
          sub="Version history entries"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <RankList title="Top skills (from parsed resumes)" items={topSkills} />
        <RankList title="Role mix" items={roleMix} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel icon={BarChart3} title="Match verdict breakdown (30d)" description={`${matches.length} total matches`}>
          {verdicts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No match data in last 30 days.</p>
          ) : (
            <div className="space-y-3">
              {verdicts.map(({ label, count }) => {
                const pct = Math.round((count / matches.length) * 100);
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium">{label}</span>
                      <span className="text-muted-foreground">{count} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${label === "strong_fit" ? "bg-emerald-500" : label === "good_fit" ? "bg-primary" : "bg-muted-foreground/40"}`}
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel icon={BarChart3} title="Match score distribution (30d)">
          {matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No match data yet.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: "< 40  (poor)",      value: buckets[0] },
                { label: "40–59 (low)",        value: buckets[1] },
                { label: "60–74 (moderate)",   value: buckets[2] },
                { label: "75–89 (good fit)",   value: buckets[3] },
                { label: "90+   (strong fit)", value: buckets[4] },
              ].map(({ label, value }) => {
                const pct = Math.round((value / matches.length) * 100);
                return (
                  <div key={label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-mono text-muted-foreground">{label}</span>
                      <span>{value} · {pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary/60 transition-all duration-500" style={{ width: `${Math.max(3, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-elev1">
      <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-secondary">
        {icon}
      </div>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function extractStringArray(value: unknown, key: string): string[] {
  if (!value || typeof value !== "object") return [];
  const arr = (value as Record<string, unknown>)[key];
  return Array.isArray(arr) ? arr.filter((v): v is string => typeof v === "string") : [];
}

function topValues(map: Map<string, number>, limit: number): Array<{ label: string; count: number }> {
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}
