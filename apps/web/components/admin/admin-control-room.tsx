"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  BrainCircuit,
  Briefcase,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Download,
  FileText,
  Gauge,
  LibraryBig,
  Radar,
  Settings,
  ShieldAlert,
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
  blue: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  green: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
  violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  rose: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  muted: "border-border bg-secondary/50 text-muted-foreground",
};

const stateClass: Record<State, string> = {
  ok: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
  warn: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  danger: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  muted: "border-border bg-secondary/60 text-muted-foreground",
};

export function AdminControlRoom({ data }: { data: AdminControlRoomData }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState<string | null>(null);
  const motionProps = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-80px" },
        transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
      };
  const quickStats = useMemo(
    () => [
      { label: "Fleet", value: `${data.hero.fleetGrade}${data.hero.fleetScore}` },
      { label: "Queue", value: String(data.hero.activeQueue) },
      { label: "Risk", value: String(data.hero.atRiskCompanies) },
    ],
    [data.hero],
  );

  async function copyValue(id: string, value: string) {
    await navigator.clipboard?.writeText(value);
    setCopied(id);
    window.setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-20 border-b border-border bg-background/92 backdrop-blur-xl md:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Control Room</p>
              <h1 className="truncate text-lg font-semibold">ProdMatch Admin</h1>
            </div>
            <LinkIcon href="/admin/health" icon={Activity} label="Ops" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {quickStats.map((stat) => (
              <div key={stat.label} className="rounded-lg border border-border bg-card px-3 py-2">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-sm font-semibold tabular-nums">{stat.value}</p>
              </div>
            ))}
          </div>
          <nav aria-label="Admin sections" className="no-scrollbar -mx-4 mt-3 flex gap-1 overflow-x-auto px-4 pb-1">
            {SECTIONS.map((section) => (
              <SectionChip key={section.id} section={section} />
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <motion.header {...motionProps} className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 elev-1 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-end">
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Badge tone={data.hero.atRiskCompanies > 0 ? "warn" : "ok"}>
                  {data.hero.atRiskCompanies > 0 ? `${data.hero.atRiskCompanies} at risk` : "Fleet healthy"}
                </Badge>
                <Badge tone="muted">Generated {timeAgo(data.hero.generatedAt)}</Badge>
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Enterprise Control Room</p>
              <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Admin operations cockpit
              </h1>
              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryLink href="/admin/crawler-intel" icon={Radar}>Crawler Intel</PrimaryLink>
                <PrimaryLink href="/admin/ai-ops" icon={BrainCircuit}>AI Ops</PrimaryLink>
                <PrimaryLink href="/admin/health" icon={Activity}>Operations</PrimaryLink>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-secondary/30 p-2">
              {quickStats.map((stat) => (
                <div key={stat.label} className="rounded-lg bg-card px-3 py-3 text-center">
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.header>

        <div className="sticky top-0 z-10 mt-4 hidden rounded-xl border border-border bg-background/90 p-2 backdrop-blur-xl md:block">
          <nav aria-label="Admin sections" className="flex flex-wrap gap-1">
            {SECTIONS.map((section) => (
              <SectionChip key={section.id} section={section} desktop />
            ))}
          </nav>
        </div>

        <motion.section {...motionProps} className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.metrics.map((metric) => (
            <MetricTile key={metric.id} metric={metric} />
          ))}
        </motion.section>

        <motion.section {...motionProps} className="mt-3 grid gap-3 lg:grid-cols-3">
          {data.health.map((item) => (
            <HealthTile key={item.label} item={item} />
          ))}
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
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MiniMetric label="Artifacts" value={data.analytics.resumeArtifacts} />
              <MiniMetric label="Snapshots" value={data.analytics.snapshots} />
              <MiniMetric label="Ready" value={data.resumes.filter((row) => row.state === "ready").length} />
              <MiniMetric label="Attention" value={data.resumes.filter((row) => row.state !== "ready").length} />
            </div>
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
            <SubPanel title="Recent matches">
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
            </SubPanel>
          </Panel>

          <Panel id="crawler" icon={Radar} title="Crawler Management" action={<PrimaryLink href="/admin/crawler-intel" icon={ArrowUpRight}>Open intel</PrimaryLink>}>
            <div className="mb-3 grid grid-cols-3 gap-2">
              <MiniMetric label="Companies" value={data.crawler.companies} />
              <MiniMetric label="Runs" value={data.crawler.runs} />
              <MiniMetric label="At risk" value={data.crawler.atRisk} />
            </div>
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
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
              <SubPanel title="Configured providers">
                <div className="grid gap-2 sm:grid-cols-2">
                  {data.llm.providers.length === 0 ? (
                    <EmptyBlock text="No external providers configured." />
                  ) : data.llm.providers.map((provider) => (
                    <div key={provider.id} className="rounded-lg border border-border bg-secondary/30 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <IdentityCell title={provider.label} subtitle={provider.models.join(", ") || "Embedding only"} />
                        <Badge tone={provider.keys > 0 ? "ok" : "warn"}>{provider.keys} keys</Badge>
                      </div>
                      <p className="mt-3 text-xs text-muted-foreground">{provider.supportsPdf ? "PDF capable" : "Text only"}</p>
                    </div>
                  ))}
                </div>
              </SubPanel>
              <SubPanel title="Dead-key ledger">
                <DataGrid
                  columns={["Provider", "Capability", "Failure", "Dead until"]}
                  rows={data.llm.deadKeys}
                  getKey={(row) => `${row.provider}-${row.model}-${row.capability}`}
                  empty="No dead provider keys currently recorded."
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
              </SubPanel>
            </div>
          </Panel>

          <Panel id="analytics" icon={BarChart3} title="Analytics & Insights">
            <div className="grid gap-3 lg:grid-cols-2">
              <RankList title="Top skills" items={data.analytics.topSkills} />
              <RankList title="Role mix" items={data.analytics.roleMix} />
            </div>
          </Panel>

          <Panel id="content" icon={LibraryBig} title="Content Management">
            <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
              <MiniMetric label="DSA problems" value={data.content.dsaProblems} />
              <MiniMetric label="Role tracks" value={data.content.tracks.length} />
              <MiniMetric label="Dispatches" value={data.content.dispatches} />
              <MiniMetric label="Hard problems" value={data.content.tracks.reduce((sum, track) => sum + track.hard, 0)} />
            </div>
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
                  <div key={setting.key} className="rounded-xl border border-border bg-secondary/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <code className="break-all text-xs">{setting.key}</code>
                      {healthy ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> : <XCircle className="h-4 w-4 shrink-0 text-amber-400" />}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{setting.detail}</p>
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel id="security" icon={ShieldAlert} title="Activity Logs & Security">
            <div className="grid gap-3 xl:grid-cols-2">
              <SubPanel title="Background jobs">
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
              </SubPanel>
              <SubPanel title="DPDP audit">
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
              </SubPanel>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function SectionChip({
  section,
  desktop = false,
}: {
  section: (typeof SECTIONS)[number];
  desktop?: boolean;
}) {
  const Icon = section.icon;
  return (
    <a
      href={`#${section.id}`}
      className={cn(
        "press inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-card text-sm font-medium text-muted-foreground transition hover:border-primary/30 hover:text-foreground focus-ring",
        desktop ? "px-3 py-2" : "px-3 py-1.5 text-xs",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {section.label}
    </a>
  );
}

function Filters({ userQuery, jobQuery }: { userQuery: string; jobQuery: string }) {
  return (
    <form action="/admin" className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-2 md:grid-cols-[1fr_1fr_auto]">
      <SearchField name="q" icon={Users} placeholder="Search users" defaultValue={userQuery} />
      <SearchField name="job" icon={Briefcase} placeholder="Filter jobs" defaultValue={jobQuery} />
      <button className="press inline-flex h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-ring">
        Apply filters
      </button>
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
  icon: ComponentType<{ className?: string }>;
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
        className="h-11 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}

function MetricTile({ metric }: { metric: AdminControlRoomData["metrics"][number] }) {
  const Icon = metric.id === "users" ? Users : metric.id === "resumes" ? FileText : metric.id === "jobs" ? Briefcase : BrainCircuit;
  return (
    <a href={`#${metric.id}`} className="lift rounded-xl border border-border bg-card p-4 focus-ring">
      <div className="flex items-start justify-between gap-4">
        <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-lg border", toneClass[metric.tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-[11px] text-muted-foreground">{metric.trend}</span>
      </div>
      <p className="mt-4 text-3xl font-semibold tabular-nums">{metric.value}</p>
      <p className="mt-1 text-sm font-medium">{metric.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
    </a>
  );
}

function HealthTile({ item }: { item: AdminControlRoomData["health"][number] }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
          <Gauge className="h-4 w-4" />
        </span>
        <Badge tone={item.state === "ok" ? "ok" : "warn"}>{item.state === "ok" ? "Healthy" : "Watch"}</Badge>
      </div>
      <p className="mt-4 text-xl font-semibold">{item.value}</p>
      <p className="text-sm font-medium">{item.label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
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
  icon: ComponentType<{ className?: string }>;
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
      className="scroll-mt-36 rounded-2xl border border-border bg-card p-3 elev-1 sm:p-4"
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
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

function SubPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-2 text-sm font-medium">{title}</p>
      {children}
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
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-background/40 md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-secondary/50 text-[11px] uppercase tracking-wider text-muted-foreground">
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
    <article className="rounded-xl border border-border bg-background/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{eyebrow}</p>
        </div>
        {status}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {meta.map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg bg-secondary/40 px-2 py-2">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
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
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function RankList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  const max = Math.max(1, ...items.map((item) => item.count));
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-4">
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
    </div>
  );
}

function EmptyBlock({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
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
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <Link href={href} className="press inline-flex h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-primary hover:bg-primary/15 focus-ring">
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
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link href={href} aria-label={label} className="press inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground focus-ring">
      <Icon className="h-4 w-4" />
    </Link>
  );
}

function CsvButton({ filename, csv }: { filename: string; csv: string }) {
  return (
    <a
      href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`}
      download={filename}
      className="press inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-muted-foreground hover:text-foreground focus-ring"
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
      className="press inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground focus-ring"
    >
      {copied ? <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy ID"}
    </button>
  );
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
