import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileText, User, Sparkles, TrendingUp, UserCheck, BarChart3, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResumeUpload } from "./resume-upload";
import { SaveProfileForm } from "./save-profile-form";
import { ResumeScorePanel, type ResumeScorePanelData } from "./resume-score-panel";
import { DnaBreakdownPanel } from "@/components/dna-breakdown-panel";
import type { DnaBreakdown } from "@/lib/matching/dna-breakdown";
import { listResumeVersions } from "./actions";
import { ResumeVersionsPanel } from "./resume-versions-panel";
import { ParsedReviewPanel } from "./parsed-review-panel";

export const metadata: Metadata = { title: "My Profile" };
export const maxDuration = 60;

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, current_role, years_experience, current_lpa, target_lpa, tech_stack, preferred_hubs, seniority, resume_storage_path, product_dna_score, dna_breakdown, resume_parsed, resume_score, resume_score_breakdown, resume_tips, resume_score_at, role_function, target_role_functions",
    )
    .eq("id", user.id)
    .maybeSingle();

  const preferredHubs = (profile?.preferred_hubs as string[] | null) ?? [];
  const techStack = (profile?.tech_stack as string[] | null) ?? [];
  const hasResume = !!profile?.resume_storage_path;
  const parsedResume = profile?.resume_parsed as Record<string, unknown> | null;
  const dnaScore = profile?.product_dna_score as number | null ?? null;
  const dnaBreakdown = ((profile as { dna_breakdown?: DnaBreakdown | null } | null)?.dna_breakdown) ?? null;
  const resumeScore = (profile as { resume_score?: number | null } | null)?.resume_score ?? null;

  // Sprint 2 Item 8 — list prior resume snapshots so the user can revert.
  const versions = hasResume ? await listResumeVersions() : [];

  const steps = [
    { done: hasResume, label: "Resume uploaded" },
    { done: dnaScore !== null, label: "DNA score computed" },
    { done: resumeScore !== null, label: "Market strength scored" },
  ];
  const progress = steps.filter((s) => s.done).length;

  return (
    <div className="max-w-2xl space-y-6 pb-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card/40 p-6">
        <div aria-hidden className="absolute right-0 top-0 h-32 w-48 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your details are used solely for AI matching — never shared or sold.
            </p>
          </div>
          {/* Progress indicator */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <svg className="absolute inset-0 -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="4"
                  strokeDasharray={`${(progress / steps.length) * 125.6} 125.6`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-xs font-bold">{progress}/{steps.length}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">Setup</span>
          </div>
        </div>

        {/* Steps */}
        <div className="relative mt-4 flex items-center gap-3">
          {steps.map(({ done, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                : <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-border" />
              }
              <span className={done ? "text-muted-foreground" : "text-muted-foreground/60"}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── DNA score display (when computed) ─────────────────── */}
      {hasResume && dnaScore !== null && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent p-5">
          <div aria-hidden className="absolute right-0 top-0 h-24 w-36 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex items-center gap-5">
            <DnaRing score={dnaScore} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Product DNA Score</p>
              <p className="mt-0.5 text-lg font-bold">{dnaScoreLabel(dnaScore)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Measures your product-company fit: tenure, scale signals, modern stack, and ownership.
              </p>
              {parsedResume && (
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2 opacity-80">
                  {String(parsedResume.summary ?? "").slice(0, 120)}{String(parsedResume.summary ?? "").length > 120 ? "…" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-3 border-t border-border/40 pt-4">
            {[
              { label: "Current role", value: profile?.current_role ?? "—", icon: <User className="h-3 w-3" /> },
              { label: "Experience", value: profile?.years_experience != null ? `${profile.years_experience} yrs` : "—", icon: <TrendingUp className="h-3 w-3" /> },
              { label: "Tech skills", value: techStack.length > 0 ? `${techStack.length} skills` : "—", icon: <Sparkles className="h-3 w-3" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">{icon}</div>
                <p className="text-sm font-semibold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Parsed review (Sprint 2 Item 7) ─────────────────────── */}
      {hasResume && (
        <ParsedReviewPanel
          roleFunction={(profile?.role_function as string | null) ?? null}
          targetRoleFunctions={(profile?.target_role_functions as string[] | null) ?? []}
          yearsExperience={(profile?.years_experience as number | null) ?? null}
          techStack={techStack}
          preferredHubs={preferredHubs}
          editHref="#profile-details"
        />
      )}

      {/* ── DNA axis breakdown ─────────────────────────────────── */}
      {hasResume && dnaBreakdown && (
        <div id="dna-breakdown" className="scroll-mt-20">
          <DnaBreakdownPanel breakdown={dnaBreakdown} />
        </div>
      )}

      {/* ── Resume history (Sprint 2 Item 8) ────────────────────── */}
      {hasResume && (
        <div id="resume-history" className="scroll-mt-20">
          <ResumeVersionsPanel versions={versions} />
        </div>
      )}

      {/* ── Resume upload ──────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card/40">
        <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Resume</h2>
            <p className="text-xs text-muted-foreground">We extract your skills and compute your Product DNA score</p>
          </div>
          {hasResume && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Uploaded
            </span>
          )}
        </div>
        <div className="p-6">
          <ResumeUpload
            hasExisting={hasResume}
            existingRole={profile?.current_role as string | null}
            existingDnaScore={dnaScore}
          />
        </div>
      </section>

      {/* ── Resume score panel ─────────────────────────────────── */}
      {hasResume && (
        <ResumeScorePanel
          score={resumeScore}
          breakdown={(profile as { resume_score_breakdown?: ResumeScorePanelData["breakdown"] } | null)?.resume_score_breakdown ?? null}
          tips={(profile as { resume_tips?: ResumeScorePanelData["tips"] } | null)?.resume_tips ?? null}
          scoredAt={(profile as { resume_score_at?: string | null } | null)?.resume_score_at ?? null}
        />
      )}

      {/* ── ATS & Recruiter Signal ─────────────────────────────── */}
      {hasResume && resumeScore !== null && (
        <AtsSignalPanel score={resumeScore} />
      )}

      {/* ── Career Trajectory ─────────────────────────────────── */}
      {hasResume && dnaScore !== null && (
        <CareerTrajectoryPanel
          yearsExp={(profile?.years_experience as number | null) ?? null}
          seniority={(profile?.seniority as string | null) ?? null}
          dnaScore={dnaScore}
          techStack={techStack}
          currentRole={(profile?.current_role as string | null) ?? null}
          currentLpa={(profile?.current_lpa as number | null) ?? null}
          targetLpa={(profile?.target_lpa as number | null) ?? null}
        />
      )}

      {/* ── Profile details ─────────────────────────────────────── */}
      <section className="rounded-2xl border border-border bg-card/40" id="profile-details">
        <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <User className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Profile details</h2>
            <p className="text-xs text-muted-foreground">Pre-filled from your resume — edit to refine your matches</p>
          </div>
        </div>
        <div className="p-6">
          <SaveProfileForm
            defaultValues={{
              display_name: (profile?.display_name as string) ?? "",
              current_role: (profile?.current_role as string) ?? "",
              years_experience: String(profile?.years_experience ?? ""),
              current_lpa: String(profile?.current_lpa ?? ""),
              target_lpa: String(profile?.target_lpa ?? ""),
              tech_stack: techStack.join(", "),
              preferred_hubs: preferredHubs,
              seniority: (profile?.seniority as string) ?? "",
            }}
          />
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DnaRing({ score }: { score: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  const color = score >= 75 ? "hsl(var(--primary))" : score >= 55 ? "#f59e0b" : "#38bdf8";
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className="shrink-0 -rotate-90">
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="40" y="40" dominantBaseline="middle" textAnchor="middle"
        className="fill-foreground"
        style={{ transform: "rotate(90deg)", transformOrigin: "40px 40px", fontSize: "16px", fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}

function dnaScoreLabel(score: number): string {
  if (score >= 80) return "Strong product engineering background";
  if (score >= 60) return "Good product company experience";
  if (score >= 40) return "Mixed product / services background";
  return "Primarily services background — building product exp";
}

// ── Career Trajectory ────────────────────────────────────────────────────────

const SENIORITY_ORDER = ["junior", "mid", "senior", "staff", "principal", "manager", "director"] as const;

function CareerTrajectoryPanel({
  yearsExp, seniority, dnaScore, techStack, currentRole, currentLpa, targetLpa,
}: {
  yearsExp: number | null;
  seniority: string | null;
  dnaScore: number | null;
  techStack: string[];
  currentRole: string | null;
  currentLpa: number | null;
  targetLpa: number | null;
}) {
  const currentIdx = seniority
    ? SENIORITY_ORDER.indexOf(seniority.toLowerCase() as typeof SENIORITY_ORDER[number])
    : -1;
  const inferredByExp = yearsExp !== null
    ? yearsExp < 2 ? 0 : yearsExp < 4 ? 1 : yearsExp < 7 ? 2 : yearsExp < 11 ? 3 : 4
    : -1;
  const stageIdx = currentIdx >= 0 ? currentIdx : inferredByExp >= 0 ? inferredByExp : 1;
  const stageName = SENIORITY_ORDER[stageIdx] ?? "mid";
  const nextStageName = SENIORITY_ORDER[Math.min(stageIdx + 1, SENIORITY_ORDER.length - 1)] ?? stageName;
  const progressPct = Math.min(88, Math.max(10, stageIdx * 16 + (yearsExp !== null ? Math.min(14, (yearsExp % 3) * 5) : 0)));

  const timeframe = stageIdx === 0 ? "~1–2 yrs"
    : stageIdx === 1 ? "1–2 years"
    : stageIdx === 2 ? "2–3 years"
    : stageIdx === 3 ? "3–5 years"
    : "multi-year path";

  const stack = techStack.map(t => t.toLowerCase().replace(/[\s._-]/g, ""));
  const hasDistSystems = stack.some(t => ["kafka", "kubernetes", "k8s", "grpc", "redis", "cassandra", "zookeeper", "spark"].some(k => t.includes(k)));
  const hasModernInfra = stack.some(t => ["terraform", "helm", "argocd", "istio", "go", "golang", "rust"].some(k => t.includes(k)));
  const hasAI = stack.some(t => ["tensorflow", "pytorch", "llm", "langchain", "openai", "transformers", "mlflow"].some(k => t.includes(k)));

  const insights: string[] = [];

  if (stageName === "junior" || stageName === "mid") {
    insights.push(
      yearsExp !== null && yearsExp >= 3
        ? `At ${yearsExp} years, you're entering Senior territory. Focus on system-wide ownership and measurable, quantifiable impact.`
        : "Accelerate your profile with scale-level projects and cross-functional ownership to reach Senior expectations.",
    );
    insights.push(
      hasDistSystems
        ? "Your distributed-systems exposure (Kafka, Redis, etc.) is a strong Senior-level differentiator at product companies."
        : "Adding distributed-systems depth — Kafka, Redis, PostgreSQL at scale — would meaningfully accelerate your Senior readiness.",
    );
    if (hasAI) insights.push("AI/ML exposure is increasingly valued by product companies at all seniority levels. Lead with it in applications.");
  } else if (stageName === "senior") {
    insights.push(
      dnaScore !== null && dnaScore >= 70
        ? `Your Product DNA score of ${dnaScore} signals strong Senior-to-Staff transition potential at top companies.`
        : "Strengthen product-company tenure and system-design ownership to close the gap to Staff-level standards.",
    );
    insights.push(
      hasDistSystems
        ? "Your infra/distributed-systems depth is a key Staff-readiness signal. Pair it with documented cross-team technical leadership."
        : "Staff roles require architecture-level ownership. Build or document a system-design case study you led end-to-end.",
    );
    if (hasModernInfra) insights.push("Cloud-native stack proficiency (Terraform, Go, Kubernetes) is strongly correlated with Staff-level compensation at product companies.");
  } else if (stageName === "staff" || stageName === "principal") {
    insights.push("At this seniority, technical breadth and demonstrated leadership across multiple engineering teams are primary evaluation signals.");
    insights.push(
      dnaScore !== null && dnaScore >= 80
        ? `Your Product DNA score of ${dnaScore} strongly positions you for Principal / EM transitions at top-tier companies.`
        : "Deepen product-company exposure — Principal and EM roles are predominantly filled by engineers with strong product-company pedigrees.",
    );
    if (hasAI) insights.push("AI platform and GenAI infra leadership is the highest-demand differentiation for Staff/Principal roles in 2025–26.");
  }

  if (currentLpa !== null && targetLpa !== null && targetLpa > currentLpa) {
    const gap = targetLpa - currentLpa;
    const steps = gap > 30 ? "requires a level change and a company tier upgrade"
      : gap > 15 ? "typically requires one level change at a top product company"
      : "achievable within your current trajectory in 1–2 years";
    insights.push(`Your ₹${gap} LPA compensation gap ${steps}.`);
  } else if (!hasModernInfra && stack.length > 0 && stageName !== "junior") {
    insights.push("Cloud-native skills (Kubernetes, Terraform, or Go) would broaden your product-company eligibility and compensation ceiling.");
  }

  const displayInsights = insights.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-400/10 text-violet-400">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Career Trajectory</h2>
          <p className="text-xs text-muted-foreground">Your progression path in product engineering</p>
        </div>
      </div>

      <div className="border-b border-border/40 px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current level</p>
            <p className="mt-0.5 text-base font-bold capitalize">{stageName} engineer</p>
            {currentRole && <p className="text-xs text-muted-foreground">{currentRole}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next level</p>
            <p className="mt-0.5 text-base font-bold capitalize text-violet-400">{nextStageName} engineer</p>
            <p className="text-[10px] text-muted-foreground">{timeframe}</p>
          </div>
        </div>
        <div className="relative mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/60">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-primary transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-muted-foreground/60">
          <span>Progression readiness</span>
          <span>{progressPct}%</span>
        </div>
      </div>

      <div className="space-y-2.5 px-6 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trajectory signals</p>
        {displayInsights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${i === 0 ? "bg-violet-400" : i === 1 ? "bg-primary/60" : "bg-muted-foreground/40"}`} />
            <p className="text-xs leading-relaxed text-muted-foreground">{insight}</p>
          </div>
        ))}
      </div>

      {(currentLpa !== null || targetLpa !== null) && (
        <div className="flex flex-wrap items-center gap-4 border-t border-border/40 px-6 py-3 text-xs text-muted-foreground">
          {currentLpa !== null && (
            <span>Current: <strong className="text-foreground">₹{currentLpa} LPA</strong></span>
          )}
          {targetLpa !== null && (
            <span>Target: <strong className="text-emerald-400">₹{targetLpa} LPA</strong></span>
          )}
          {currentLpa !== null && targetLpa !== null && (
            <span className="ml-auto text-[10px]">
              Gap: ₹{targetLpa - currentLpa} LPA ·{" "}
              {targetLpa - currentLpa > 20 ? "ambitious stretch" : targetLpa - currentLpa > 10 ? "achievable in 1–2 steps" : "within reach"}
            </span>
          )}
        </div>
      )}
    </section>
  );
}

// ── ATS & Recruiter Signal ────────────────────────────────────────────────────

function AtsSignalPanel({ score }: { score: number }) {
  const probability   = score >= 80 ? "High" : score >= 62 ? "Medium" : "Low";
  const probColor     = score >= 80 ? "text-emerald-400" : score >= 62 ? "text-amber-400" : "text-sky-400";
  const probBg        = score >= 80 ? "bg-emerald-400/10" : score >= 62 ? "bg-amber-400/10" : "bg-sky-400/10";
  const probBorder    = score >= 80 ? "border-emerald-400/20" : score >= 62 ? "border-amber-400/20" : "border-sky-400/20";

  const recruiterRead = score >= 85
    ? "Immediately shortlistable — strong signal-to-noise"
    : score >= 70
    ? "Likely shortlisted — minor gaps may need cover letter"
    : score >= 55
    ? "Conditional — needs targeted improvements before applying"
    : "High drop-off risk at screening — review tips above";

  const atsGrade      = score >= 85 ? "A" : score >= 72 ? "B" : score >= 58 ? "C" : "D";
  const atsGradeColor = score >= 85 ? "text-emerald-400" : score >= 72 ? "text-amber-400" : score >= 58 ? "text-sky-400" : "text-rose-400";

  const strengths: string[] = score >= 80
    ? ["Strong keyword density", "Seniority signals clear", "Measurable impact present"]
    : score >= 62
    ? ["Reasonable keyword match", "Role function detectable", "Experience range within spec"]
    : ["Resume parseable", "Skills section present", "Contact info readable"];

  const concerns: string[] = score >= 80
    ? []
    : score >= 62
    ? ["Some top-demand skills absent", "Quantified impact sparse"]
    : ["Low keyword coverage for top roles", "Missing scale / impact signals", "Seniority unclear from resume"];

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card/40">
      <div className="flex items-center gap-3 border-b border-border/50 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <UserCheck className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">ATS &amp; Recruiter Signal</h2>
          <p className="text-xs text-muted-foreground">
            How automated screening and hiring managers are likely to read your profile
          </p>
        </div>
      </div>

      {/* 3-metric strip */}
      <div className="grid grid-cols-3 divide-x divide-border/40">
        <div className={`flex flex-col items-center gap-1 px-4 py-5 ${probBg} border-b border-border/40`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${probColor}`}>Callback prob.</span>
          <span className={`text-2xl font-bold tabular-nums ${probColor}`}>{probability}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] ${probBorder} ${probColor}`}>
            {score}/100
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 border-b border-border/40 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ATS grade</span>
          <span className={`text-2xl font-bold tabular-nums ${atsGradeColor}`}>{atsGrade}</span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            {atsGrade === "A" ? "pass" : atsGrade === "B" ? "likely pass" : atsGrade === "C" ? "borderline" : "risk"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 border-b border-border/40 px-4 py-5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Interview readiness</span>
          <span className="flex items-center gap-1 text-2xl font-bold">
            <BarChart3 className={`h-5 w-5 ${score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-sky-400"}`} />
            <span className={score >= 75 ? "text-emerald-400" : score >= 55 ? "text-amber-400" : "text-sky-400"}>
              {score >= 75 ? "Ready" : score >= 55 ? "Close" : "Prep needed"}
            </span>
          </span>
          <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
            for product-co interviews
          </span>
        </div>
      </div>

      {/* Recruiter read */}
      <div className="border-b border-border/40 px-6 py-4">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recruiter reads your profile as</p>
        <p className="text-sm text-muted-foreground">{recruiterRead}</p>
      </div>

      {/* Strengths + concerns */}
      <div className="grid grid-cols-1 gap-4 px-6 py-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> ATS passes
          </p>
          <ul className="space-y-1">
            {strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400/60" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        {concerns.length > 0 && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              <Zap className="h-3 w-3" /> Fix before applying
            </p>
            <ul className="space-y-1">
              {concerns.map((c) => (
                <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400/60" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border/40 px-6 py-3 text-[10px] text-muted-foreground/50">
        Derived from your resume strength score · Not tied to any specific recruiter&apos;s system · Improve score by acting on tips above
      </div>
    </section>
  );
}
