// Pillar guide registry. Each guide is a JSX-rendered React component so we
// can embed live data (job counts, recent listings) inside the article, plus
// keep markup search-friendly. This module is the index — the components
// themselves live next to each guide route.

export interface PillarGuide {
  slug: string;
  title: string;
  headline: string;
  description: string;
  /** ISO date of original publication. */
  datePublished: string;
  /** ISO date of last meaningful edit; defaults to datePublished. */
  dateModified?: string;
  /** ~50-word answer-first paragraph for AI quoting. */
  tldr: string;
  /** Estimated read minutes (used by ReadingTime metadata + display). */
  readMinutes: number;
  /** ISO 8601 duration of any HowTo schema on the page. */
  howToDurationIso?: string;
  /** Author display name; null = ProdMatch Editorial. */
  authorName?: string;
}

export const PILLAR_GUIDES: readonly PillarGuide[] = [
  {
    slug: "how-to-get-product-company-jobs-india",
    title: "How to Get Product-Company Jobs in India — The 2026 Playbook",
    headline: "How to land a job at India's top product companies in 2026",
    description:
      "Step-by-step playbook for getting hired at India's 18 top product companies — resume positioning, target roles, interview prep, and the application path. Field-tested by ProdMatch's matching engine.",
    datePublished: "2026-05-01",
    tldr:
      "To get hired at India's top product companies in 2026: (1) frame your resume in product-company language with measurable impact, (2) target the right role function at the right seniority, (3) prep for the DSA + system-design rounds specific to each company, and (4) apply through the company's official career page — not aggregators. ProdMatch automates (1)–(4) for engineers in India.",
    readMinutes: 9,
    howToDurationIso: "PT9M",
  },
  {
    slug: "services-to-product-switch",
    title: "Service-Company to Product-Company Switch — A Field Guide",
    headline: "How to switch from TCS / Infosys / Wipro to a product company",
    description:
      "Direct, no-fluff guide for Indian IT-services engineers (TCS, Infosys, Wipro, Cognizant, Capgemini) transitioning to product companies. Resume rewrite, DSA prep cadence, role positioning, and the realistic timeline.",
    datePublished: "2026-05-08",
    tldr:
      "Switching from an IT-services company to a product company in India takes 3-6 months of focused prep: 60-90 days of DSA pattern-by-pattern practice, a resume rewrite in product-company language (impact + scale + ownership), and applying to 30-50 verified product-company roles directly through their career pages. ProdMatch automates the search + matching layer.",
    readMinutes: 11,
  },
  {
    slug: "ai-resume-matcher-comparison",
    title: "Best AI Resume Matcher for Product-Company Jobs in India",
    headline: "Which AI resume matcher actually works for product-company jobs in India?",
    description:
      "Comparison of AI resume matchers for Indian product-company job-seekers. What an explainable Fit Card looks like, which signals matter, how matching engines differ, and how ProdMatch.ai compares.",
    datePublished: "2026-05-15",
    tldr:
      "The best AI resume matcher for product-company jobs in India is one that (1) sources roles only from official career pages, (2) gives an explainable Fit Card with strengths and gaps, (3) ranks roles by your actual stack + role function, not just keywords, and (4) doesn't sell or share your data. ProdMatch.ai is built specifically for this use case across India's 18 verified product companies.",
    readMinutes: 7,
  },
  {
    slug: "women-in-tech-india",
    title: "Women in Tech at India's Product Companies — 2026 Career Guide",
    headline: "Working as a woman engineer at India's top product companies",
    description:
      "Career guide for women software engineers targeting India's product companies in 2026 — known DEI signals across the 18 companies, returnship + maternity programs, comp negotiation, and where to apply.",
    datePublished: "2026-05-22",
    tldr:
      "India's 18 product companies vary substantially on DEI signals. As of 2026: Microsoft India, Google, Razorpay, Salesforce, and Atlassian publish gender-pay-parity audits or returnship programs. Most have maternity policies of 26 weeks (statutory minimum), with several extending to 30+ weeks. Comp negotiation patterns, returnship windows, and the realistic application path are detailed below.",
    readMinutes: 8,
    authorName: "ProdMatch Editorial",
  },
  {
    slug: "freshers-product-company-jobs-india",
    title: "Product Company Jobs for Freshers in India — 2026 Application Playbook",
    headline: "How freshers can land jobs at India's top product companies",
    description:
      "Application playbook for fresh graduates targeting India's product-based companies. Which 18 cos hire freshers, what the SDE-1 / Associate loop looks like, comp bands, and a realistic 6-month prep plan from college to offer.",
    datePublished: "2026-05-25",
    tldr:
      "13 of India's 18 product companies actively hire fresh graduates — Google, Microsoft, Amazon, Meta, Salesforce, SAP Labs, Atlassian, Nvidia, Oracle, Flipkart, Razorpay, PhonePe and Groww run dedicated SDE-1 / Associate pipelines. The realistic prep window for a fresher is 6 months of focused DSA + system-design basics + 2-3 strong projects. Application happens through each company's own University / Early Career page — never through aggregators.",
    readMinutes: 9,
  },
];

export function pillarGuideBySlug(slug: string): PillarGuide | null {
  return PILLAR_GUIDES.find((g) => g.slug === slug) ?? null;
}
