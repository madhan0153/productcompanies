import type { Metadata } from "next";
import { getDsaRoleStats } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Content" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DispatchRow = {
  problem_slug: string;
  role_tag: string | null;
  sent_at: string | null;
  difficulty: string | null;
};

export default async function AdminContentPage() {
  const admin = createSupabaseAdminClient();

  const [dispatchResult, studyPlanResult, readinessResult] = await Promise.all([
    admin
      .from("interview_daily_dispatch")
      .select("problem_slug, role_tag, sent_at, difficulty")
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(20) as never,
    admin.from("interview_study_plan").select("id", { count: "exact", head: true }),
    admin.from("interview_readiness").select("id", { count: "exact", head: true }),
  ]);

  const dispatches  = ((dispatchResult as { data: DispatchRow[] | null; count: number | null }).data ?? []);
  const dispatchCnt = ((dispatchResult as { count: number | null }).count) ?? dispatches.length;
  const dsaStats    = getDsaRoleStats();
  const totalDsa    = dsaStats.reduce((s, t) => s + t.problemCount, 0);
  const totalHard   = dsaStats.reduce((s, t) => s + t.hard, 0);
  const totalMedium = dsaStats.reduce((s, t) => s + t.medium, 0);
  const totalEasy   = dsaStats.reduce((s, t) => s + t.easy, 0);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Content
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          Content Management
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          DSA problem tracks, daily dispatches, and interview readiness content.
        </p>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="DSA problems" value={totalDsa.toLocaleString("en-IN")} accent />
        <KPI label="Role tracks"  value={String(dsaStats.length)} />
        <KPI label="Dispatched"   value={String(dispatchCnt)} />
        <KPI label="Study plans"  value={String(studyPlanResult.count ?? 0)} />
      </div>

      <SectionHeader title="Difficulty mix" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <DiffTile label="Easy"   value={totalEasy}   tone="ok"   />
        <DiffTile label="Medium" value={totalMedium} tone="warn" />
        <DiffTile label="Hard"   value={totalHard}   tone="err"  />
      </div>

      <SectionHeader title="DSA role tracks" sub={`${dsaStats.length} role-specific tracks`} />
      <Card p={0}>
        {dsaStats.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No DSA tracks configured.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {dsaStats.map((r, i) => (
              <ListRow
                key={r.role}
                divider={i < dsaStats.length - 1}
                title={r.label}
                subtitle={`${r.role} · ${r.concepts.slice(0, 4).join(", ")}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="pm-num" style={{ fontSize: 13, fontWeight: 600 }}>{r.problemCount}</span>
                    <span style={{ display: "inline-flex", gap: 4, fontSize: 11 }}>
                      <span style={{ color: "var(--ok)" }} className="pm-num">{r.easy}E</span>
                      <span style={{ color: "var(--warn)" }} className="pm-num">{r.medium}M</span>
                      <span style={{ color: "var(--err)" }} className="pm-num">{r.hard}H</span>
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Daily dispatch history" sub="Recent problem dispatches sent to users" />
      <Card p={0}>
        {dispatches.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No dispatches recorded yet.
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {dispatches.map((r, i) => (
              <ListRow
                key={`${r.problem_slug}-${r.sent_at}`}
                divider={i < dispatches.length - 1}
                title={<span className="pm-mono">{r.problem_slug}</span>}
                subtitle={r.role_tag ?? "all roles"}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {r.difficulty && (
                      <Badge tone={r.difficulty === "hard" ? "err" : r.difficulty === "medium" ? "warn" : "ok"}>
                        {r.difficulty}
                      </Badge>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 80, textAlign: "right" }}>
                      {r.sent_at ? new Date(r.sent_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                    </span>
                  </span>
                }
              />
            ))}
          </div>
        )}
      </Card>

      <SectionHeader title="Readiness" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <Card p={16}>
          <div className="pm-num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
            {(studyPlanResult.count ?? 0).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>Active study plans</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Users with a personalized interview study plan
          </div>
        </Card>
        <Card p={16}>
          <div className="pm-num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
            {(readinessResult.count ?? 0).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>Readiness assessments</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 2 }}>
            Completed interview readiness checks
          </div>
        </Card>
      </div>
    </div>
  );
}

function DiffTile({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "err" }) {
  const bg = tone === "ok" ? "var(--ok-soft)" : tone === "warn" ? "var(--warn-soft)" : "var(--err-soft)";
  const fg = tone === "ok" ? "var(--ok)"      : tone === "warn" ? "var(--warn)"      : "var(--err)";
  return (
    <div style={{
      padding: 18, borderRadius: 14,
      background: bg, border: `1px solid ${fg}33`,
    }}>
      <div className="pm-num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, color: fg }}>
        {value.toLocaleString("en-IN")}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, color: "var(--text)" }}>{label} problems</div>
    </div>
  );
}
