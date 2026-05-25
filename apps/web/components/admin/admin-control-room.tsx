"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  DatabaseZap,
  Download,
  FileText,
  Gauge,
  KeyRound,
  LibraryBig,
  ListFilter,
  LockKeyhole,
  Radar,
  RefreshCw,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "violet" | "rose" | "muted";
type State = "ok" | "warn" | "danger" | "muted";

export type AdminControlRoomData = {
  filters: { userQuery: string; jobQuery: string };
  hero: {
    generatedAt: string;
    fleetGrade: string;
    fleetScore: number;
    activeQueue: number;
    atRiskCompanies: number;
  };
  metrics: Array<{ id: string; label: string; value: string; detail: string; trend: string; tone: Tone }>;
  health: Array<{ label: string; value: string; detail: string; state: "ok" | "warn" }>;
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    targetRoles: string[];
    joinedAt: string | null;
    lastSignInAt: string | null;
    suspended: boolean;
    hasResume: boolean;
    resumeState: "failed" | "parsing" | "parsed" | "missing";
    resumeScore: number | null;
    lastMatchComputeAt: string | null;
  }>;
  resumes: Array<{
    id: string;
    candidate: string;
    role: string;
    score: number | null;
    state: "failed" | "parsing" | "ready";
    updatedAt: string;
    error: string | null;
  }>;
  jobs: Array<{
    id: string;
    title: string;
    company: string;
    companySlug: string | null;
    location: string;
    active: boolean;
    quality: number;
    parsed: boolean;
    ghost: boolean;
    applyClicks: number;
    role: string;
    lastSeenAt: string | null;
  }>;
  matches: Array<{
    id: string;
    role: string;
    company: string;
    score: number;
    confidence: number | null;
    verdict: string;
    computedAt: string;
    hidden: boolean;
  }>;
  crawler: {
    companies: number;
    runs: number;
    atRisk: number;
    rows: Array<{
      slug: string;
      name: string;
      status: string;
      score: number;
      lastRunAt: string | null;
      jobsNew: number;
      jobsUpdated: number;
      action: string;
    }>;
  };
  llm: {
    providers: Array<{ id: string; label: string; keys: number; supportsPdf: boolean; models: string[] }>;
    operations: Array<{ id: string; label: string; capability: string; fallback: string; deterministic: string }>;
    deadKeys: Array<{ provider: string; model: string; capability: string; failure: string; deadUntil: string; detectedAt: string }>;
  };
  analytics: {
    topSkills: Array<{ label: string; count: number }>;
    roleMix: Array<{ label: string; count: number }>;
    resumeArtifacts: number;
    snapshots: number;
  };
  content: {
    dsaProblems: number;
    dispatches: number;
    tracks: Array<{ role: string; label: string; problems: number; easy: number; medium: number; hard: number; concepts: string[] }>;
  };
  settings: Array<{ key: string; enabled: boolean; detail: string; inverted?: boolean }>;
  security: {
    jobs: Array<{ id: string; type: string; status: string; userId: string; queuedAt: string; error: string | null }>;
    dpdp: Array<{ event: string; userId: string | null; createdAt: string; metadata: string }>;
  };
  exports: { usersCsv: string; jobsCsv: string };
};

type IconType = ComponentType<{ className?: string }>;

const SECTIONS = [
  { id: "users", label: "Users", icon: Users },
  { id: "resumes", label: "Resumes", icon: FileText },
  { id: "jobs", label: "Jobs", icon: Briefcase },
  { id: "crawler", label: "Crawler", icon: Radar },
  { id: "llm", label: "LLM", icon: BrainCircuit },
  { id: "analytics", label: "Insights", icon: BarChart3 },
  { id: "content", label: "Content", icon: LibraryBig },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "security", label: "Security", icon: ShieldAlert },
] as const;

const toneClass: Record<Tone, string> = {
  blue: "border-sky-500/25 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  green: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  violet: "border-indigo-500/25 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  muted: "border-border bg-secondary/60 text-muted-foreground",
};

const stateClass: Record<State, string> = {
  ok: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  muted: "border-border bg-secondary/60 text-muted-foreground",
};

const metricIcons: Record<string, IconType> = {
  users: Users,
  resumes: FileText,
  jobs: Briefcase,
  llm: BrainCircuit,
};

export function AdminControlRoom({ data }: { data: AdminControlRoomData }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState<string | null>(null);

  const appear = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
      };

  const quickStats = useMemo(
    () => [
      { label: "Fleet", value: `${data.hero.fleetGrade}${data.hero.fleetScore}`, tone: data.hero.atRiskCompanies > 0 ? "warn" : "ok" },
      { label: "Queue", value: data.hero.activeQueue.toLocaleString("en-IN"), tone: data.hero.activeQueue > 0 ? "warn" : "ok" },
      { label: "Risk", value: data.hero.atRiskCompanies.toLocaleString("en-IN"), tone: data.hero.atRiskCompanies > 0 ? "danger" : "ok" },
    ] satisfies Array<{ label: string; value: string; tone: State }>,
    [data.hero],
  );

  const attention = useMemo(() => buildAttention(data), [data]);
  const settingsHealthy = data.settings.filter((setting) => (setting.inverted ? !setting.enabled : setting.enabled)).length;

  async function copyValue(id: string, value: string) {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-foreground">
      <MobileCommandBar data={data} stats={quickStats} />

      <div className="mx-auto w-full max-w-[1480px] px-3 py-4 sm:px-6 lg:px-8">
        <motion.header {...appear} className="overflow-hidden rounded-md border border-border bg-card shadow-elev1">
          <div className="grid gap-0 lg:grid-cols-[1fr_24rem]">
            <div className="p-4 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={data.hero.atRiskCompanies > 0 ? "warn" : "ok"}>
                  {data.hero.atRiskCompanies > 0 ? `${data.hero.atRiskCompanies} companies at risk` : "Fleet healthy"}
                </Badge>
                <Badge tone="muted">Synced {timeAgo(data.hero.generatedAt)}</Badge>
              </div>
              <h1 className="mt-4 text-2xl font-semibold sm:text-4xl">Admin command center</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Monitor users, resumes, jobs, crawler reliability, AI routing, DPDP audit trails, and exportable operational records from one live surface.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryLink href="/admin/crawler-intel" icon={DatabaseZap}>Crawler intel</PrimaryLink>
                <PrimaryLink href="/admin/ai-ops" icon={BrainCircuit}>AI ops</PrimaryLink>
                <PrimaryLink href="/admin/health" icon={Activity}>Operations</PrimaryLink>
              </div>
            </div>

            <div className="border-t border-border bg-secondary/25 p-4 lg:border-l lg:border-t-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={cn("absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60", reduce ? "" : "animate-ping")} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                Live operations
              </div>
              <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border">
                {quickStats.map((stat) => (
                  <div key={stat.label} className="bg-card p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-1 text-lg font-semibold tabular-nums">{stat.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-3">
                {data.health.map((item) => (
                  <HealthLine key={item.label} item={item} />
                ))}
              </div>
            </div>
          </div>
        </motion.header>

        <motion.div {...appear} className="sticky top-0 z-20 mt-3 hidden rounded-md border border-border bg-background/92 p-1.5 backdrop-blur-xl md:block">
          <nav aria-label="Admin sections" className="flex flex-wrap gap-1">
            {SECTIONS.map((section) => (
              <SectionChip key={section.id} section={section} />
            ))}
          </nav>
        </motion.div>

        <motion.section {...appear} className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricTile key={metric.id} metric={metric} />
          ))}
        </motion.section>

        <motion.section {...appear} className="mt-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <CommandPanel title="Needs attention" icon={AlertTriangle} action={<Badge tone={attention.some((item) => item.tone === "danger") ? "danger" : attention.some((item) => item.tone === "warn") ? "warn" : "ok"}>{attention.length} checks</Badge>}>
            <div className="divide-y divide-border">
              {attention.map((item) => (
                <AttentionRow key={item.id} item={item} />
              ))}
            </div>
          </CommandPanel>

          <CommandPanel title="Operating posture" icon={Gauge} action={<Badge tone={data.hero.activeQueue > 0 ? "warn" : "ok"}>{data.hero.activeQueue} queued</Badge>}>
            <div className="grid grid-cols-2 gap-2">
              <MiniMetric label="Active jobs" value={data.jobs.filter((job) => job.active).length} />
              <MiniMetric label="Parsed jobs" value={data.jobs.filter((job) => job.parsed).length} />
              <MiniMetric label="Settings ok" value={`${settingsHealthy}/${data.settings.length}`} />
              <MiniMetric label="DPDP events" value={data.security.dpdp.length} />
            </div>
            <div className="mt-4">
              <p className="mb-2 text-sm font-medium">Quality pulse</p>
              <Sparkline values={data.jobs.slice(0, 18).map((job) => job.quality)} />
            </div>
          </CommandPanel>
        </motion.section>

        <Filters userQuery={data.filters.userQuery} jobQuery={data.filters.jobQuery} />

        <div className="mt-4 space-y-4">
          <Panel id="users" icon={Users} title="User Management" action={<CsvButton filename="prodmatch-users.csv" csv={data.exports.usersCsv} />}>
            <DataGrid
              columns={["User", "Resume", "Role", "Last compute", "Status"]}
              rows={data.users}
              getKey={(row) => row.id}
              empty="No users match the active filter."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.name ?? row.email}
                  eyebrow={row.email}
                  status={<Badge tone={row.suspended ? "danger" : "ok"}>{row.suspended ? "Suspended" : "Active"}</Badge>}
                  meta={[
                    ["Role", row.role],
                    ["Resume", row.hasResume ? `${row.resumeState}${row.resumeScore ? ` / ${row.resumeScore}` : ""}` : "Missing"],
                    ["Last compute", timeAgo(row.lastMatchComputeAt)],
                  ]}
                  action={<CopyButton copied={copied === row.id} onClick={() => copyValue(row.id, row.id)} />}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="user" title={row.name ?? row.email} subtitle={`${row.email} / joined ${dateShort(row.joinedAt)}`} />,
                <Badge key="resume" tone={resumeTone(row.resumeState)}>{row.resumeState}{row.resumeScore ? ` / ${row.resumeScore}` : ""}</Badge>,
                <IdentityCell key="role" title={row.role} subtitle={row.targetRoles.slice(0, 2).join(", ") || "No target role"} />,
                <span key="compute" className="text-xs text-muted-foreground">{timeAgo(row.lastMatchComputeAt)}</span>,
                <Badge key="status" tone={row.suspended ? "danger" : "ok"}>{row.suspended ? "Suspended" : "Active"}</Badge>,
              ]}
            />
          </Panel>

          <Panel id="resumes" icon={FileText} title="Resume Management">
            <MetricStrip>
              <MiniMetric label="Artifacts" value={data.analytics.resumeArtifacts} />
              <MiniMetric label="Snapshots" value={data.analytics.snapshots} />
              <MiniMetric label="Ready" value={data.resumes.filter((row) => row.state === "ready").length} />
              <MiniMetric label="Attention" value={data.resumes.filter((row) => row.state !== "ready").length} />
            </MetricStrip>
            <DataGrid
              columns={["Candidate", "Score", "State", "Updated", "Error"]}
              rows={data.resumes}
              getKey={(row) => row.id}
              empty="No uploaded resumes yet."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.candidate}
                  eyebrow={row.role}
                  status={<Badge tone={row.state === "failed" ? "danger" : row.state === "parsing" ? "warn" : "ok"}>{row.state}</Badge>}
                  meta={[
                    ["Score", row.score == null ? "-" : String(row.score)],
                    ["Updated", dateShort(row.updatedAt)],
                    ["Error", row.error ?? "-"],
                  ]}
                  action={<CopyButton copied={copied === row.id} onClick={() => copyValue(row.id, row.id)} />}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="candidate" title={row.candidate} subtitle={row.role} />,
                <span key="score" className="font-semibold tabular-nums">{row.score ?? "-"}</span>,
                <Badge key="state" tone={row.state === "failed" ? "danger" : row.state === "parsing" ? "warn" : "ok"}>{row.state}</Badge>,
                <span key="updated" className="text-xs text-muted-foreground">{dateShort(row.updatedAt)}</span>,
                <span key="error" className="block max-w-[16rem] truncate text-xs text-muted-foreground">{row.error ?? "-"}</span>,
              ]}
            />
          </Panel>

          <Panel id="jobs" icon={Briefcase} title="Job & Match Management" action={<CsvButton filename="prodmatch-jobs.csv" csv={data.exports.jobsCsv} />}>
            <DataGrid
              columns={["Role", "Quality", "Enrichment", "Apply intent", "Last seen"]}
              rows={data.jobs}
              getKey={(row) => row.id}
              empty="No jobs match the active filter."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.title}
                  eyebrow={`${row.company} / ${row.location}`}
                  status={<Badge tone={row.ghost ? "danger" : row.parsed ? "ok" : "warn"}>{row.ghost ? "Ghost" : row.parsed ? "Parsed" : "Pending"}</Badge>}
                  meta={[
                    ["Quality", String(row.quality)],
                    ["Apply clicks", String(row.applyClicks)],
                    ["Last seen", timeAgo(row.lastSeenAt)],
                  ]}
                  action={<Progress value={row.quality} />}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="role" title={row.title} subtitle={`${row.company} / ${row.location}`} />,
                <Progress key="quality" value={row.quality} />,
                <div key="enrich" className="flex flex-wrap gap-1.5">
                  <Badge tone={row.parsed ? "ok" : "warn"}>{row.parsed ? "JD parsed" : "Pending"}</Badge>
                  {row.ghost ? <Badge tone="danger">Ghost</Badge> : null}
                </div>,
                <span key="apply" className="font-semibold tabular-nums">{row.applyClicks}</span>,
                <span key="seen" className="text-xs text-muted-foreground">{timeAgo(row.lastSeenAt)}</span>,
              ]}
            />

            <SectionDivider title="Recent matches" />
            <DataGrid
              columns={["Role", "Score", "Verdict", "Computed", "State"]}
              rows={data.matches}
              getKey={(row) => row.id}
              empty="No match rows yet."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.role}
                  eyebrow={row.company}
                  status={<Badge tone={row.hidden ? "warn" : "ok"}>{row.hidden ? "Hidden" : "Visible"}</Badge>}
                  meta={[
                    ["Score", `${row.score}${row.confidence ? ` / ${row.confidence} conf` : ""}`],
                    ["Verdict", row.verdict],
                    ["Computed", timeAgo(row.computedAt)],
                  ]}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="role" title={row.role} subtitle={row.company} />,
                <span key="score" className="tabular-nums">{row.score}{row.confidence ? ` / ${row.confidence}` : ""}</span>,
                <Badge key="verdict" tone={row.verdict === "strong_fit" ? "ok" : "muted"}>{row.verdict}</Badge>,
                <span key="computed" className="text-xs text-muted-foreground">{timeAgo(row.computedAt)}</span>,
                <Badge key="state" tone={row.hidden ? "warn" : "ok"}>{row.hidden ? "Hidden" : "Visible"}</Badge>,
              ]}
            />
          </Panel>

          <Panel id="crawler" icon={Radar} title="Crawler Management" action={<PrimaryLink href="/admin/crawler-intel" icon={ArrowUpRight}>Open intel</PrimaryLink>}>
            <MetricStrip>
              <MiniMetric label="Companies" value={data.crawler.companies} />
              <MiniMetric label="Runs" value={data.crawler.runs} />
              <MiniMetric label="At risk" value={data.crawler.atRisk} />
            </MetricStrip>
            <DataGrid
              columns={["Company", "Status", "Score", "Run delta", "Recommendation"]}
              rows={data.crawler.rows}
              getKey={(row) => row.slug}
              empty="No crawler metadata found."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.name}
                  eyebrow={`Last run ${timeAgo(row.lastRunAt)}`}
                  status={<Badge tone={statusTone(row.status)}>{row.status}</Badge>}
                  meta={[
                    ["Score", String(row.score)],
                    ["New/updated", `+${row.jobsNew} / ${row.jobsUpdated}`],
                    ["Action", row.action],
                  ]}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="company" title={row.name} subtitle={`Last run ${timeAgo(row.lastRunAt)}`} />,
                <Badge key="status" tone={statusTone(row.status)}>{row.status}</Badge>,
                <Progress key="score" value={row.score} />,
                <span key="delta" className="text-xs tabular-nums">+{row.jobsNew} / {row.jobsUpdated}</span>,
                <span key="action" className="text-xs text-muted-foreground">{row.action}</span>,
              ]}
            />
          </Panel>

          <Panel id="llm" icon={BrainCircuit} title="LLM & Parsing Management" action={<PrimaryLink href="/admin/ai-ops" icon={ArrowUpRight}>Provider matrix</PrimaryLink>}>
            <div className="grid gap-3 lg:grid-cols-2">
              <InlineGroup title="Configured providers" icon={KeyRound}>
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.llm.providers.length === 0 ? (
                    <EmptyBlock text="No external providers configured." />
                  ) : data.llm.providers.map((provider) => (
                    <ProviderTile key={provider.id} provider={provider} />
                  ))}
                </div>
              </InlineGroup>
              <InlineGroup title="Routing operations" icon={Sparkles}>
                <div className="divide-y divide-border rounded-md border border-border">
                  {data.llm.operations.slice(0, 8).map((operation) => (
                    <div key={operation.id} className="grid gap-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                      <IdentityCell title={operation.label} subtitle={`${operation.capability} / ${operation.deterministic}`} />
                      <Badge tone={operation.fallback === "allowed" ? "ok" : "muted"}>{operation.fallback}</Badge>
                    </div>
                  ))}
                  {data.llm.operations.length === 0 ? <EmptyBlock text="No operations registered." /> : null}
                </div>
              </InlineGroup>
            </div>

            <SectionDivider title="Dead key quarantine" />
            <DataGrid
              columns={["Provider", "Capability", "Failure", "Dead until"]}
              rows={data.llm.deadKeys}
              getKey={(row) => `${row.provider}-${row.model}-${row.detectedAt}`}
              empty="No dead keys currently quarantined."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.provider}
                  eyebrow={row.model}
                  status={<Badge tone="danger">{row.failure}</Badge>}
                  meta={[
                    ["Capability", row.capability],
                    ["Dead until", timeAgo(row.deadUntil)],
                    ["Detected", timeAgo(row.detectedAt)],
                  ]}
                />
              )}
              renderCells={(row) => [
                <IdentityCell key="provider" title={row.provider} subtitle={row.model} />,
                <Badge key="capability" tone="muted">{row.capability}</Badge>,
                <Badge key="failure" tone="danger">{row.failure}</Badge>,
                <span key="dead" className="text-xs text-muted-foreground">{timeAgo(row.deadUntil)}</span>,
              ]}
            />
          </Panel>

          <Panel id="analytics" icon={BarChart3} title="Analytics & Insights">
            <div className="grid gap-3 lg:grid-cols-2">
              <RankList title="Top skills" items={data.analytics.topSkills} />
              <RankList title="Role mix" items={data.analytics.roleMix} />
            </div>
          </Panel>

          <Panel id="content" icon={LibraryBig} title="Content Management">
            <MetricStrip>
              <MiniMetric label="DSA problems" value={data.content.dsaProblems} />
              <MiniMetric label="Role tracks" value={data.content.tracks.length} />
              <MiniMetric label="Dispatches" value={data.content.dispatches} />
              <MiniMetric label="Hard problems" value={data.content.tracks.reduce((sum, track) => sum + track.hard, 0)} />
            </MetricStrip>
            <DataGrid
              columns={["Track", "Problems", "Difficulty", "Concepts"]}
              rows={data.content.tracks}
              getKey={(row) => row.role}
              empty="No DSA tracks configured."
              renderMobile={(row) => (
                <MobileRecord
                  title={row.label}
                  eyebrow={`${row.problems} problems`}
                  status={<Badge tone="violet">{row.hard} hard</Badge>}
                  meta={[
                    ["Mix", `${row.hard} hard / ${row.medium} medium / ${row.easy} easy`],
                    ["Concepts", row.concepts.join(", ")],
                  ]}
                />
              )}
              renderCells={(row) => [
                <span key="track" className="font-medium">{row.label}</span>,
                <span key="problems" className="tabular-nums">{row.problems}</span>,
                <span key="difficulty" className="text-xs text-muted-foreground">{row.hard} hard / {row.medium} medium / {row.easy} easy</span>,
                <span key="concepts" className="text-xs text-muted-foreground">{row.concepts.join(", ")}</span>,
              ]}
            />
          </Panel>

          <Panel id="settings" icon={Settings} title="Settings">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {data.settings.map((setting) => {
                const healthy = setting.inverted ? !setting.enabled : setting.enabled;
                return (
                  <div key={setting.key} className="rounded-md border border-border bg-secondary/25 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <code className="break-all text-xs">{setting.key}</code>
                      {healthy ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="h-4 w-4 shrink-0 text-amber-500" />}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{setting.detail}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel id="security" icon={ShieldAlert} title="Activity Logs & Security">
            <div className="grid gap-3 xl:grid-cols-2">
              <InlineGroup title="Background jobs" icon={RefreshCw}>
                <DataGrid
                  columns={["Type", "Status", "User", "Queued", "Error"]}
                  rows={data.security.jobs}
                  getKey={(row) => row.id}
                  empty="No background jobs found."
                  renderMobile={(row) => (
                    <MobileRecord
                      title={row.type}
                      eyebrow={row.userId.slice(0, 8)}
                      status={<Badge tone={row.status === "failed" ? "danger" : row.status === "succeeded" ? "ok" : "warn"}>{row.status}</Badge>}
                      meta={[
                        ["Queued", timeAgo(row.queuedAt)],
                        ["Error", row.error ?? "-"],
                      ]}
                    />
                  )}
                  renderCells={(row) => [
                    <span key="type">{row.type}</span>,
                    <Badge key="status" tone={row.status === "failed" ? "danger" : row.status === "succeeded" ? "ok" : "warn"}>{row.status}</Badge>,
                    <span key="user" className="text-xs">{row.userId.slice(0, 8)}</span>,
                    <span key="queued" className="text-xs text-muted-foreground">{timeAgo(row.queuedAt)}</span>,
                    <span key="error" className="block max-w-[14rem] truncate text-xs text-muted-foreground">{row.error ?? "-"}</span>,
                  ]}
                />
              </InlineGroup>
              <InlineGroup title="DPDP audit" icon={LockKeyhole}>
                <DataGrid
                  columns={["Event", "User", "When", "Metadata"]}
                  rows={data.security.dpdp}
                  getKey={(row) => `${row.event}-${row.createdAt}`}
                  empty="No DPDP events recorded."
                  renderMobile={(row) => (
                    <MobileRecord
                      title={row.event}
                      eyebrow={row.userId?.slice(0, 8) ?? "system"}
                      status={<Badge tone="muted">Audit</Badge>}
                      meta={[
                        ["When", timeAgo(row.createdAt)],
                        ["Metadata", row.metadata],
                      ]}
                    />
                  )}
                  renderCells={(row) => [
                    <Badge key="event" tone="muted">{row.event}</Badge>,
                    <span key="user" className="text-xs">{row.userId?.slice(0, 8) ?? "-"}</span>,
                    <span key="when" className="text-xs text-muted-foreground">{timeAgo(row.createdAt)}</span>,
                    <span key="metadata" className="block max-w-[14rem] truncate text-xs text-muted-foreground">{row.metadata}</span>,
                  ]}
                />
              </InlineGroup>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function MobileCommandBar({
  data,
  stats,
}: {
  data: AdminControlRoomData;
  stats: Array<{ label: string; value: string; tone: State }>;
}) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-background/94 backdrop-blur-xl md:hidden">
      <div className="px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-primary">Control Room</p>
            <h1 className="truncate text-lg font-semibold">ProdMatch Admin</h1>
            <p className="truncate text-xs text-muted-foreground">Updated {timeAgo(data.hero.generatedAt)}</p>
          </div>
          <LinkIcon href="/admin/health" icon={Activity} label="Operations" />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-card px-2.5 py-2">
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              <p className="mt-0.5 text-sm font-semibold tabular-nums">{stat.value}</p>
            </div>
          ))}
        </div>
        <nav aria-label="Admin sections" className="no-scrollbar -mx-3 mt-3 flex gap-1 overflow-x-auto px-3 pb-1">
          {SECTIONS.map((section) => (
            <SectionChip key={section.id} section={section} compact />
          ))}
        </nav>
      </div>
    </div>
  );
}

function CommandPanel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: IconType;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-card shadow-elev1">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="truncate text-sm font-semibold">{title}</h2>
        </div>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  );
}

function AttentionRow({ item }: { item: { title: string; detail: string; tone: State; icon: IconType; href: string } }) {
  const Icon = item.icon;
  return (
    <a href={item.href} className="grid gap-3 px-1 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-md border", stateClass[item.tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
    </a>
  );
}

function SectionChip({
  section,
  compact = false,
}: {
  section: (typeof SECTIONS)[number];
  compact?: boolean;
}) {
  const Icon = section.icon;
  return (
    <a
      href={`#${section.id}`}
      className={cn(
        "press inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-card text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-ring",
        compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {section.label}
    </a>
  );
}

function Filters({ userQuery, jobQuery }: { userQuery: string; jobQuery: string }) {
  return (
    <form action="/admin" className="mt-4 rounded-md border border-border bg-card p-2 shadow-elev1">
      <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
        <SearchField name="q" icon={Users} placeholder="Search users" defaultValue={userQuery} />
        <SearchField name="job" icon={Briefcase} placeholder="Filter jobs" defaultValue={jobQuery} />
        <button className="press inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground focus-ring">
          <ListFilter className="h-4 w-4" />
          Apply
        </button>
      </div>
    </form>
  );
}

function SearchField({
  name,
  icon: Icon,
  placeholder,
  defaultValue,
}: {
  name: string;
  icon: IconType;
  placeholder: string;
  defaultValue: string;
}) {
  return (
    <label className="relative block">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
      />
      <Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground md:hidden" />
    </label>
  );
}

function MetricTile({ metric }: { metric: AdminControlRoomData["metrics"][number] }) {
  const Icon = metricIcons[metric.id] ?? Gauge;
  return (
    <a href={`#${metric.id}`} className="lift rounded-md border border-border bg-card p-4 shadow-elev1 focus-ring">
      <div className="flex items-start justify-between gap-3">
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-md border", toneClass[metric.tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="max-w-[9rem] text-right text-[11px] text-muted-foreground">{metric.trend}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{metric.value}</p>
      <p className="mt-1 text-sm font-medium">{metric.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
    </a>
  );
}

function HealthLine({ item }: { item: AdminControlRoomData["health"][number] }) {
  return (
    <div className="grid grid-cols-[1fr_auto] gap-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{item.label}</p>
        <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
      </div>
      <Badge tone={item.state === "ok" ? "ok" : "warn"}>{item.value}</Badge>
    </div>
  );
}

function Panel({
  id,
  icon: Icon,
  title,
  action,
  children,
}: {
  id: string;
  icon: IconType;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.section
      id={id}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-96px" }}
      transition={{ duration: reduce ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-36 rounded-md border border-border bg-card p-3 shadow-elev1 sm:p-4"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary-soft-foreground">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">Live production data</p>
          </div>
        </div>
        {action}
      </header>
      {children}
    </motion.section>
  );
}

function MetricStrip({ children }: { children: ReactNode }) {
  return <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">{children}</div>;
}

function InlineGroup({ title, icon: Icon, children }: { title: string; icon: IconType; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-medium">{title}</p>
      </div>
      {children}
    </section>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="my-4 flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function DataGrid<T>({
  columns,
  rows,
  getKey,
  renderCells,
  renderMobile,
  empty,
}: {
  columns: string[];
  rows: T[];
  getKey: (row: T) => string;
  renderCells: (row: T) => ReactNode[];
  renderMobile: (row: T) => ReactNode;
  empty: string;
}) {
  if (rows.length === 0) return <EmptyBlock text={empty} />;
  return (
    <>
      <div className="grid gap-2 md:hidden">
        {rows.map((row) => (
          <div key={getKey(row)}>{renderMobile(row)}</div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-md border border-border bg-background/40 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-[11px] uppercase text-muted-foreground">
            <tr>
              {columns.map((column) => (
                <th key={column} className="whitespace-nowrap px-3 py-2 font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row) => (
              <tr key={getKey(row)} className="align-middle transition-colors hover:bg-secondary/25">
                {renderCells(row).map((cell, index) => (
                  <td key={index} className="max-w-[24rem] px-3 py-3">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MobileRecord({
  title,
  eyebrow,
  status,
  meta,
  action,
}: {
  title: string;
  eyebrow: string;
  status?: ReactNode;
  meta: Array<[string, string]>;
  action?: ReactNode;
}) {
  return (
    <article className="rounded-md border border-border bg-background/55 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{eyebrow}</p>
        </div>
        {status}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {meta.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-md bg-secondary/45 px-2 py-2">
            <dt className="text-[10px] uppercase text-muted-foreground">{label}</dt>
            <dd className="mt-1 truncate text-xs font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}

function IdentityCell({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-medium">{title}</p>
      {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/30 p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function ProviderTile({ provider }: { provider: AdminControlRoomData["llm"]["providers"][number] }) {
  return (
    <div className="rounded-md border border-border bg-secondary/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <IdentityCell title={provider.label} subtitle={provider.models.join(", ") || "Embedding only"} />
        <Badge tone={provider.keys > 0 ? "ok" : "warn"}>{provider.keys} keys</Badge>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{provider.supportsPdf ? "PDF capable" : "Text only"}</p>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <section className="rounded-md border border-border bg-secondary/25 p-4">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <EmptyBlock text="No data yet." /> : items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium">{item.label}</span>
              <span className="tabular-nums text-muted-foreground">{item.count}</span>
            </div>
            <div className="h-2 rounded-full bg-background">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const reduce = useReducedMotion();
  const clean = values.length > 1 ? values : [30, 44, 40, 55, 62, 58, 70, 72, 68, 76];
  const width = 320;
  const height = 86;
  const min = Math.min(...clean, 0);
  const max = Math.max(...clean, 100);
  const x = (index: number) => (index / Math.max(1, clean.length - 1)) * width;
  const y = (value: number) => height - 10 - ((value - min) / Math.max(1, max - min)) * (height - 20);
  const path = clean.map((value, index) => `${index === 0 ? "M" : "L"} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-24 w-full overflow-hidden rounded-md bg-secondary/35">
      <defs>
        <linearGradient id="adminSparkArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.3, 0.62].map((line) => (
        <line key={line} x1="0" x2={width} y1={height * line} y2={height * line} stroke="hsl(var(--border))" strokeDasharray="3 4" />
      ))}
      <motion.path
        d={area}
        fill="url(#adminSparkArea)"
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 0.35 }}
      />
      <motion.path
        d={path}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-md border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function Badge({ tone, children }: { tone: State | Tone; children: ReactNode }) {
  const cls = tone in stateClass ? stateClass[tone as State] : toneClass[tone as Tone];
  return <span className={cn("inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", cls)}>{children}</span>;
}

function Progress({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="min-w-28">
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Score</span>
        <span className="tabular-nums">{clamped}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={reduce ? false : { width: 0 }}
          whileInView={{ width: `${clamped}%` }}
          viewport={{ once: true }}
          transition={{ duration: reduce ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-primary"
        />
      </div>
    </div>
  );
}

function PrimaryLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: IconType;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="press inline-flex h-10 items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 focus-ring">
      <Icon className="h-4 w-4" />
      {children}
    </Link>
  );
}

function LinkIcon({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: IconType;
  label: string;
}) {
  return (
    <Link href={href} aria-label={label} className="press inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground focus-ring">
      <Icon className="h-4 w-4" />
    </Link>
  );
}

function CsvButton({ filename, csv }: { filename: string; csv: string }) {
  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={filename}
      className="press inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus-ring"
    >
      <Download className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Export</span>
    </a>
  );
}

function CopyButton({ copied, onClick }: { copied: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground focus-ring"
    >
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy ID"}
    </button>
  );
}

function buildAttention(data: AdminControlRoomData) {
  const failedResumes = data.resumes.filter((resume) => resume.state === "failed").length;
  const pendingResumes = data.resumes.filter((resume) => resume.state === "parsing").length;
  const pendingJobs = data.jobs.filter((job) => !job.parsed || job.ghost).length;
  const failedJobs = data.security.jobs.filter((job) => job.status === "failed").length;
  const unhealthySettings = data.settings.filter((setting) => !(setting.inverted ? !setting.enabled : setting.enabled)).length;

  const items = [
    {
      id: "resume-failures",
      title: failedResumes > 0 ? `${failedResumes} resume parses failed` : "Resume parsing stable",
      detail: pendingResumes > 0 ? `${pendingResumes} resumes are still parsing` : "No active parsing backlog in the visible rows",
      tone: failedResumes > 0 ? "danger" : pendingResumes > 0 ? "warn" : "ok",
      icon: FileText,
      href: "#resumes",
    },
    {
      id: "job-enrichment",
      title: pendingJobs > 0 ? `${pendingJobs} jobs need enrichment review` : "Job enrichment clean",
      detail: `${data.jobs.filter((job) => job.ghost).length} ghost flags across visible jobs`,
      tone: pendingJobs > 0 ? "warn" : "ok",
      icon: Briefcase,
      href: "#jobs",
    },
    {
      id: "crawler-risk",
      title: data.crawler.atRisk > 0 ? `${data.crawler.atRisk} crawler sources at risk` : "Crawler source health is steady",
      detail: `${data.crawler.runs} runs across ${data.crawler.companies} approved companies`,
      tone: data.crawler.atRisk > 0 ? "danger" : "ok",
      icon: Radar,
      href: "#crawler",
    },
    {
      id: "llm-dead-keys",
      title: data.llm.deadKeys.length > 0 ? `${data.llm.deadKeys.length} LLM keys quarantined` : "No LLM dead keys",
      detail: `${data.llm.providers.length} providers, ${data.llm.operations.length} routed operations`,
      tone: data.llm.deadKeys.length > 0 ? "warn" : "ok",
      icon: BrainCircuit,
      href: "#llm",
    },
    {
      id: "security-jobs",
      title: failedJobs > 0 ? `${failedJobs} background jobs failed` : "Background jobs are clear",
      detail: `${data.hero.activeQueue} queued or running jobs`,
      tone: failedJobs > 0 ? "danger" : data.hero.activeQueue > 0 ? "warn" : "ok",
      icon: ShieldAlert,
      href: "#security",
    },
    {
      id: "settings-health",
      title: unhealthySettings > 0 ? `${unhealthySettings} environment checks need attention` : "Environment checks pass",
      detail: `${data.security.dpdp.length} recent DPDP audit events`,
      tone: unhealthySettings > 0 ? "warn" : "ok",
      icon: Settings,
      href: "#settings",
    },
  ] satisfies Array<{ id: string; title: string; detail: string; tone: State; icon: IconType; href: string }>;

  return items.sort((a, b) => severityRank(b.tone) - severityRank(a.tone));
}

function severityRank(tone: State) {
  if (tone === "danger") return 3;
  if (tone === "warn") return 2;
  if (tone === "ok") return 1;
  return 0;
}

function resumeTone(state: "failed" | "parsing" | "parsed" | "missing"): State {
  if (state === "failed") return "danger";
  if (state === "parsing") return "warn";
  if (state === "parsed") return "ok";
  return "muted";
}

function statusTone(status: string): State {
  if (status === "success") return "ok";
  if (status === "failed") return "danger";
  if (status === "partial" || status === "running") return "warn";
  return "muted";
}

function timeAgo(value: string | null | undefined) {
  if (!value) return "never";
  const diff = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diff)) return "unknown";
  if (diff < 0) return "future";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function dateShort(value: string | undefined | null) {
  if (!value) return "unknown";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
