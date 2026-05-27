export type BillingPlan = "free" | "pro" | "career_sprint";
export type BillingInterval = "monthly" | "yearly";
export type CreditKind = "tailored_resume" | "resume_reparse" | "priority_recompute";
export type CheckoutProductId =
  | "pro_monthly"
  | "pro_yearly"
  | "career_sprint_monthly"
  | "career_sprint_yearly"
  | "tailor_credits_50";

export type PaidCheckoutProduct = Exclude<CheckoutProductId, "tailor_credits_50">;

export interface PlanLimits {
  tailoredResumeLimit: number;
  priorityLevel: number;
  featureFlags: {
    unlimitedMatches: boolean;
    advancedSignals: boolean;
    interviewStudyPlan: boolean;
    dsaPersonalization: boolean;
    adFree: boolean;
    premiumExports: boolean;
    companyApplyPlan: boolean;
  };
}

export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    tailoredResumeLimit: 5,
    priorityLevel: 0,
    featureFlags: {
      unlimitedMatches: false,
      advancedSignals: false,
      interviewStudyPlan: false,
      dsaPersonalization: false,
      adFree: false,
      premiumExports: false,
      companyApplyPlan: false,
    },
  },
  pro: {
    tailoredResumeLimit: 30,
    priorityLevel: 1,
    featureFlags: {
      unlimitedMatches: true,
      advancedSignals: true,
      interviewStudyPlan: true,
      dsaPersonalization: true,
      adFree: true,
      premiumExports: false,
      companyApplyPlan: false,
    },
  },
  career_sprint: {
    tailoredResumeLimit: 100,
    priorityLevel: 2,
    featureFlags: {
      unlimitedMatches: true,
      advancedSignals: true,
      interviewStudyPlan: true,
      dsaPersonalization: true,
      adFree: true,
      premiumExports: true,
      companyApplyPlan: true,
    },
  },
};

export const PRICING_COPY = {
  proDaily: "₹3.3/day",
  proMonthlyBilling: "billed monthly at ₹99",
  proYearly: "₹999/year",
  careerSprintMonthly: "₹499/month",
  careerSprintYearly: "₹4,999/year",
  creditPack50: "50 Tailor Credits — ₹999",
} as const;

export const CHECKOUT_PRODUCTS: Record<CheckoutProductId, {
  plan: BillingPlan | null;
  interval: BillingInterval | "one_time";
  amountInPaise: number;
  creditGrant?: { kind: CreditKind; amount: number };
  envKey: string;
}> = {
  pro_monthly: {
    plan: "pro",
    interval: "monthly",
    amountInPaise: 9_900,
    envKey: "DODO_PRODUCT_PRO_MONTHLY_ID",
  },
  pro_yearly: {
    plan: "pro",
    interval: "yearly",
    amountInPaise: 99_900,
    envKey: "DODO_PRODUCT_PRO_YEARLY_ID",
  },
  career_sprint_monthly: {
    plan: "career_sprint",
    interval: "monthly",
    amountInPaise: 49_900,
    envKey: "DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID",
  },
  career_sprint_yearly: {
    plan: "career_sprint",
    interval: "yearly",
    amountInPaise: 499_900,
    envKey: "DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID",
  },
  tailor_credits_50: {
    plan: null,
    interval: "one_time",
    amountInPaise: 99_900,
    creditGrant: { kind: "tailored_resume", amount: 50 },
    envKey: "DODO_PRODUCT_TAILOR_CREDITS_50_ID",
  },
};

export function getPlanLimits(plan: BillingPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function betterPlan(a: BillingPlan, b: BillingPlan): BillingPlan {
  const rank: Record<BillingPlan, number> = { free: 0, pro: 1, career_sprint: 2 };
  return rank[a] >= rank[b] ? a : b;
}
