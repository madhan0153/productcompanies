import type { Metadata } from "next";
import Link from "next/link";
import { Brain, Clock3, Layers, Target } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { absoluteUrl } from "@/lib/seo/site";
import { getDsaRoleStats, getDsaRoleTrack, inferDsaRole, type DsaRole } from "@prodmatch/shared";
import { DsaClient, type DsaHistoryRow, type DsaProgressRow } from "./dsa-client";

// SEO: DSA practice is intentionally public — pattern + problem content
// is rankable evergreen material. Per-user state (streak, history,
// confidence ratings) only renders when a user is signed in.
export const metadata: Metadata = {
  title: "Role-Specific DSA Lab - Premium Product Interview Practice",
  description: "Premium role-specific DSA drills for product-company interviews: AI/ML, backend, full stack, platform, mobile, security, data, and more with full Python, Java, and C++ solutions.",
  alternates: { canonical: "/dsa" },
  openGraph: {
    title: "Role-Specific DSA Lab - Product-Company Interview Prep",
    description: "Daily no-repeat product simulations with full in-app solutions and role-aware dispatch.",
    url: absoluteUrl("/dsa"),
  },
};
export const dynamic = "force-dynamic";

const TOTAL_ROLE_PROBLEMS = getDsaRoleStats().reduce((sum, role) => sum + role.problemCount, 0);

export default async function DsaPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // SEO: anonymous users see the same content (patterns + problem catalog)
  // without per-user history. Sign-in adds streak, progress, and the
  // spaced-repetition tracker.
  const [profile, history, progress] = user
    ? await Promise.all([
        loadProfileResumeState(supabase, user.id),
        loadDsaHistory(supabase, user.id),
        loadDsaProgressRows(supabase, user.id),
      ])
    : [null, [] as DsaHistoryRow[], [] as DsaProgressRow[]];

  const hasResume = Boolean(profile?.resume_parsed);
  const isAuthed = Boolean(user);
  const targetRole = inferProfileDsaRole(profile);
  const roleTrack = getDsaRoleTrack(targetRole);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Brain className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Interview practice</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Role-Specific DSA Lab</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              One fresh product-team simulation per day, tuned to your role, with full explanations and Python, Java, and C++ solutions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <HeroStat icon={<Target className="h-4 w-4" />} label="Role track" value={roleTrack.label} />
          <HeroStat icon={<Clock3 className="h-4 w-4" />} label="No-repeat" value="60 days" />
          <HeroStat icon={<Brain className="h-4 w-4" />} label="Catalog" value={`${TOTAL_ROLE_PROBLEMS}+`} />
        </div>

        <Link
          href="/dsa/patterns"
          className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-secondary/50 sm:w-auto"
        >
          <span className="inline-flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Browse the role-aware roadmap
          </span>
          <span className="text-xs text-muted-foreground">Patterns and roles</span>
        </Link>
      </header>

      {isAuthed ? (
        <DsaClient history={history ?? []} progress={progress ?? []} hasResume={hasResume} targetRole={targetRole} />
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm font-semibold">
            Sign in to track your streak, save confidence ratings, and get personalised picks.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Free. No credit card. The roadmap and self-contained problems are accessible without an account too.
          </p>
          <Link
            href="/auth/login?next=/dsa"
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Sign in
          </Link>
        </div>
      )}
    </div>
  );
}

async function loadProfileResumeState(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<ProfileDsaContext | null> {
  try {
    const { data } = await (supabase
      .from("profiles")
      .select("resume_parsed, role_function, target_role_functions, current_role, tech_stack")
      .eq("id", userId)
      .maybeSingle() as unknown as Promise<{ data: ProfileDsaContext | null }>);
    return data ?? null;
  } catch {
    return null;
  }
}

type ProfileDsaContext = {
  resume_parsed: unknown;
  role_function: string | null;
  target_role_functions: string[] | null;
  current_role: string | null;
  tech_stack: string[] | null;
};

function inferProfileDsaRole(profile: ProfileDsaContext | null): DsaRole {
  if (!profile) return "software_engineer";
  return inferDsaRole({
    role_function: profile.role_function,
    target_role_functions: profile.target_role_functions,
    current_role: profile.current_role,
    tech_stack: profile.tech_stack,
    resume_text: resumeTextSignal(profile.resume_parsed),
  });
}

function resumeTextSignal(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const pieces: string[] = [];
  for (const key of ["headline", "summary", "title", "role", "targetRole"]) {
    const item = record[key];
    if (typeof item === "string") pieces.push(item);
  }
  const skills = record.skills;
  if (Array.isArray(skills)) {
    pieces.push(...skills.filter((skill): skill is string => typeof skill === "string"));
  }
  return pieces.join(" ");
}

async function loadDsaHistory(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<DsaHistoryRow[]> {
  try {
    const { data } = await (supabase
      .from("interview_daily_dispatch")
      .select("day, problem_slug, personalised_note, is_complete")
      .eq("user_id", userId)
      .order("day", { ascending: false })
      .limit(60) as unknown as Promise<{ data: DsaHistoryRow[] | null }>);
    return data ?? [];
  } catch {
    return [];
  }
}

async function loadDsaProgressRows(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
): Promise<DsaProgressRow[]> {
  try {
    const { data } = await (supabase
      .from("dsa_user_progress")
      .select("problem_slug, confidence, next_review_at, last_reviewed_on, repetitions")
      .eq("user_id", userId)
      .order("next_review_at", { ascending: true })
      .limit(200) as unknown as Promise<{ data: DsaProgressRow[] | null }>);
    return data ?? [];
  } catch {
    return [];
  }
}

function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <div className="flex items-center gap-1.5 text-primary">
        {icon}
        <span className="truncate text-sm font-semibold">{value}</span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
