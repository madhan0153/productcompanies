// Catalog of push notification categories. Kept free of server-only imports so
// both the cron dispatcher and the settings UI can share the keys + labels.
//
// The string keys double as:
//   • the `notifications.type` value (for per-type watermarking), and
//   • the `profiles.notification_prefs` keys (per-category mute switches).

export const NOTIFICATION_KINDS = [
  "job_matches",
  "saved_searches",
  "application_reminders",
  "interview_reminders",
  "resume_updates",
  "preparation_reminders",
  "career_sprint",
  "product_announcements",
  "billing",
  "security",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];
export const NOTIFICATION_FREQUENCIES = ["immediate", "daily", "weekly", "disabled"] as const;
export type NotificationFrequency = (typeof NOTIFICATION_FREQUENCIES)[number];

export const NOTIFICATION_KIND_LABELS: Record<
  NotificationKind,
  { title: string; description: string; transactional?: boolean; frequencies: readonly NotificationFrequency[] }
> = {
  job_matches: {
    title: "Job-match alerts",
    description: "When new strong-fit roles match your profile.",
    frequencies: ["immediate", "daily", "weekly", "disabled"],
  },
  saved_searches: {
    title: "Saved-search alerts",
    description: "New roles matching your saved company, role, location, and work-mode interests.",
    frequencies: ["immediate", "daily", "weekly", "disabled"],
  },
  application_reminders: {
    title: "Application reminders",
    description: "Follow-ups due and applications that need attention.",
    frequencies: ["immediate", "daily", "disabled"],
  },
  interview_reminders: {
    title: "Interview reminders",
    description: "Time-sensitive preparation and interview follow-ups.",
    frequencies: ["immediate", "disabled"],
  },
  resume_updates: {
    title: "Resume and match updates",
    description: "Resume processing, match runs, and meaningful improvement recommendations.",
    frequencies: ["immediate", "daily", "disabled"],
  },
  preparation_reminders: {
    title: "DSA and preparation",
    description: "Practice reminders at the cadence you choose.",
    frequencies: ["daily", "weekly", "disabled"],
  },
  career_sprint: {
    title: "Career Sprint",
    description: "Next best actions and weekly career progress.",
    frequencies: ["immediate", "weekly", "disabled"],
  },
  product_announcements: {
    title: "Product announcements",
    description: "Only major features, maintenance, and material policy updates.",
    frequencies: ["weekly", "disabled"],
  },
  billing: {
    title: "Billing",
    description: "Payment, renewal, invoice, and subscription status updates.",
    transactional: true,
    frequencies: ["immediate"],
  },
  security: {
    title: "Account security",
    description: "Important sign-in, recovery, privacy, and account-change alerts.",
    transactional: true,
    frequencies: ["immediate"],
  },
};

export const DEFAULT_NOTIFICATION_FREQUENCIES: Record<NotificationKind, NotificationFrequency> = {
  job_matches: "immediate",
  saved_searches: "daily",
  application_reminders: "immediate",
  interview_reminders: "immediate",
  resume_updates: "immediate",
  preparation_reminders: "daily",
  career_sprint: "weekly",
  product_announcements: "disabled",
  billing: "immediate",
  security: "immediate",
};

export function getKindFrequency(
  prefs: Record<string, unknown> | null | undefined,
  kind: NotificationKind,
): NotificationFrequency {
  const value = prefs?.[kind];
  return NOTIFICATION_FREQUENCIES.includes(value as NotificationFrequency)
    ? (value as NotificationFrequency)
    : DEFAULT_NOTIFICATION_FREQUENCIES[kind];
}

export function isKindEnabled(
  prefs: Record<string, unknown> | null | undefined,
  kind: NotificationKind,
): boolean {
  return getKindFrequency(prefs, kind) !== "disabled";
}
