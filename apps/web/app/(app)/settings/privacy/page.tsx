import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Download, Trash2, ShieldCheck, Database, FileLock2, BellRing, MonitorSmartphone } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONSENT_LABELS, getUserConsents, type ConsentPurpose } from "@/lib/dpdp/consent";
import { submitConsents } from "@/app/consent/actions";
import { requestDataExport, requestErasure, revokePushDevice, updateNotificationPrefs } from "./actions";
import { SectionCard } from "@/components/section-card";
import { PushOptIn } from "@/components/push-opt-in";
import { clientEnv } from "@/lib/env";
import {
  DEFAULT_NOTIFICATION_FREQUENCIES,
  NOTIFICATION_KINDS,
  NOTIFICATION_KIND_LABELS,
  getKindFrequency,
} from "@/lib/push/catalog";

export const metadata: Metadata = { title: "Privacy settings" };

export default async function PrivacySettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const current = await getUserConsents(user.id);
  const purposes = Object.entries(CONSENT_LABELS) as [
    ConsentPurpose,
    (typeof CONSENT_LABELS)[ConsentPurpose],
  ][];

  const notificationsOn = current.notifications ?? false;
  const [{ data: preferenceRow }, { data: devices }] = await Promise.all([
    supabase
      .from("notification_preferences")
      .select("push_enabled, timezone, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, detailed_content, category_frequencies")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("push_subscriptions")
      .select("id, device_name, user_agent, created_at, last_success_at, disabled_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);
  const notificationPrefs =
    (preferenceRow?.category_frequencies as Record<string, unknown> | null) ??
    DEFAULT_NOTIFICATION_FREQUENCIES;

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-8">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-soft-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">Privacy settings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your data permissions under the DPDP Act 2023.
            </p>
          </div>
        </div>
      </div>

      {/* Consent toggles */}
      <SectionCard
        title="Data permissions"
        subtitle="Granular consent — toggle each purpose on or off independently"
        icon={<FileLock2 className="h-4 w-4" />}
      >
        <form action={submitConsents} className="space-y-3">
          <input type="hidden" name="next" value="/settings/privacy" />

          {purposes.map(([key, meta]) => {
            const checked = meta.required ? true : (current[key] ?? false);
            return (
              <label
                key={key}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4 transition hover:border-primary/30 hover:bg-secondary"
              >
                <input
                  type="checkbox"
                  name={key}
                  defaultChecked={checked}
                  disabled={meta.required}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[hsl(var(--primary))]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    {meta.title}
                    {meta.required && (
                      <span className="rounded-full border border-primary/30 bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary-soft-foreground">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </label>
            );
          })}

          <button
            type="submit"
            className="press tap-target w-full rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 focus-ring"
          >
            Update preferences
          </button>
        </form>
      </SectionCard>

      {/* Push notifications — device-level opt-in, gated on the notifications consent */}
      <SectionCard
        title="Push notifications"
        subtitle="Get alerted on this device when new strong-fit roles match"
        icon={<BellRing className="h-4 w-4" />}
      >
        <PushOptIn
          vapidPublicKey={clientEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
          consentGranted={notificationsOn}
        />

        {notificationsOn && (
          <form
            action={updateNotificationPrefs}
            className="mt-4 space-y-2.5 border-t border-border/60 pt-4"
          >
            <label className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3">
              <input
                type="checkbox"
                name="push_enabled"
                defaultChecked={preferenceRow?.push_enabled ?? true}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="block text-sm font-medium">Master push toggle</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Keeps in-app notifications available while pausing browser delivery.
                </span>
              </span>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Timezone
                <input
                  name="timezone"
                  defaultValue={preferenceRow?.timezone ?? "Asia/Kolkata"}
                  className="mt-1.5 min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus-ring"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Quiet hours
                <span className="mt-1.5 flex items-center gap-2">
                  <input
                    type="time"
                    name="quiet_hours_start"
                    defaultValue={(preferenceRow?.quiet_hours_start ?? "22:00").slice(0, 5)}
                    className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-ring"
                  />
                  <span aria-hidden>to</span>
                  <input
                    type="time"
                    name="quiet_hours_end"
                    defaultValue={(preferenceRow?.quiet_hours_end ?? "08:00").slice(0, 5)}
                    className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-2 text-sm focus-ring"
                  />
                </span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="quiet_hours_enabled"
                defaultChecked={preferenceRow?.quiet_hours_enabled ?? false}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Pause non-critical notifications during quiet hours
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                name="detailed_content"
                defaultChecked={preferenceRow?.detailed_content ?? false}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              Allow detailed notification text on the lock screen
            </label>

            <p className="pt-2 text-xs font-semibold text-muted-foreground">What to notify me about</p>
            {NOTIFICATION_KINDS.map((kind) => (
              <div
                key={kind}
                className="flex flex-col gap-3 rounded-lg border border-border bg-secondary/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{NOTIFICATION_KIND_LABELS[kind].title}</div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {NOTIFICATION_KIND_LABELS[kind].description}
                  </p>
                </div>
                <select
                  name={kind}
                  defaultValue={getKindFrequency(notificationPrefs, kind)}
                  disabled={NOTIFICATION_KIND_LABELS[kind].transactional}
                  aria-label={`${NOTIFICATION_KIND_LABELS[kind].title} frequency`}
                  className="min-h-11 rounded-md border border-border bg-background px-3 text-sm capitalize focus-ring disabled:opacity-70"
                >
                  {NOTIFICATION_KIND_LABELS[kind].frequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {frequency.replace("_", " ")}
                    </option>
                  ))}
                </select>
                {NOTIFICATION_KIND_LABELS[kind].transactional && (
                  <input type="hidden" name={kind} value="immediate" />
                )}
              </div>
            ))}
            <button
              type="submit"
              className="press tap-target w-full rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
            >
              Save notification preferences
            </button>
          </form>
        )}

        {notificationsOn && (
          <div className="mt-5 border-t border-border/60 pt-4">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Registered devices</p>
            </div>
            <div className="mt-2 space-y-2">
              {(devices ?? []).length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                  No browser is currently subscribed.
                </p>
              ) : (
                devices?.map((device) => (
                  <div key={device.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{device.device_name ?? "Web browser"}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {device.disabled_at
                          ? "Inactive"
                          : device.last_success_at
                            ? `Last delivered ${new Date(device.last_success_at).toLocaleDateString("en-IN")}`
                            : "Subscribed; awaiting first delivery"}
                      </p>
                    </div>
                    <form action={revokePushDevice}>
                      <input type="hidden" name="subscription_id" value={device.id} />
                      <button
                        type="submit"
                        className="min-h-11 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground hover:text-destructive focus-ring"
                      >
                        Remove
                      </button>
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Data export */}
      <SectionCard
        title="Your data"
        subtitle="Right to Access — download every record we hold about you"
        icon={<Database className="h-4 w-4" />}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          Download a JSON file containing your profile, match scores, applications, stories, offers,
          and consent audit log. Provided under the DPDP Act 2023 right to access.
        </p>
        <form action={requestDataExport} className="mt-4">
          <button
            type="submit"
            className="press tap-target inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground focus-ring"
          >
            <Download className="h-3.5 w-3.5" />
            Download my data
          </button>
        </form>
      </SectionCard>

      {/* Account erasure */}
      <section className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <Trash2 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-destructive">Danger zone — Right to Erasure</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Permanently deletes your profile, resume, matches, applications, stories, offers, and all
              associated data. This action is irreversible. An anonymised consent audit record is
              retained for legal compliance.
            </p>
          </div>
        </div>

        <form action={requestErasure} className="mt-5 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="confirmation">
              Type{" "}
              <code className="rounded bg-card border border-border px-1 py-0.5 font-mono text-destructive">
                DELETE MY ACCOUNT
              </code>{" "}
              to confirm
            </label>
            <input
              id="confirmation"
              name="confirmation"
              type="text"
              required
              placeholder="DELETE MY ACCOUNT"
              autoComplete="off"
              className="tap-target w-full rounded-md border border-destructive/30 bg-background px-3 text-sm placeholder:text-muted-foreground/40 focus:border-destructive focus:outline-none focus:ring-1 focus:ring-destructive/30"
            />
          </div>
          <button
            type="submit"
            className="press tap-target inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 text-sm font-semibold text-destructive transition hover:bg-destructive/20 focus-ring"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete my account permanently
          </button>
        </form>
      </section>

      {/* DPDP notice */}
      <div className="rounded-lg border border-border bg-secondary/40 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">DPDP Act 2023 · </span>
          ProdMatch.ai processes your data only for the purposes you consent to. You may withdraw
          consent or request erasure at any time. Contact{" "}
          <a
            href="mailto:privacy@prodmatch.ai"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            privacy@prodmatch.ai
          </a>{" "}
          for any data-related queries.
        </p>
      </div>
    </div>
  );
}
