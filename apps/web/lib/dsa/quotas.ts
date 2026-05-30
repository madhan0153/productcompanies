import type { BillingPlan } from "@/lib/billing/catalog";

// DSA-tab tier rules. Mirrors the monetization table in the design handoff.
// Plans reuse the canonical billing plan ids (free | pro | career_sprint).

export type DsaLang = "python" | "java" | "cpp";

export interface DsaQuota {
  /** Full step-by-step approaches a Free user may unlock per month. */
  fullApproachesPerMonth: number | "unlimited";
  /** Bonus practice questions per day beyond today's pick. */
  bonusPerDay: number | "unlimited";
  /** Skip-today allowance and the window it resets over. */
  skipsAllowance: number;
  skipsPeriod: "week" | "day";
  /** One freeze token accrues every N days. */
  freezeEveryDays: number;
  /** Languages whose full solution is delivered. */
  langs: DsaLang[];
  /** Line-by-line annotations on the solution. */
  annotations: boolean;
  aiCoach: "none" | "weekly" | "daily";
  companyTracks: "none" | "basic" | "full";
  interviewCountdown: boolean;
  recallCadence: "monthly" | "weekly" | "daily";
}

export const DSA_QUOTAS: Record<BillingPlan, DsaQuota> = {
  free: {
    fullApproachesPerMonth: 3,
    bonusPerDay: 0,
    skipsAllowance: 1,
    skipsPeriod: "week",
    freezeEveryDays: 10,
    langs: ["python"],
    annotations: false,
    aiCoach: "none",
    companyTracks: "none",
    interviewCountdown: false,
    recallCadence: "monthly",
  },
  pro: {
    fullApproachesPerMonth: "unlimited",
    bonusPerDay: 5,
    skipsAllowance: 3,
    skipsPeriod: "day",
    freezeEveryDays: 3,
    langs: ["python", "java", "cpp"],
    annotations: false,
    aiCoach: "weekly",
    companyTracks: "basic",
    interviewCountdown: false,
    recallCadence: "weekly",
  },
  career_sprint: {
    fullApproachesPerMonth: "unlimited",
    bonusPerDay: "unlimited",
    skipsAllowance: 9999,
    skipsPeriod: "day",
    freezeEveryDays: 1,
    langs: ["python", "java", "cpp"],
    annotations: true,
    aiCoach: "daily",
    companyTracks: "full",
    interviewCountdown: true,
    recallCadence: "daily",
  },
};

export function dsaQuota(plan: BillingPlan): DsaQuota {
  return DSA_QUOTAS[plan];
}
