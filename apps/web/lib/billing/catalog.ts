export type BillingPlan = "free" | "pro" | "career_sprint";
export type BillingInterval = "monthly" | "yearly";
export type CreditKind = "tailored_resume" | "resume_reparse" | "priority_recompute";
export type CheckoutProductId =
  | "pro_monthly"
  | "pro_yearly"
  | "career_sprint_monthly"
  | "career_sprint_yearly"
  | "tailor_credits_50"
  | "payment_test_10_inr";

export type PaidCheckoutProduct = Exclude<CheckoutProductId, "tailor_credits_50" | "payment_test_10_inr">;

export interface PlanLimits {
  tailoredResumeLimit:   number;
  matchesViewLimit:      number;       // total matches a user can view per 30-day window
  priorityMatchesShown:  number;       // of those, how many are "priority" (strong/good fit)
  resumeReparseLimit:    number;
  priorityRecomputes:    number;
  priorityLevel:         number;
  featureFlags: {
    unlimitedMatches:     boolean;
    advancedSignals:      boolean;
    interviewStudyPlan:   boolean;
    dsaPersonalization:   boolean;
    adFree:               boolean;
    premiumExports:       boolean;
    companyApplyPlan:     boolean;
  };
}

// Free tier intentionally permissive on viewing matches (so users feel the
// product works) but strict on the actions that cost real LLM money
// (tailoring, re-parsing). The narrow 6-priority-of-20 free slice creates
// honest scarcity — extra priority matches exist and are visible-but-locked.
export const PLAN_LIMITS: Record<BillingPlan, PlanLimits> = {
  free: {
    tailoredResumeLimit:   5,
    matchesViewLimit:     20,
    priorityMatchesShown:  6,
    resumeReparseLimit:    0,
    priorityRecomputes:    0,
    priorityLevel:         0,
    featureFlags: {
      unlimitedMatches:     false,
      advancedSignals:      false,
      interviewStudyPlan:   false,
      dsaPersonalization:   false,
      adFree:               false,
      premiumExports:       false,
      companyApplyPlan:     false,
    },
  },
  pro: {
    tailoredResumeLimit:   30,
    matchesViewLimit:    9999,
    priorityMatchesShown: 9999,
    resumeReparseLimit:    5,
    priorityRecomputes:    2,
    priorityLevel:         1,
    featureFlags: {
      unlimitedMatches:     true,
      advancedSignals:      true,
      interviewStudyPlan:   true,
      dsaPersonalization:   true,
      adFree:               true,
      premiumExports:       false,
      companyApplyPlan:     false,
    },
  },
  career_sprint: {
    tailoredResumeLimit:  100,
    matchesViewLimit:    9999,
    priorityMatchesShown: 9999,
    resumeReparseLimit:   20,
    priorityRecomputes:   10,
    priorityLevel:         2,
    featureFlags: {
      unlimitedMatches:     true,
      advancedSignals:      true,
      interviewStudyPlan:   true,
      dsaPersonalization:   true,
      adFree:               true,
      premiumExports:       true,
      companyApplyPlan:     true,
    },
  },
};

// ─── Pricing (in paise; all India INR) ────────────────────────────────────────

export const PRICING = {
  pro: {
    monthly:        9_900,                 // ₹99
    yearly:         99_900,                // ₹999
    monthlyEquivYearly: Math.round(99_900 / 12),  // ~₹83/mo equivalent
  },
  career_sprint: {
    monthly:        49_900,                // ₹499
    yearly:        499_900,                // ₹4,999
    monthlyEquivYearly: Math.round(499_900 / 12), // ~₹417/mo equivalent
  },
  credit_pack_50: {
    once:           99_900,                // ₹999 for 50 credits
  },
  payment_test: {
    once:            1_000,                // ₹10; verification only, never grants access
  },
} as const;

// ─── Display copy with per-day framing for ALL plans ──────────────────────────

function paiseToInr(p: number): string {
  // Compact INR for display, no decimals when whole
  const rupees = p / 100;
  return rupees % 1 === 0
    ? `₹${rupees.toLocaleString("en-IN")}`
    : `₹${rupees.toFixed(0)}`;
}

function paisePerDay(monthlyPaise: number): string {
  const perDay = monthlyPaise / 100 / 30;
  // Round to nearest rupee for cleanliness
  return `₹${Math.round(perDay)}/day`;
}

function yearlyPaisePerDay(yearlyPaise: number): string {
  const perDay = yearlyPaise / 100 / 365;
  return `₹${Math.round(perDay)}/day`;
}

export const PRICING_COPY = {
  // Per-day (the headline number — feels smallest)
  proPerDay:                paisePerDay(PRICING.pro.monthly),               // "₹3/day"
  proPerDayYearly:          yearlyPaisePerDay(PRICING.pro.yearly),          // "₹3/day" (slightly less)
  sprintPerDay:             paisePerDay(PRICING.career_sprint.monthly),     // "₹17/day"
  sprintPerDayYearly:       yearlyPaisePerDay(PRICING.career_sprint.yearly),// "₹14/day"
  creditPerUse:             `₹${Math.round(PRICING.credit_pack_50.once / 100 / 50)} per tailored resume`, // "₹20 per..."

  // Real billed amount (shown smaller, for clarity)
  proMonthly:               paiseToInr(PRICING.pro.monthly),                // "₹99"
  proYearly:                paiseToInr(PRICING.pro.yearly),                 // "₹999"
  proMonthlyBilling:        `billed monthly at ${paiseToInr(PRICING.pro.monthly)}`,
  sprintMonthly:            paiseToInr(PRICING.career_sprint.monthly),
  sprintYearly:             paiseToInr(PRICING.career_sprint.yearly),
  creditPack50:             `50 Tailor Credits — ${paiseToInr(PRICING.credit_pack_50.once)}`,

  // Strikethrough anchor: monthly × 12 (genuine — that's what you'd pay without annual)
  proYearlyAnchor:          paiseToInr(PRICING.pro.monthly * 12),           // "₹1,188"
  sprintYearlyAnchor:       paiseToInr(PRICING.career_sprint.monthly * 12), // "₹5,988"

  // Real savings
  proYearlySavings:         paiseToInr(PRICING.pro.monthly * 12 - PRICING.pro.yearly), // "₹189"
  sprintYearlySavings:      paiseToInr(PRICING.career_sprint.monthly * 12 - PRICING.career_sprint.yearly), // "₹989"
  proYearlySavingsPct:      Math.round((1 - PRICING.pro.yearly / (PRICING.pro.monthly * 12)) * 100), // 16
  sprintYearlySavingsPct:   Math.round((1 - PRICING.career_sprint.yearly / (PRICING.career_sprint.monthly * 12)) * 100), // 16
} as const;

export const CHECKOUT_PRODUCTS: Record<CheckoutProductId, {
  plan: BillingPlan | null;
  interval: BillingInterval | "one_time";
  amountInPaise: number;
  creditGrant?: { kind: CreditKind; amount: number };
  envKey: string;
  public: boolean;
  temporary?: boolean;
  verificationOnly?: boolean;
}> = {
  pro_monthly: {
    plan: "pro",
    interval: "monthly",
    amountInPaise: PRICING.pro.monthly,
    envKey: "DODO_PRODUCT_PRO_MONTHLY_ID",
    public: true,
  },
  pro_yearly: {
    plan: "pro",
    interval: "yearly",
    amountInPaise: PRICING.pro.yearly,
    envKey: "DODO_PRODUCT_PRO_YEARLY_ID",
    public: true,
  },
  career_sprint_monthly: {
    plan: "career_sprint",
    interval: "monthly",
    amountInPaise: PRICING.career_sprint.monthly,
    envKey: "DODO_PRODUCT_CAREER_SPRINT_MONTHLY_ID",
    public: true,
  },
  career_sprint_yearly: {
    plan: "career_sprint",
    interval: "yearly",
    amountInPaise: PRICING.career_sprint.yearly,
    envKey: "DODO_PRODUCT_CAREER_SPRINT_YEARLY_ID",
    public: true,
  },
  tailor_credits_50: {
    plan: null,
    interval: "one_time",
    amountInPaise: PRICING.credit_pack_50.once,
    creditGrant: { kind: "tailored_resume", amount: 50 },
    envKey: "DODO_PRODUCT_TAILOR_CREDITS_50_ID",
    public: true,
  },
  payment_test_10_inr: {
    plan: null,
    interval: "one_time",
    amountInPaise: PRICING.payment_test.once,
    envKey: "DODO_PRODUCT_PAYMENT_TEST_10_INR_ID",
    public: false,
    temporary: true,
    verificationOnly: true,
  },
};

export function getPlanLimits(plan: BillingPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

export function betterPlan(a: BillingPlan, b: BillingPlan): BillingPlan {
  const rank: Record<BillingPlan, number> = { free: 0, pro: 1, career_sprint: 2 };
  return rank[a] >= rank[b] ? a : b;
}

export function planLabel(plan: BillingPlan): string {
  if (plan === "career_sprint") return "Career Sprint";
  if (plan === "pro") return "Pro";
  return "Free";
}
