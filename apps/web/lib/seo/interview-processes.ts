// Per-company interview-process editorial.
//
// We don't have user-reported data yet, so the content is editorial:
// the widely-publicly-known shape of each company's loop. Every claim
// is clearly flagged as community-reported with a freshness caveat.
// This is the right shape for AI-tool citation on "interview process at
// {company}" queries.

export interface InterviewRound {
  name: string;
  /** ~40-60 word description of what happens in this round. */
  description: string;
  /** Estimated duration in minutes. */
  durationMin: number;
  /** Optional what-to-prep bullet list. */
  prep?: string[];
}

export interface InterviewProcess {
  /** Public-facing role function the loop is calibrated for. */
  roleFunction: "backend" | "frontend" | "fullstack" | "data_engineering" | "ml_ai" | "devops_platform" | "any";
  /** "Typical SDE-2 / Mid-level loop". */
  loopLabel: string;
  rounds: InterviewRound[];
  /** What raises your odds at this company. */
  successFactors: string[];
  /** Where loops most commonly fail. */
  commonRejectionReasons: string[];
}

export interface CompanyInterviewSpec {
  slug: string;
  /** TL;DR — 50-80 words, answer-first. */
  tldr: string;
  /** Plain-text overview that AI tools can quote. */
  overview: string;
  processes: InterviewProcess[];
}

// Realistic loops based on publicly-shared candidate experiences in
// 2024-2026 (engineering blogs, Glassdoor patterns, candidate reports
// surfaced on LeetCode/blind/reddit). NOT exact reproductions of any
// company's internal process.

export const INTERVIEW_PROCESSES: readonly CompanyInterviewSpec[] = [
  {
    slug: "google",
    tldr:
      "Google India's engineering loop typically runs 4-5 rounds over 2 weeks: 1 recruiter screen, 1-2 technical phone screens (DSA + simple system design), and 4 onsite rounds (2x DSA, 1x system design, 1x behavioural / Googleyness). SDE-2 and above add a hiring-committee review after the onsite.",
    overview:
      "Google India's standard interview loop is the same template used globally: structured DSA + system design + behavioural rounds with a strong bias toward whiteboard-grade reasoning and explicit complexity analysis. Loops are reviewed by a hiring committee independent of the interviewers; decision usually within 1-2 weeks of the final onsite. Compensation has 4 components: base + variable + RSUs + sign-on (RSUs vest over 4 years with a back-loaded curve at higher levels).",
    processes: [
      {
        roleFunction: "any",
        loopLabel: "Typical SDE-2 / Mid loop",
        rounds: [
          { name: "Recruiter screen", description: "30-min phone call confirming interest, level fit, comp expectations, and Indian visa / work-eligibility basics. Sets calendar for the technical loop.", durationMin: 30 },
          { name: "Technical phone screen 1", description: "Live coding in Google Docs or CoderPad. One medium DSA problem. Tests algorithmic clarity, edge-case enumeration, and clean code style.", durationMin: 45, prep: ["Two pointers", "Sliding window", "Hash maps"] },
          { name: "Technical phone screen 2 (sometimes)", description: "Second DSA problem or a small open-ended system-design ('design a rate limiter'). Skipped for some candidates depending on screen 1 signal.", durationMin: 45 },
          { name: "Onsite — DSA 1", description: "1 medium-hard DSA problem with active discussion of trade-offs. Time + space complexity required.", durationMin: 45, prep: ["Trees / BFS / DFS", "Heap"] },
          { name: "Onsite — DSA 2", description: "Often graphs, DP, or backtracking. Optimisation discussion matters as much as solution.", durationMin: 45, prep: ["Graphs", "DP"] },
          { name: "Onsite — System design", description: "Open-ended design ('design a URL shortener', 'design YouTube comments'). Trade-off discussion is the signal — not pre-canned diagrams.", durationMin: 45 },
          { name: "Onsite — Googleyness / behavioural", description: "Standardised behavioural rubric: collaboration, ambiguity, technical impact. STAR-format answers, with crisp scope/impact metrics.", durationMin: 45 },
          { name: "Hiring committee", description: "Asynchronous review of all interviewer write-ups by 3-5 unrelated Googlers. Decision typically 1-2 weeks post-onsite.", durationMin: 0 },
        ],
        successFactors: [
          "Explicit complexity discussion on every DSA round",
          "Strong trade-off articulation in system design — not just diagrams",
          "Crisp, quantified STAR answers in behavioural",
          "Asking targeted clarifying questions before coding",
        ],
        commonRejectionReasons: [
          "Solving the problem but failing to articulate complexity / trade-offs",
          "Jumping to code without enumerating edge cases",
          "Vague impact statements in behavioural ('I improved performance' without numbers)",
          "System design that pattern-matches without reasoning",
        ],
      },
    ],
  },
  {
    slug: "razorpay",
    tldr:
      "Razorpay's engineering loop is 4 rounds: 1 phone screen, 1 take-home coding assignment (optional for senior), 2-3 onsite rounds (machine coding / system design / behavioural). Strong bias toward production-quality code in a working environment, not whiteboard puzzles. Decision usually within 7-10 days.",
    overview:
      "Razorpay's interview process emphasises practical engineering: live machine-coding rounds where you build a small system in 90 minutes (often a stripped-down payment gateway, a rate limiter, or an idempotent transaction processor) and discuss your design choices live. System-design rounds focus heavily on payment-domain scenarios. The bar is high but explainable: production-quality code, clean abstractions, working tests.",
    processes: [
      {
        roleFunction: "backend",
        loopLabel: "Typical Backend / SDE-2 loop",
        rounds: [
          { name: "Recruiter call", description: "20-30 min call with the recruiter. Discusses your background, target role, comp band, and Razorpay's interview rubric.", durationMin: 30 },
          { name: "Phone DSA screen", description: "One medium DSA problem on CoderPad. Focus on correctness + code style — not exotic optimisations.", durationMin: 45 },
          { name: "Machine coding (the big one)", description: "90-min live build of a small system end-to-end. Recent examples: a payment-link generator with idempotency, a transaction-history service with pagination, a webhook delivery retry queue. Bring your own IDE; commit at intervals.", durationMin: 90, prep: ["Practice building small services from scratch in 90 min", "Idempotency patterns", "Clean Java/Go/Node idioms"] },
          { name: "System design", description: "Open-ended payment-domain scenario — design a UPI flow, design a refund workflow, design a recurring-subscription service.", durationMin: 60 },
          { name: "Hiring manager + culture", description: "Behavioural + culture fit. Razorpay values ownership; expect questions on bias-to-action, technical leadership, and conflict resolution.", durationMin: 45 },
        ],
        successFactors: [
          "Working code with tests in machine coding round — partial-but-clean beats complete-but-messy",
          "Payment-domain familiarity (idempotency, eventual consistency, retries)",
          "Asking about scale + failure modes in system design upfront",
        ],
        commonRejectionReasons: [
          "Machine coding without tests or clean abstractions",
          "Missing idempotency / retry semantics in design rounds",
          "Behavioural answers that don't show ownership of outcomes",
        ],
      },
    ],
  },
  {
    slug: "swiggy",
    tldr:
      "Swiggy's loop is 4-5 rounds over 1-2 weeks: 1 phone screen, 1 DSA round, 1 system design, 1 hiring-manager + culture, sometimes 1 leadership round for senior levels. Strong bias toward high-throughput consumer-tech systems and on-call sensibility.",
    overview:
      "Swiggy's interview process emphasises systems that can run hot at scale: think 200K RPS food-order pipelines, real-time ETA models, payment + courier orchestration. DSA rounds are standard medium-hard. System-design rounds frequently involve food-delivery domain — design the order-assignment system, design the surge-pricing service, design the courier-location streaming pipeline.",
    processes: [
      {
        roleFunction: "any",
        loopLabel: "Standard backend / fullstack loop",
        rounds: [
          { name: "Recruiter screen", description: "Standard intro + level + comp discussion.", durationMin: 30 },
          { name: "DSA round", description: "One medium-hard problem. Cleanly coded with edge cases + complexity.", durationMin: 60 },
          { name: "System design", description: "Food-delivery-domain scenario. Demonstrate familiarity with high-RPS, eventually-consistent systems.", durationMin: 60 },
          { name: "Hiring manager round", description: "Behavioural + technical leadership + ownership. STAR-format answers; quantified impact preferred.", durationMin: 45 },
          { name: "Senior leadership round", description: "For SDE-3+ levels: discussion of cross-team initiatives, technical strategy, mentorship. Skipped for SDE-1 / SDE-2.", durationMin: 45 },
        ],
        successFactors: [
          "Comfort discussing 100K+ RPS systems and on-call workflows",
          "Domain awareness (food delivery, last-mile logistics, payment edge cases)",
          "Quantified impact stories in behavioural — Swiggy cares about scale numbers",
        ],
        commonRejectionReasons: [
          "Design answers that ignore the operational realities at scale",
          "Behavioural answers that don't demonstrate ownership beyond your immediate team",
        ],
      },
    ],
  },
];

const FALLBACK: InterviewProcess = {
  roleFunction: "any",
  loopLabel: "Typical engineering loop",
  rounds: [
    { name: "Recruiter screen", description: "30-min call covering background, level fit, comp band.", durationMin: 30 },
    { name: "Technical phone screen", description: "Live DSA or short take-home. One medium-hard problem with discussion of complexity + trade-offs.", durationMin: 45 },
    { name: "Onsite — DSA", description: "One harder DSA problem with explicit complexity analysis. Edge cases matter.", durationMin: 45 },
    { name: "Onsite — System design", description: "Open-ended scenario. Trade-off discussion is the signal — diagrams are secondary.", durationMin: 60 },
    { name: "Hiring manager / behavioural", description: "STAR-format behavioural with quantified impact.", durationMin: 45 },
  ],
  successFactors: [
    "Explicit complexity analysis on every DSA round",
    "Trade-off-first design discussion",
    "Quantified impact in behavioural answers",
  ],
  commonRejectionReasons: [
    "Failing to enumerate edge cases before coding",
    "Vague behavioural answers without metrics",
  ],
};

export function interviewProcessFor(slug: string): CompanyInterviewSpec {
  const found = INTERVIEW_PROCESSES.find((p) => p.slug === slug);
  if (found) return found;
  // Fallback for companies without a hand-curated spec — generic loop based
  // on the publicly-known shape of product-company interviews.
  return {
    slug,
    tldr:
      "A typical product-company engineering loop in India runs 4-5 rounds: recruiter screen, 1-2 technical screens (DSA), 1-2 onsites (DSA + system design + behavioural), and a hiring-manager / leadership round at senior levels. Decision usually within 1-2 weeks of the final onsite.",
    overview:
      "Standard product-company engineering loop in 2026: 4-5 rounds focused on DSA correctness + complexity, system-design trade-offs, and behavioural ownership. Compensation typically has base + variable + RSUs at FAANG-tier; base + variable + ESOPs at India-product cos. Decision feedback usually within 7-14 days of the final round.",
    processes: [FALLBACK],
  };
}
