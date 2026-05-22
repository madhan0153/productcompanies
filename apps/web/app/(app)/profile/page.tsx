import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileText, User, UserCheck, BarChart3, Zap } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResumeUpload } from "./resume-upload";
import { SaveProfileForm } from "./save-profile-form";
import { ResumeScorePanel, type ResumeScorePanelData } from "./resume-score-panel";
import { SectionCard } from "@/components/section-card";
import { Tooltip } from "@/components/tooltip";
import { listResumeVersions, type ResumeVersionLite } from "./actions";
import { ResumeVersionsPanel } from "./resume-versions-panel";
import { ParseStatusBanner } from "./parse-status-banner";
import { ProfileTabs } from "./profile-tabs";

export const metadata: Metadata = { title: "My Profile" };
// The resume upload action does an AI PDF parse (10-20s) + profile upsert.
// Bumped from 60→90s so a cold start doesn't time out before the parse
// completes. The resume-score + embedding work runs in after() and
// therefore doesn't count against this budget.
export const maxDuration = 90;

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");


  // QA fix (B9): proper type for the profile read so downstream usages
  // are compile-time checked. Cast through unknown only at the boundary.
  type ProfileRow = {
    display_name: string | null;
    current_role: string | null;
    years_experience: number | null;
    current_lpa: number | null;
    target_lpa: number | null;
    tech_stack: string[] | null;
    preferred_hubs: string[] | null;
    seniority: string | null;
    resume_storage_path: string | null;
    product_dna_score: number | null;
    dna_breakdown: unknown;
    resume_parsed: unknown;
    resume_score: number | null;
    resume_score_breakdown: unknown;
    resume_tips: unknown;
    resume_score_at: string | null;
    role_function: string | null;
    target_role_functions: string[] | null;
    resume_parsing_at: string | null;
    resume_parse_error: string | null;
  };
  const { data: profile } = await (supabase
    .from("profiles")
    .select(
      "display_name, current_role, years_experience, current_lpa, target_lpa, tech_stack, preferred_hubs, seniority, resume_storage_path, product_dna_score, dna_breakdown, resume_parsed, resume_score, resume_score_breakdown, resume_tips, resume_score_at, role_function, target_role_functions, resume_parsing_at, resume_parse_error",
    )
    .eq("id", user.id)
    .maybeSingle() as unknown as Promise<{ data: ProfileRow | null }>);

  const preferredHubs = Array.isArray(profile?.preferred_hubs)
    ? profile.preferred_hubs.filter((hub): hub is string => typeof hub === "string")
    : [];
  const techStack = Array.isArray(profile?.tech_stack)
    ? profile.tech_stack.filter((tech): tech is string => typeof tech === "string")
    : [];
  const isParsing = !!profile?.resume_parsing_at;
  const parseError = profile?.resume_parse_error ?? null;
  // hasResume is true whenever parsed data exists — even if a NEW parse is
  // currently running. This keeps the tabs + previous data visible during a
  // re-upload, and the ParseStatusBanner explains the in-flight parse.
  const hasResume = !!profile?.resume_parsed;
  const dnaScore = profile?.product_dna_score ?? null;
  const resumeScore = profile?.resume_score ?? null;

  let versions: ResumeVersionLite[] = [];
  if (hasResume) {
    try {
      versions = await listResumeVersions();
    } catch {
      // Resume history is additive UI, not critical path for upload/replace.
      versions = [];
    }
  }

  return (
    <div className="max-w-3xl space-y-4 pb-8">
      {/* Parse-status banner — shows during background parse (incl. when the
          user navigates away and comes back). Renders nothing on idle. */}
      <ParseStatusBanner
        initialStartedAt={profile?.resume_parsing_at ?? null}
        initialError={parseError}
        hasActiveResume={hasResume}
      />

      {/* ── Compact header — single row ─────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">My Profile</h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">
            Used only for AI matching. Never shared or sold.
          </p>
        </div>
        {hasResume && dnaScore !== null && (
          // EU-3: explain the score on tap/hover. The number on its own was
          // an opaque signal — new users couldn't tell 72 from 81.
          <Tooltip
            label={
              <div className="space-y-1">
                <p className="font-semibold">Product-Co Readiness {dnaScore}/100</p>
                <p>How well your resume profile matches product-company expectations across role function, years of experience, tech stack, and product/product-co signals.</p>
                <p className="text-[10px] opacity-90">75+ strong · 55–74 building · &lt;55 needs work</p>
              </div>
            }
            side="bottom"
          >
            <div className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1 cursor-help">
              <span className={`text-lg font-bold tabular-nums ${
                dnaScore >= 75 ? "text-success" : dnaScore >= 55 ? "text-warning" : "text-primary"
              }`}>{dnaScore}</span>
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                Ready
              </span>
            </div>
          </Tooltip>
        )}
      </div>

      {/* First-time path: no parsed resume, no parse in flight — show only
          the upload card. Tabs would be empty noise here. */}
      {!hasResume && (
        <SectionCard
          title="Resume"
          subtitle={isParsing ? "Parse in progress — you can keep this tab open while we finish." : "Upload your PDF to get started"}
          icon={<FileText className="h-4 w-4" />}
        >
          <ResumeUpload
            hasExisting={false}
            existingRole={null}
            existingDnaScore={null}
            isParsing={isParsing}
          />
        </SectionCard>
      )}

      {/* hasResume path: tabbed nav. Each panel is rendered server-side; the
          client-side tabs component just toggles visibility. */}
      {hasResume && (
        <ProfileTabs
          panels={{
            resume: (
              <>
                <SectionCard
                  title="Resume"
                  subtitle={isParsing ? "New parse in progress — current view shows your last parsed version" : "Upload a new version to replace"}
                  icon={<FileText className="h-4 w-4" />}
                  badge={
                    <span className="rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                      Uploaded
                    </span>
                  }
                >
                  <ResumeUpload
                    hasExisting={true}
                    existingRole={profile?.current_role ?? null}
                    existingDnaScore={dnaScore}
                    isParsing={isParsing}
                  />
                </SectionCard>

                {dnaScore !== null && (
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
                      <span className="text-sm font-bold tabular-nums">{dnaScore}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Product-Co Readiness
                      </p>
                      <p className="truncate text-sm font-medium">{dnaScoreLabel(dnaScore)}</p>
                    </div>
                  </div>
                )}

                <ResumeScorePanel
                  score={resumeScore}
                  breakdown={(profile?.resume_score_breakdown as ResumeScorePanelData["breakdown"] | null) ?? null}
                  tips={(profile?.resume_tips as ResumeScorePanelData["tips"] | null) ?? null}
                  scoredAt={profile?.resume_score_at ?? null}
                />

                {resumeScore !== null && <AtsSignalPanel score={resumeScore} />}
              </>
            ),
            details: (
              <SectionCard
                title="Profile details"
                subtitle="Pre-filled from your resume — edit to refine your matches"
                icon={<User className="h-4 w-4" />}
              >
                <SaveProfileForm
                  defaultValues={{
                    display_name: profile?.display_name ?? "",
                    current_role: profile?.current_role ?? "",
                    years_experience: String(profile?.years_experience ?? ""),
                    current_lpa: String(profile?.current_lpa ?? ""),
                    target_lpa: String(profile?.target_lpa ?? ""),
                    tech_stack: techStack.join(", "),
                    preferred_hubs: preferredHubs,
                    seniority: profile?.seniority ?? "",
                  }}
                />
              </SectionCard>
            ),
            history: (
              <ResumeVersionsPanel versions={versions} />
            ),
          }}
        />
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function dnaScoreLabel(score: number): string {
  // Neutral, progression-oriented labels describing product-company signal
  // strength. Not a callback predictor — the Resume Score handles that.
  if (score >= 80) return "Strong product-company profile signal";
  if (score >= 60) return "Solid signal — minor refinements unlock more roles";
  if (score >= 40) return "Building signal — focus on product-impact framing";
  return "Early-stage signal — clear levers to grow this";
}

// ── ATS & Recruiter Signal ────────────────────────────────────────────────────

function AtsSignalPanel({ score }: { score: number }) {
  const probability   = score >= 70 ? "High" : score >= 55 ? "Medium" : "Low";
  const probTone      = score >= 70 ? { text: "text-success", bg: "bg-success/10", border: "border-success/20" }
                      : score >= 55 ? { text: "text-warning", bg: "bg-warning/10", border: "border-warning/20" }
                      : { text: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20" };

  const recruiterRead = score >= 80
    ? "Very likely shortlisted — strong ATS and human-scan signal"
    : score >= 70
    ? "Likely shortlisted — well-structured with good keyword coverage"
    : score >= 55
    ? "May be shortlisted — a few targeted improvements will help"
    : "Higher drop-off risk at screening — review tips in resume score";

  const atsGrade      = score >= 80 ? "A" : score >= 67 ? "B" : score >= 53 ? "C" : "D";
  const atsGradeColor = score >= 80 ? "text-success" : score >= 67 ? "text-warning" : score >= 53 ? "text-primary" : "text-destructive";

  const readinessTone =
    score >= 70 ? "text-success" :
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
