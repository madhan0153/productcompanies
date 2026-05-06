import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResumeUpload } from "./resume-upload";
import { SaveProfileForm } from "./save-profile-form";

export const metadata: Metadata = { title: "My Profile" };



export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "display_name, current_role, years_experience, current_lpa, target_lpa, tech_stack, preferred_hubs, seniority, resume_storage_path, product_dna_score, resume_parsed",
    )
    .eq("id", user.id)
    .maybeSingle();

  const preferredHubs = (profile?.preferred_hubs as string[] | null) ?? [];
  const techStack = (profile?.tech_stack as string[] | null) ?? [];
  const hasResume = !!profile?.resume_storage_path;
  const parsedResume = profile?.resume_parsed as Record<string, unknown> | null;

  return (
    <div className="max-w-2xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">My profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your details are used solely for AI matching — never shared or sold.
        </p>
      </div>

      {/* Resume upload */}
      <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
            1
          </div>
          <div>
            <h2 className="font-medium">Upload resume</h2>
            <p className="text-xs text-muted-foreground">We extract your skills and compute your Product DNA score</p>
          </div>
          {hasResume && (
            <span className="ml-auto rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
              Uploaded
            </span>
          )}
        </div>

        {/* DNA score ring */}
        {hasResume && profile?.product_dna_score != null && (
          <div className="flex items-center gap-5 rounded-xl border border-border bg-background/50 p-4">
            <DnaRing score={profile.product_dna_score as number} />
            <div>
              <p className="text-sm font-medium">Product DNA Score</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {scoreLabel(profile.product_dna_score as number)}
              </p>
              {parsedResume && (
                <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
                  {String(parsedResume.summary ?? "").slice(0, 120)}…
                </p>
              )}
            </div>
          </div>
        )}

        <ResumeUpload
          hasExisting={hasResume}
          existingRole={profile?.current_role as string | null}
          existingDnaScore={profile?.product_dna_score as number | null}
        />
      </section>

      {/* Profile fields */}
      <section className="rounded-2xl border border-border bg-card/40 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold">
            2
          </div>
          <div>
            <h2 className="font-medium">Profile details</h2>
            <p className="text-xs text-muted-foreground">Pre-filled from your resume — edit to refine matches</p>
          </div>
        </div>

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
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  label, name, defaultValue, placeholder, type = "text", hint, step,
}: {
  label: string; name: string; defaultValue: string; placeholder: string;
  type?: string; hint?: string; step?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function DnaRing({ score }: { score: number }) {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" className="shrink-0 -rotate-90">
      <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
      <circle
        cx="36" cy="36" r={r}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        className="transition-all duration-700"
      />
      <text x="36" y="36" dominantBaseline="middle" textAnchor="middle"
        className="rotate-90 fill-foreground text-xs font-bold"
        style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px", fontSize: "13px" }}
      >
        {score}
      </text>
    </svg>
  );
}

function scoreLabel(score: number): string {
  if (score >= 80) return "Strong product engineering background";
  if (score >= 60) return "Good product company experience";
  if (score >= 40) return "Mixed product/services background";
  return "Primarily services background — product exp building";
}
