import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileText, User, Sparkles, TrendingUp, UserCheck, BarChart3, Zap, ChevronRight as ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResumeUpload } from "./resume-upload";
import { SaveProfileForm } from "./save-profile-form";
import { ResumeScorePanel, type ResumeScorePanelData } from "./resume-score-panel";
import { DnaBreakdownPanel } from "@/components/dna-breakdown-panel";
import { SectionCard } from "@/components/section-card";
import type { DnaBreakdown } from "@/lib/matching/dna-breakdown";
import { listResumeVersions } from "./actions";
import { ResumeVersionsPanel } from "./resume-versions-panel";
import { ParsedReviewPanel } from "./parsed-review-panel";
import { EnhancementHistoryPanel } from "./enhancement-history-panel";

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

  const versions = hasResume ? await listResumeVersions() : [];

  const steps = [
    { done: hasResume, label: "Resume uploaded" },
    { done: dnaScore !== null, label: "Readiness computed" },
    { done: resumeScore !== null, label: "Market strength scored" },
  ];
  const progress = steps.filter((s) => s.done).length;
  const progressPct = Math.round((progress / steps.length) * 100);

  return (
    <div className="max-w-3xl space-y-5 pb-8">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your details are used solely for AI matching — never shared or sold.
            </p>
          </div>
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
              <span className="text-xs font-bold tabular-nums">{progress}/{steps.length}</span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Setup</span>
          </div>
        </div>

        {/* Steps */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-4">
          {steps.map(({ done, label }) => (
            <div key={label} className="flex items-center gap-1.5 text-xs">
              {done
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                : <div className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-border" />
              }
              <span className={done ? "text-foreground" : "text-muted-foreground/70"}>{label}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Product-Co Readiness card ──────────────────────────
          Renamed from "Product DNA" to a neutral readiness signal.
          Doesn't gate matching — purely a profile-side coaching signal.
          Background (services / product / mixed) is not a judgment;
          it's information you can act on. */}
      {hasResume && dnaScore !== null && (
        <div className="rounded-xl border border-primary/30 bg-primary-soft p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-5">
            <DnaRing score={dnaScore} />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-soft-foreground/80">Product-Co Readiness</p>
              <p className="mt-0.5 text-lg font-semibold">{dnaScoreLabel(dnaScore)}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A coaching signal — not a gate. Built from scale of work, modern stack, ownership, and product-co exposure. It does not affect your match scores.
              </p>
              {parsedResume && (parsedResume.summary as string | undefined) && (
                <p className="mt-2 line-clamp-2 text-xs text-muted-foreground/80">
                  {String(parsedResume.summary ?? "").slice(0, 140)}{String(parsedResume.summary ?? "").length > 140 ? "…" : ""}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 border-t border-primary/15 pt-4">
            {[
              { label: "Current role", value: (profile?.current_role as string | null) ?? "—", icon: <User className="h-3 w-3" /> },
              { label: "Experience", value: profile?.years_experience != null ? `${profile.years_experience} yrs` : "—", icon: <TrendingUp className="h-3 w-3" /> },
              { label: "Tech skills", value: techStack.length > 0 ? `${techStack.length} skills` : "—", icon: <Sparkles className="h-3 w-3" /> },
            ].map(({ label, value, icon }) => (
              <div key={label} className="text-center">
                <div className="mb-1 flex items-center justify-center gap-1 text-muted-foreground">{icon}</div>
                <p className="truncate text-sm font-semibold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Parsed review ──────────────────────────────────────── */}
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

      {/* ── Resume history ─────────────────────────────────────── */}
      {hasResume && (
        <div id="resume-history" className="scroll-mt-20">
          <ResumeVersionsPanel versions={versions} />
        </div>
      )}

      {/* ── Enhancement history (Phase R4) ─────────────────────── */}
      {hasResume && (
        <EnhancementHistoryPanel userId={user.id} />
      )}

      {/* ── Resume upload ──────────────────────────────────────── */}
      <SectionCard
        title="Resume"
        subtitle="We parse your resume to populate your profile and inform your readiness signal"
        icon={<FileText className="h-4 w-4" />}
        badge={
          hasResume ? (
            <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
              Uploaded
            </span>
          ) : undefined
        }
      >
        <ResumeUpload
          hasExisting={hasResume}
          existingRole={profile?.current_role as string | null}
          existingDnaScore={dnaScore}
        />
      </SectionCard>

      {/* ── Resume score panel ─────────────────────────────────── */}
      {hasResume && (
        <ResumeScorePanel
          score={resumeScore}
          breakdown={(profile as { resume_score_breakdown?: ResumeScorePanelData["breakdown"] } | null)?.resume_score_breakdown ?? null}
          tips={(profile as { resume_tips?: ResumeScorePanelData["tips"] } | null)?.resume_tips ?? null}
          scoredAt={(profile as { resume_score_at?: string | null } | null)?.resume_score_at ?? null}
        />
      )}

      {/* ── Enhance my resume — Phase R2 ────────────────────────── */}
      {hasResume && (
        <Link
          href="/profile/enhance"
          className="press tap-target group block rounded-xl border border-primary/30 bg-primary-soft p-4 transition hover:border-primary/50 hover:bg-primary-soft/80 focus-ring"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Enhance my resume</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                AI reviews your resume for ATS readability and bullet quality.{" "}
                <strong className="text-foreground/90">Every change is yours to accept.</strong> We never invent experience.
              </p>
            </div>
            <ChevronRightIcon aria-hidden className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </Link>
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
      <div id="profile-details" className="scroll-mt-20">
        <SectionCard
          title="Profile details"
          subtitle="Pre-filled from your resume — edit to refine your matches"
          icon={<User className="h-4 w-4" />}
        >
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
        </SectionCard>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function DnaRing({ score }: { score: number }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  // Use semantic CSS variables resolved through Tailwind classes via stroke="currentColor".
  const colorClass =
    score >= 75 ? "text-success" :
    score >= 55 ? "text-warning" :
    "text-primary";
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" className={`shrink-0 -rotate-90 ${colorClass}`}>
      <circle cx="40" cy="40" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
      <circle
        cx="40" cy="40" r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="40" y="40" dominantBaseline="middle" textAnchor="middle"
        className="fill-foreground"
        style={{ transform: "rotate(90deg)", transformOrigin: "40px 40px", fontSize: "18px", fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  );
}

function dnaScoreLabel(score: number): string {
  // Neutral, progression-oriented labels. No language that frames a services
  // background as a deficit — every Indian engineer's career starts somewhere,
  // and this signal only describes the *next-step* alignment with product-co
  // hiring patterns, not the engineer's worth.
  if (score >= 80) return "Application-ready for top product companies";
  if (score >= 60) return "Strong readiness — minor refinements unlock more roles";
  if (score >= 40) return "Solid foundation — a few signal upgrades will lift you";
  return "Early in product-co readiness — clear levers to grow this signal";
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
        ? `Your readiness of ${dnaScore}/100 signals strong Senior-to-Staff transition potential at top companies.`
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
        ? `Your readiness of ${dnaScore}/100 strongly positions you for Principal / EM transitions at top-tier companies.`
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
    <SectionCard
      title="Career Trajectory"
      subtitle="Your progression path in product engineering"
      icon={<TrendingUp className="h-4 w-4" />}
    >
      {/* Stage strip */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current level</p>
          <p className="mt-0.5 text-base font-semibold capitalize">{stageName} engineer</p>
          {currentRole && <p className="truncate text-xs text-muted-foreground">{currentRole}</p>}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Next level</p>
          <p className="mt-0.5 text-base font-semibold capitalize text-primary">{nextStageName} engineer</p>
          <p className="text-[10px] text-muted-foreground">{timeframe}</p>
        </div>
      </div>

      <div className="relative mb-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="mb-4 flex justify-between text-[10px] text-muted-foreground">
        <span>Progression readiness</span>
        <span className="tabular-nums">{progressPct}%</span>
      </div>

      <div className="space-y-2.5 border-t border-border pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Trajectory signals</p>
        {displayInsights.map((insight, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
            <p className="text-xs leading-relaxed text-muted-foreground">{insight}</p>
          </div>
        ))}
      </div>

      {(currentLpa !== null || targetLpa !== null) && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
          {currentLpa !== null && (
            <span>Current: <strong className="text-foreground">₹{currentLpa} LPA</strong></span>
          )}
          {targetLpa !== null && (
            <span>Target: <strong className="text-success">₹{targetLpa} LPA</strong></span>
          )}
          {currentLpa !== null && targetLpa !== null && (
            <span className="ml-auto text-[10px]">
              Gap: ₹{targetLpa - currentLpa} LPA ·{" "}
              {targetLpa - currentLpa > 20 ? "ambitious stretch" : targetLpa - currentLpa > 10 ? "achievable in 1–2 steps" : "within reach"}
            </span>
          )}
        </div>
      )}
    </SectionCard>
  );
}

// ── ATS & Recruiter Signal ────────────────────────────────────────────────────

function AtsSignalPanel({ score }: { score: number }) {
  const probability   = score >= 80 ? "High" : score >= 62 ? "Medium" : "Low";
  const probTone      = score >= 80 ? { text: "text-success", bg: "bg-success/10", border: "border-success/20" }
                      : score >= 62 ? { text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" }
                      : { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" };

  const recruiterRead = score >= 85
    ? "Immediately shortlistable — strong signal-to-noise"
    : score >= 70
    ? "Likely shortlisted — minor gaps may need cover letter"
    : score >= 55
    ? "Conditional — needs targeted improvements before applying"
    : "High drop-off risk at screening — review tips above";

  const atsGrade      = score >= 85 ? "A" : score >= 72 ? "B" : score >= 58 ? "C" : "D";
  const atsGradeColor = score >= 85 ? "text-success" : score >= 72 ? "text-warning" : score >= 58 ? "text-primary" : "text-destructive";

  const readinessTone =
    score >= 75 ? "text-success" :
    score >= 55 ? "text-warning" :
    "text-destructive";

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
    <SectionCard
      title="ATS & Recruiter Signal"
      subtitle="How automated screening and hiring managers are likely to read your profile"
      icon={<UserCheck className="h-4 w-4" />}
    >
      {/* 3-metric strip */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-3 ${probTone.border} ${probTone.bg}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${probTone.text}`}>Callback</span>
          <span className={`text-xl font-bold tabular-nums ${probTone.text}`}>{probability}</span>
          <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${probTone.border} ${probTone.text}`}>
            {score}/100
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ATS grade</span>
          <span className={`text-xl font-bold tabular-nums ${atsGradeColor}`}>{atsGrade}</span>
          <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {atsGrade === "A" ? "pass" : atsGrade === "B" ? "likely pass" : atsGrade === "C" ? "borderline" : "risk"}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-lg border border-border px-3 py-3">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Interview</span>
          <span className={`inline-flex items-center gap-1 text-xl font-bold ${readinessTone}`}>
            <BarChart3 className="h-4 w-4" />
            <span>{score >= 75 ? "Ready" : score >= 55 ? "Close" : "Prep"}</span>
          </span>
          <span className="rounded-full border border-border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            product co
          </span>
        </div>
      </div>

      {/* Recruiter read */}
      <div className="mb-4 rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Recruiter reads your profile as</p>
        <p className="text-sm text-foreground/90">{recruiterRead}</p>
      </div>

      {/* Strengths + concerns */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-success">
            <CheckCircle2 className="h-3 w-3" /> ATS passes
          </p>
          <ul className="space-y-1">
            {strengths.map((s) => (
              <li key={s} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-success" />
                {s}
              </li>
            ))}
          </ul>
        </div>
        {concerns.length > 0 && (
          <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-warning">
              <Zap className="h-3 w-3" /> Fix before applying
            </p>
            <ul className="space-y-1">
              {concerns.map((c) => (
                <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warning" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
