import type { Metadata } from "next";
import Link from "next/link";
import {
  DSA_V2_ROLE_TRACKS,
  DSA_V2_BUCKET_TARGETS,
  DSA_V2_DIFFICULTY_TARGETS,
  DSA_V2_TOTAL_TARGET,
  dsaV2BankStats,
} from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, KPI, ListRow, SectionHeader } from "@/components/admin/pm";

export const metadata: Metadata = { title: "Admin · Content" };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DispatchRow = {
  problem_slug: string;
  role_track: string | null;
  day: string | null;
  difficulty: string | null;
};

type QuestionCountRow = {
  status: string;
  bucket: string;
  difficulty: string;
  primary_role: string;
};

export default async function AdminContentPage() {
  const admin = createSupabaseAdminClient();

  const [dispatchResult, studyPlanResult, readinessResult, questionsResult] = await Promise.all([
    admin
      .from("interview_daily_dispatch")
      .select("problem_slug, role_track, day, difficulty")
      .order("day", { ascending: false, nullsFirst: false })
      .limit(20) as never,
    admin.from("interview_study_plan").select("id", { count: "exact", head: true }),
    admin.from("interview_readiness").select("id", { count: "exact", head: true }),
    admin.from("dsa_questions").select("status, bucket, difficulty, primary_role") as never,
  ]);

  const dispatches  = ((dispatchResult as { data: DispatchRow[] | null }).data ?? []);
  const dispatchCnt = dispatches.length;

  const dbRows = ((questionsResult as { data: QuestionCountRow[] | null }).data ?? []);
  const dbStats = summariseDb(dbRows);
  const repoStats = dsaV2BankStats();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 96px" }}>
      <header style={{ marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--accent)" }}>
          Admin · Content
        </p>
        <h1 style={{ marginTop: 6, fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>
          DSA v2 Content Bank
        </h1>
        <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>
          Hand-authored question bank, review queue, and dispatch history. Target: {DSA_V2_TOTAL_TARGET} questions across 85% pure DSA · 10% AI-applied · 5% Indian product domain.
        </p>
        <div style={{ marginTop: 14 }}>
          <Link
            href="/admin/content/dsa/queue"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "10px 16px", borderRadius: 10,
              background: "var(--accent)", color: "var(--accent-fg, #fff)",
              fontSize: 13, fontWeight: 600, textDecoration: "none",
            }}
          >
            Open review queue →
          </Link>
        </div>
      </header>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <KPI label="Authored (repo)"  value={String(repoStats.total)}                          accent />
        <KPI label="Seeded to DB"     value={String(dbRows.length)}                            />
        <KPI label="Pending review"   value={String(dbStats.byStatus.pending_review ?? 0)}    />
        <KPI label="Live"             value={String(dbStats.byStatus.live ?? 0)}              />
        <KPI label="Dispatched (20d)" value={String(dispatchCnt)}                              />
      </div>

      <SectionHeader title="Difficulty mix vs target" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <DiffTile label="Easy"   actual={repoStats.byDifficulty.easy   ?? 0} target={DSA_V2_DIFFICULTY_TARGETS.easy}   tone="ok"   />
        <DiffTile label="Medium" actual={repoStats.byDifficulty.medium ?? 0} target={DSA_V2_DIFFICULTY_TARGETS.medium} tone="warn" />
        <DiffTile label="Hard"   actual={repoStats.byDifficulty.hard   ?? 0} target={DSA_V2_DIFFICULTY_TARGETS.hard}   tone="err"  />
      </div>

      <SectionHeader title="Bucket mix vs target" sub="85 / 10 / 5 — the v2 composition contract" />
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <BucketTile label="Pure DSA"        actual={repoStats.byBucket.pure_dsa      ?? 0} target={DSA_V2_BUCKET_TARGETS.pure_dsa}      />
        <BucketTile label="AI-applied"      actual={repoStats.byBucket.ai_applied    ?? 0} target={DSA_V2_BUCKET_TARGETS.ai_applied}    />
        <BucketTile label="Indian domain"   actual={repoStats.byBucket.indian_domain ?? 0} target={DSA_V2_BUCKET_TARGETS.indian_domain} />
      </div>

      <SectionHeader title="Role coverage" sub={`${DSA_V2_ROLE_TRACKS.length} role tracks`} />
      <Card p={0}>
        <div style={{ paddingBottom: 4 }}>
          {DSA_V2_ROLE_TRACKS.map((r, i) => {
            const authored = repoStats.byRole[r.role] ?? 0;
            return (
              <ListRow
                key={r.role}
                divider={i < DSA_V2_ROLE_TRACKS.length - 1}
                title={r.label}
                subtitle={`${r.role} · ${r.concepts.slice(0, 4).join(", ")}`}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span className="pm-num" style={{ fontSize: 13, fontWeight: 600 }}>{authored}</span>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>authored</span>
                  </span>
                }
              />
            );
          })}
        </div>
      </Card>

      <SectionHeader title="Daily dispatch history" sub="Recent question dispatches sent to users" />
      <Card p={0}>
        {dispatches.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
            No dispatches recorded yet. (Dispatch resumes once v2 bank has live questions.)
          </div>
        ) : (
          <div style={{ paddingBottom: 4 }}>
            {dispatches.map((r, i) => (
              <ListRow
                key={`${r.problem_slug}-${r.day}`}
                divider={i < dispatches.length - 1}
                title={<span className="pm-mono">{r.problem_slug}</span>}
                subtitle={r.role_track ?? "all roles"}
                trailing={
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    {r.difficulty && (
                      <Badge tone={r.difficulty === "hard" ? "err" : r.difficulty === "medium" ? "warn" : "ok"}>
                        {r.difficulty}
                      </Badge>
                    )}
                    <span style={{ fontSize: 11, color: "var(--text-3)", minWidth: 80, textAlign: "right" }}>
                      {r.day ? new Date(r.day).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
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
        </Card>
        <Card p={16}>
          <div className="pm-num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.6 }}>
            {(readinessResult.count ?? 0).toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>Readiness assessments</div>
        </Card>
      </div>
    </div>
  );
}

function summariseDb(rows: QuestionCountRow[]) {
  const byStatus: Record<string, number> = {};
  const byBucket: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byRole: Record<string, number> = {};
  for (const r of rows) {
    byStatus[r.status]         = (byStatus[r.status] ?? 0) + 1;
    byBucket[r.bucket]         = (byBucket[r.bucket] ?? 0) + 1;
    byDifficulty[r.difficulty] = (byDifficulty[r.difficulty] ?? 0) + 1;
    byRole[r.primary_role]     = (byRole[r.primary_role] ?? 0) + 1;
  }
  return { byStatus, byBucket, byDifficulty, byRole };
}

function DiffTile({ label, actual, target, tone }: { label: string; actual: number; target: number; tone: "ok" | "warn" | "err" }) {
  const bg = tone === "ok" ? "var(--ok-soft)" : tone === "warn" ? "var(--warn-soft)" : "var(--err-soft)";
  const fg = tone === "ok" ? "var(--ok)"      : tone === "warn" ? "var(--warn)"      : "var(--err)";
  return (
    <div style={{
      padding: 18, borderRadius: 14,
      background: bg, border: `1px solid ${fg}33`,
    }}>
      <div className="pm-num" style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.8, color: fg }}>
        {actual.toLocaleString("en-IN")}
        <span style={{ fontSize: 13, color: "var(--text-3)", marginLeft: 6 }}>/ {target}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2, color: "var(--text)" }}>{label}</div>
    </div>
  );
}

function BucketTile({ label, actual, target }: { label: string; actual: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
  return (
    <Card p={16}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{label}</div>
        <div className="pm-num" style={{ fontSize: 12, color: "var(--text-3)" }}>
          {actual} / {target}
        </div>
      </div>
      <div style={{
        marginTop: 8, height: 6, borderRadius: 3,
        background: "var(--line)",
      }}>
        <div style={{
          width: `${pct}%`, height: "100%", borderRadius: 3,
          background: "var(--accent)",
        }} />
      </div>
    </Card>
  );
}
