import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENT_LABELS, type ConsentPurpose } from "@/lib/dpdp/consent";
import { submitConsents } from "./actions";

export const metadata: Metadata = { title: "Privacy consent" };

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const params = await searchParams;
  const next = params.next ?? "/dashboard";

  const purposes = Object.entries(CONSENT_LABELS) as [ConsentPurpose, (typeof CONSENT_LABELS)[ConsentPurpose]][];

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Your data, your choice</h1>
            <p className="text-sm text-muted-foreground">
              ProdMatch.ai collects only what you permit — as required by the{" "}
              <span className="text-primary/80">DPDP Act 2023</span>.
            </p>
          </div>
        </div>

        <form action={submitConsents} className="space-y-3">
          <input type="hidden" name="next" value={next} />

          {purposes.map(([key, meta]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-4 rounded-xl border border-border bg-card/60 p-4 transition hover:border-primary/30 hover:bg-card"
            >
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={meta.required}
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
                <p className="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
              </div>
            </label>
          ))}

          <p className="pt-1 text-xs text-muted-foreground">
            You can review and revoke these permissions at any time from{" "}
            <strong>Settings → Privacy</strong>. We never sell your data.
          </p>

          <button
            type="submit"
            className="mt-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow shadow-primary/20 transition hover:opacity-90 active:scale-[0.98]"
          >
            Save preferences and continue
          </button>
        </form>
      </div>
    </div>
  );
}
