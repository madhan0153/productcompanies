import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResumeUpload } from "./resume-upload";
import { saveProfile } from "./actions";

export const metadata: Metadata = { title: "My Profile" };

const INDIA_HUBS = [
  "Bengaluru", "Hyderabad", "Pune", "Gurugram",
  "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India",
];

const SENIORITY_OPTIONS = [
  { value: "intern", label: "Intern" },
  { value: "junior", label: "Junior (0–2 yrs)" },
  { value: "mid", label: "Mid (3–5 yrs)" },
  { value: "senior", label: "Senior (6–9 yrs)" },
  { value: "staff", label: "Staff / Principal" },
  { value: "manager", label: "Engineering Manager" },
  { value: "director", label: "Director+" },
];

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

        <form action={saveProfile} className="space-y-5">
          {/* Name + Role */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name" name="display_name" defaultValue={profile?.display_name as string ?? ""} placeholder="Priya Sharma" />
            <Field label="Current role" name="current_role" defaultValue={profile?.current_role as string ?? ""} placeholder="Senior Software Engineer" />
          </div>

          {/* Seniority + Experience */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Seniority level</label>
              <select
                name="seniority"
                defaultValue={profile?.seniority as string ?? ""}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Select…</option>
                {SENIORITY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <Field
              label="Total years experience"
              name="years_experience"
              type="number"
              defaultValue={String(profile?.years_experience ?? "")}
              placeholder="5"
            />
          </div>

          {/* LPA */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Current CTC (LPA)"
              name="current_lpa"
              type="number"
              step="0.5"
              defaultValue={String(profile?.current_lpa ?? "")}
              placeholder="28"
              hint="Lakhs per annum — private, never shown"
            />
            <Field
              label="Target CTC (LPA)"
              name="target_lpa"
              type="number"
              step="0.5"
              defaultValue={String(profile?.target_lpa ?? "")}
              placeholder="45"
              hint="Used to filter low-band roles"
            />
          </div>

          {/* Tech stack */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tech stack</label>
            <input
              name="tech_stack"
              defaultValue={techStack.join(", ")}
              placeholder="React, Node.js, Python, AWS, PostgreSQL"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-xs text-muted-foreground">Comma-separated list</p>
          </div>

          {/* Preferred hubs */}
          <div>
            <label className="mb-2 block text-sm font-medium">Preferred locations</label>
            <div className="flex flex-wrap gap-2">
              {INDIA_HUBS.map((hub) => {
                const id = `hub_${hub.replace(/\s+/g, "_")}`;
                return (
                  <label key={hub} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary">
                    <input
                      type="checkbox"
                      name={id}
                      defaultChecked={preferredHubs.includes(hub)}
                      className="sr-only"
                    />
                    {hub}
                  </label>
                );
              })}
            </div>
          </div>

          {/* DPDP notice */}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            Stored securely in India · DPDP Act 2023 compliant · delete anytime from Settings
          </p>

          <button
            type="submit"
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98]"
          >
            Save profile
          </button>
        </form>
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
