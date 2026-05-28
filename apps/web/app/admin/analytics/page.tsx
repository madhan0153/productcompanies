import type { Metadata } from "next";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, SectionHeader } from "@/components/admin/pm";

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
      .limit(1000) as never,
    admin
      .from("matches")
      .select("verdict, score, computed_at")
      .gte("computed_at", since30d)
      .limit(2000) as never,
    admin.from("enhanced_resumes").select("id", { count: "exact", head: true }),
    admin.from("tailored_resumes").select("id", { count: "exact", head: true }),
    admin.from("resume_versions").select("id", { count: "exact", head: true }),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since7d),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("last_match_compute_at", since7d),
  ]);

  const profiles = ((profilesResult as { data: ProfileRow[] | null }).data ?? []);
  const matches  = ((matchesResult  as { data: MatchRow[]   | null }).data ?? []);

  const skillCounts = new Map<string, number>();
  for (const p of profiles) {
    const arr = extractStringArray(p.resume_parsed, "tech_stack");
    for (const skill of arr) {
      const k = skill.trim();
      if (k) skillCounts.set(k, (skillCounts.get(k) ?? 0) + 1);
    }
  }
  const topSkills = topValues(skillCounts, 12);

  const roleCounts = new Map<string, number>();
  for (const p of profiles) {
    const r = p.role_function?.trim();
    if (r) roleCounts.set(r, (roleCounts.get(r) ?? 0) + 1);
  }
  const roleMix = topValues(roleCounts, 10);

  const verdictCounts = new Map<string, number>();
  for (const m of matches) {
    const v = m.verdict ?? "scored";
    verdictCounts.set(v, (verdictCounts.get(v) ?? 0) + 1);
  }
  const verdicts = topValues(verdictCounts, 6);

  const buckets = [0, 0, 0, 0, 0];
  for (const m of matches) {
    if (m.score < 40)       buckets[0]++;
    else if (m.score < 60)  buckets[1]++;
    else if (m.score < 75)  buckets[2]++;
    else if (m.score < 90)  buckets[3]++;
    else                    buckets[4]++;
  }

  const scores = profiles.map((p) => p.resume_score ?? p.product_dna_score).filter((s): s is number => s != null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;

  const strongFit = matches.filter((m) => m.verdict === "strong_fit").length;
  const strongFitRate = matches.length > 0 ? Math.round((strongFit / matches.length) * 100) : 0;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Analytics
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Analytics & Insights
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          User engagement, match quality, top skills, and role mix across the platform.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="New users (7d)"    value={String(newUsersResult.count    ?? 0)} accent />
        <KPI label="Active users (7d)" value={String(activeUsersResult.count ?? 0)} />
        <KPI label="Avg resume score"  value={String(avgScore)} />
        <KPI label="Strong-fit rate"   value={`${strongFitRate}%`} delta={strongFitRate >= 25 ? "+ healthy" : "− low"} />
      </div>

      <SectionHeader title="AI artifacts" sub="What users actually generated" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <ArtifactTile label="Enhanced resumes" value={enhancedResult.count  ?? 0} sub="AI-reviewed & rewritten" />
        <ArtifactTile label="Tailored resumes" value={tailoredResult.count  ?? 0} sub="JD-matched outputs" />
        <ArtifactTile label="Resume snapshots" value={snapshotsResult.count ?? 0} sub="Version history entries" />
      </div>

      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}>
        <RankCard title="Top skills" items={topSkills} />
        <RankCard title="Role mix"   items={roleMix}   />
      </div>

      <div style={{
        marginTop: 22,
        display: "grid", gap: 16,
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
      }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Verdict breakdown · 30d</div>
          {verdicts.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>No match data in last 30 days.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {verdicts.map(({ label, count }) => {
                const p = Math.round((count / matches.length) * 100);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ fontWeight: 500 }}>{label}</span>
                      <span className="pm-num" style={{ color: "var(--text-3)" }}>{count} · {p}%</span>
                    </div>
                    <Bar pct={p} tone={label === "strong_fit" ? "ok" : label === "good_fit" ? "accent" : "neutral"} />
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Match score distribution · 30d</div>
          {matches.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-3)" }}>No match data yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "< 40 (poor)",     value: buckets[0] },
                { label: "40–59 (low)",      value: buckets[1] },
                { label: "60–74 (moderate)", value: buckets[2] },
                { label: "75–89 (good)",     value: buckets[3] },
                { label: "90+ (strong)",     value: buckets[4] },
              ].map(({ label, value }) => {
                const p = Math.round((value / matches.length) * 100);
                return (
                  <div key={label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span className="pm-mono" style={{ color: "var(--text-3)" }}>{label}</span>
                      <span className="pm-num">{value} · {p}%</span>
                    </div>
                    <Bar pct={p} tone="accent" />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function ArtifactTile({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <Card p={16}>
      <div className="pm-num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
        {value.toLocaleString("en-IN")}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>{sub}</div>
    </Card>
  );
}

function RankCard({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <Card>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>No data yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((i) => (
            <div key={i.label}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                <span style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.label}</span>
                <span className="pm-num" style={{ color: "var(--text-3)" }}>{i.count}</span>
              </div>
              <Bar pct={Math.max(4, (i.count / max) * 100)} tone="accent" />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Bar({ pct, tone }: { pct: number; tone: "ok" | "accent" | "neutral" }) {
  const fill =
    tone === "ok"      ? "var(--ok)" :
    tone === "neutral" ? "var(--text-3)" :
                         "var(--accent)";
  return (
    <div style={{ height: 6, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
      <div style={{
        height: "100%", borderRadius: 999,
        width: `${pct}%`,
        background: fill,
        transition: "width .5s ease",
      }}/>
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
