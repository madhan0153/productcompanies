import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Trash2, ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENT_LABELS, getUserConsents, type ConsentPurpose } from "@/lib/dpdp/consent";
import { submitConsents } from "@/app/consent/actions";
import { requestDataExport, requestErasure } from "./actions";

export const metadata: Metadata = { title: "Privacy settings" };

export default async function PrivacySettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ erased?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const current = await getUserConsents(user.id);
  const purposes = Object.entries(CONSENT_LABELS) as [
    ConsentPurpose,
    (typeof CONSENT_LABELS)[ConsentPurpose],
  ][];

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-semibold">Privacy settings</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your data permissions under the DPDP Act 2023.
        </p>
      </div>

      {/* Consent toggles */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Data permissions
        </h2>
        <form action={submitConsents} className="space-y-3">
          <input type="hidden" name="next" value="/settings/privacy" />

          {purposes.map(([key, meta]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/30 hover:bg-card"
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={meta.required ? true : (current[key] ?? false)}
                  disabled={meta.required}
                  className="h-4 w-4 rounded accent-[hsl(var(--primary))]"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {meta.title}
                  {meta.required && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      Required
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </label>
          ))}

          <button
            type="submit"
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98]"
          >
            Update preferences
          </button>
        </form>
      </section>

      {/* Data export */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Your data (Right to Access)
        </h2>
        <div className="rounded-xl border border-border bg-card/40 p-5">
          <div className="flex items-start gap-3">
            <Download className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">Export all my data</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Download a JSON file containing your profile, match scores,
                applications, stories, offers, and consent audit log. Provided
                under the DPDP Act 2023 right to access.
              </p>
            </div>
          </div>
          <form action={requestDataExport} className="mt-4">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              <Download className="h-3.5 w-3.5" />
              Download my data
            </button>
          </form>
        </div>
      </section>

      {/* Account erasure */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Danger zone (Right to Erasure)
        </h2>
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5">
          <div className="flex items-start gap-3">
            <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-rose-400">
                Delete account and all data
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently deletes your profile, resume, matches, applications,
                stories, offers, and all associated data. This action is
                irreversible. An anonymised consent audit record is retained for
                legal compliance.
              </p>
            </div>
          </div>

          <form action={requestErasure} className="mt-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Type{" "}
                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-rose-400">
                  DELETE MY ACCOUNT
                </code>{" "}
                to confirm
              </label>
              <input
                name="confirmation"
                type="text"
                required
                placeholder="DELETE MY ACCOUNT"
                autoComplete="off"
                className="w-full rounded-xl border border-rose-500/20 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-rose-500/40 focus:outline-none focus:ring-1 focus:ring-rose-500/30"
              />
            </div>
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-sm font-medium text-rose-400 transition hover:bg-rose-500/20"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete my account permanently
            </button>
          </form>
        </div>
      </section>

      {/* DPDP notice */}
      <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">DPDP Act 2023 · </span>
          ProdMatch.ai processes your data only for the purposes you consent to.
          You may withdraw consent or request erasure at any time. Contact{" "}
          <a
            href="mailto:privacy@prodmatch.ai"
            className="text-primary underline-offset-2 hover:underline"
          >
            privacy@prodmatch.ai
          </a>{" "}
          for any data-related queries.
        </p>
      </div>
    </div>
  );
}
