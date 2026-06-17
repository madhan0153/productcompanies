"use client";

import { useTransition, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { saveProfile } from "./actions";

const INDIA_HUBS = [
  "Bengaluru", "Hyderabad", "Pune", "Gurugram",
  "Noida", "Delhi NCR", "Mumbai", "Chennai", "Remote-India",
];

const SENIORITY_OPTIONS = [
  { value: "intern",    label: "Intern" },
  { value: "junior",   label: "Junior (0–2 yrs)" },
  { value: "mid",      label: "Mid (3–5 yrs)" },
  { value: "senior",   label: "Senior (6–9 yrs)" },
  { value: "staff",    label: "Staff / Principal" },
  { value: "manager",  label: "Engineering Manager" },
  { value: "director", label: "Director+" },
];

type Props = {
  defaultValues: {
    display_name: string;
    current_role: string;
    years_experience: string;
    current_lpa: string;
    target_lpa: string;
    tech_stack: string;
    preferred_hubs: string[];
    seniority: string;
  };
};

export function SaveProfileForm({ defaultValues }: Props) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await saveProfile(fd);
      if (!res.ok) {
        setError(res.error ?? "Couldn't save your profile. Please retry.");
        return;
      }
      setSaved(true);
      router.refresh();
      // Auto-hide "Saved" after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Role */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full name" name="display_name" defaultValue={defaultValues.display_name} placeholder="Your name" />
        <Field label="Current role" name="current_role" defaultValue={defaultValues.current_role} placeholder="Senior Software Engineer" />
      </div>

      {/* Seniority + Experience */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Seniority level</label>
          <select
            name="seniority"
            defaultValue={defaultValues.seniority}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-base outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
          defaultValue={defaultValues.years_experience}
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
          defaultValue={defaultValues.current_lpa}
          placeholder="28"
          hint="Lakhs per annum — private, never shown"
        />
        <Field
          label="Target CTC (LPA)"
          name="target_lpa"
          type="number"
          step="0.5"
          defaultValue={defaultValues.target_lpa}
          placeholder="45"
          hint="Used to filter low-band roles"
        />
      </div>

      {/* Tech stack */}
      <div>
        <label className="mb-1.5 block text-sm font-medium">Tech stack</label>
        <input
          name="tech_stack"
          defaultValue={defaultValues.tech_stack}
          placeholder="React, Node.js, Python, AWS, PostgreSQL"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:text-sm"
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
              <label
                key={hub}
                className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition hover:border-primary/40 has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-background"
              >
                <input
                  type="checkbox"
                  name={id}
                  defaultChecked={defaultValues.preferred_hubs.includes(hub)}
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

      {/* Submit + feedback */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="press tap-target flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 focus-ring"
        >
          {pending && <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />}
          {pending ? "Saving…" : "Save profile"}
        </button>

        {saved && !pending && (
          <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium text-success">
            <CheckCircle2 className="h-4 w-4" />
            Profile saved!
          </span>
        )}
        {error && !pending && (
          <span role="status" aria-live="polite" className="text-sm font-medium text-destructive">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

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
        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-base outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 sm:text-sm"
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
