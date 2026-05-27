import type { Metadata } from "next";
import { LibraryBig, BookOpen, Zap, Calendar } from "lucide-react";
import { getDsaRoleStats } from "@prodmatch/shared";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  Badge, DataGrid, IdentityCell, MetricStrip, MiniMetric,
  MobileRecord, PageHeader, Panel, SectionDivider,
} from "@/components/admin/admin-ui";

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
      .limit(20) as any,
    admin.from("interview_study_plan").select("id", { count: "exact", head: true }),
    admin.from("interview_readiness").select("id", { count: "exact", head: true }),
  ]);

  const dispatches  = (dispatchResult.data  ?? []) as DispatchRow[];
  const dsaStats    = getDsaRoleStats();
  const totalDsa    = dsaStats.reduce((s, t) => s + t.problemCount, 0);
  const totalHard   = dsaStats.reduce((s, t) => s + t.hard, 0);
  const totalMedium = dsaStats.reduce((s, t) => s + t.medium, 0);
  const totalEasy   = dsaStats.reduce((s, t) => s + t.easy, 0);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-5 pb-28 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="Admin · Content"
        title="Content Management"
        description="DSA problem tracks, daily dispatches, and interview readiness content."
      />

      <MetricStrip>
        <MiniMetric label="DSA problems"    value={totalDsa} />
        <MiniMetric label="Role tracks"     value={dsaStats.length} />
        <MiniMetric label="Dispatched"      value={dispatchResult.count ?? dispatches.length} />
        <MiniMetric label="Study plans"     value={studyPlanResult.count ?? 0} />
      </MetricStrip>

      {/* Difficulty summary */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <DiffCard label="Easy"   value={totalEasy}   color="text-emerald-600 dark:text-emerald-400" bg="bg-emerald-500/10 border-emerald-500/20" />
        <DiffCard label="Medium" value={totalMedium} color="text-amber-600 dark:text-amber-400"   bg="bg-amber-500/10 border-amber-500/20" />
        <DiffCard label="Hard"   value={totalHard}   color="text-rose-600 dark:text-rose-400"     bg="bg-rose-500/10 border-rose-500/20" />
      </div>

      {/* DSA tracks */}
      <Panel icon={BookOpen} title="DSA role tracks" description={`${dsaStats.length} role-specific tracks`}>
        <DataGrid
          columns={["Track", "Problems", "Easy", "Medium", "Hard", "Top concepts"]}
          rows={dsaStats}
          getKey={(r) => r.role}
          empty="No DSA tracks configured."
          renderMobile={(r) => (
            <MobileRecord
              title={r.label}
              eyebrow={`${r.problemCount} problems`}
              status={<Badge tone="violet">{r.hard} hard</Badge>}
              meta={[
                ["Difficulty", `${r.easy}E / ${r.medium}M / ${r.hard}H`],
                ["Concepts",   r.concepts.slice(0, 3).join(", ")],
              ]}
            />
          )}
          renderCells={(r) => [
            <IdentityCell key="track"    title={r.label}  subtitle={r.role} />,
            <span key="total"            className="font-semibold tabular-nums">{r.problemCount}</span>,
            <span key="easy"             className="tabular-nums text-emerald-600 dark:text-emerald-400">{r.easy}</span>,
            <span key="medium"           className="tabular-nums text-amber-600 dark:text-amber-400">{r.medium}</span>,
            <span key="hard"             className="tabular-nums text-rose-600 dark:text-rose-400">{r.hard}</span>,
            <span key="concepts" className="max-w-[16rem] truncate text-xs text-muted-foreground">
              {r.concepts.slice(0, 4).join(", ")}
            </span>,
          ]}
        />
      </Panel>

      <SectionDivider title="Daily dispatch history" />

      {/* Dispatches */}
      <Panel icon={Calendar} title="Daily dispatch log" description="Recent problem dispatches sent to users">
        <DataGrid
          columns={["Problem slug", "Role tag", "Difficulty", "Sent at"]}
          rows={dispatches}
          getKey={(r) => `${r.problem_slug}-${r.sent_at}`}
          empty="No dispatches recorded yet."
          renderMobile={(r) => (
            <MobileRecord
              title={r.problem_slug}
              eyebrow={r.role_tag ?? "all roles"}
              status={
                r.difficulty
                  ? <Badge tone={
                      r.difficulty === "hard"   ? "rose" :
                      r.difficulty === "medium" ? "amber" : "green"
                    }>{r.difficulty}</Badge>
                  : undefined
              }
              meta={[
                ["Role", r.role_tag ?? "all"],
                ["Sent", r.sent_at ? new Date(r.sent_at).toLocaleDateString("en-IN") : "—"],
              ]}
            />
          )}
          renderCells={(r) => [
            <code key="slug" className="rounded bg-secondary px-1.5 py-0.5 text-xs">{r.problem_slug}</code>,
            <span key="role" className="text-sm">{r.role_tag ?? "all roles"}</span>,
            r.difficulty
              ? <Badge key="diff" tone={r.difficulty === "hard" ? "rose" : r.difficulty === "medium" ? "amber" : "green"}>
                  {r.difficulty}
                </Badge>
              : <span key="diff" className="text-muted-foreground">—</span>,
            <span key="sent" className="text-xs text-muted-foreground">
              {r.sent_at ? new Date(r.sent_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </span>,
          ]}
        />
      </Panel>

      {/* Readiness */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{studyPlanResult.count ?? 0}</p>
          <p className="text-sm font-medium">Active study plans</p>
          <p className="text-xs text-muted-foreground">Users with a personalized interview study plan</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-elev1">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <LibraryBig className="h-4 w-4" />
          </div>
          <p className="text-2xl font-bold tabular-nums">{readinessResult.count ?? 0}</p>
          <p className="text-sm font-medium">Readiness assessments</p>
          <p className="text-xs text-muted-foreground">Completed interview readiness checks</p>
        </div>
      </div>
    </div>
  );
}

function DiffCard({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-sm font-medium">{label} problems</p>
    </div>
  );
}
