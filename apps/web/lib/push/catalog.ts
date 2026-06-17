// Catalog of push notification categories. Kept free of server-only imports so
// both the cron dispatcher and the settings UI can share the keys + labels.
//
// The string keys double as:
//   • the `notifications.type` value (for per-type watermarking), and
//   • the `profiles.notification_prefs` keys (per-category mute switches).

export const NOTIFICATION_KINDS = ["new_matches", "application_reminders", "job_alerts"] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NOTIFICATION_KIND_LABELS: Record<
  NotificationKind,
  { title: string; description: string }
> = {
  new_matches: {
    title: "New matches",
    description: "When new strong-fit roles match your profile.",
  },
  application_reminders: {
    title: "Application reminders",
    description: "Follow-ups due and applications that need attention.",
  },
  job_alerts: {
    title: "New job alerts",
    description: "Newly posted roles at companies you've applied to or strongly match.",
  },
};

// A category is enabled unless explicitly set to false (opt-out semantics), so a
// brand-new user with an empty prefs object gets every category by default.
export function isKindEnabled(
  prefs: Record<string, unknown> | null | undefined,
  kind: NotificationKind,
): boolean {
  if (!prefs) return true;
  return prefs[kind] !== false;
}
