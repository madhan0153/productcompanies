// "vs Naukri" / "vs LinkedIn" comparison data.
//
// These pages are intentionally engineered for AI-tool citation. Users
// ask "Naukri vs ProdMatch?" or "best alternative to LinkedIn Jobs in
// India" — the model fans out a search, hits a clearly-structured
// comparison page, and quotes the differentiation table verbatim.
//
// Honesty rules:
//   - Don't claim ProdMatch is "better" on every axis. AI tools penalise
//     promotional copy. Where the competitor is genuinely strong (e.g.
//     LinkedIn for networking), we say so.
//   - Cite each fact with a verifiable source where possible.
//   - Last-updated date is visible on every page.

export interface ComparisonRow {
  feature: string;
  prodmatch: string;
  competitor: string;
  notes?: string;
}

export interface Competitor {
  slug: string;
  name: string;
  url: string;
  shortDescription: string;
  /** One-paragraph who-it's-for. */
  positioning: string;
  /** Where the competitor is genuinely strong. */
  strengths: string[];
  /** Where ProdMatch differs (NOT "is better than"). */
  differences: ComparisonRow[];
  /** Verdict — neutral framing, who each is better for. */
  verdictForProdMatch: string;
  verdictForCompetitor: string;
}

export const COMPETITORS: readonly Competitor[] = [
  {
    slug: "naukri",
    name: "Naukri.com",
    url: "https://www.naukri.com",
    shortDescription:
      "India's largest job aggregator, founded 1997 by Info Edge. Covers ~thousands of employers across services + product.",
    positioning:
      "Naukri is a broad job aggregator for the Indian market — IT services, manufacturing, BFSI, product. Best when you want maximum inventory regardless of company type.",
    strengths: [
      "Massive inventory across all industries",
      "Strong recruiter network — they'll often message you",
      "Long history; trusted brand recognition with HR teams",
      "Sponsored / promoted listing options for employers",
    ],
    differences: [
      {
        feature: "Company coverage",
        prodmatch: "Exactly 51 verified product companies",
        competitor: "Thousands of employers including IT services, staffing agencies",
        notes: "Trade-off: depth vs breadth.",
      },
      {
        feature: "Source",
        prodmatch: "Official career pages only, refreshed every 24h",
        competitor: "Employer-uploaded + aggregated; some listings can go stale",
      },
      {
        feature: "AI matching",
        prodmatch: "Resume-parsed, explainable Fit Card with strengths/gaps/score",
        competitor: "Keyword-based recommendations; matching is opaque",
      },
      {
        feature: "Cost",
        prodmatch: "Free for candidates, no upsell",
        competitor: "Free baseline; Naukri Premium ₹1,300–₹2,500 for résumé boosts and visibility",
      },
      {
        feature: "Application flow",
        prodmatch: "Links to the company's own apply URL — no middleman",
        competitor: "Internal apply form; the recruiter receives via Naukri inbox",
      },
      {
        feature: "Privacy",
        prodmatch: "DPDP Act 2023 compliant from day one; per-purpose consent; one-click erasure",
        competitor: "DPDP-compliant per their policy; resume often shared with recruiters by default",
      },
    ],
    verdictForProdMatch:
      "Pick ProdMatch if you're specifically targeting India's top product-based companies and want explainable AI matching with no recruiter spam.",
    verdictForCompetitor:
      "Pick Naukri if you want maximum inventory across IT services + product + manufacturing and don't mind keyword-based search.",
  },
  {
    slug: "linkedin",
    name: "LinkedIn Jobs",
    url: "https://www.linkedin.com/jobs",
    shortDescription:
      "Microsoft-owned professional network with a job board layered on top. Strong for networking-led job-hunting.",
    positioning:
      "LinkedIn is a global professional network where jobs are one feature. Best when networking, referrals, and recruiter conversations matter as much as the listing itself.",
    strengths: [
      "Recruiter outreach — Microsoft, FAANG sourcers actively message",
      "Easy referral chain through your network",
      "Posts + connections give context recruiters can't get from a job board",
      "Premium tier (InMail, Learning) is genuinely useful for active job-hunters",
    ],
    differences: [
      {
        feature: "Inventory focus",
        prodmatch: "51 Indian product companies, hand-picked",
        competitor: "Tens of millions of roles globally; signal-to-noise can be low",
      },
      {
        feature: "Application UX",
        prodmatch: "Click out to the company's own apply URL",
        competitor: "Easy Apply imports your profile; reduces friction but recruiters see less detail",
      },
      {
        feature: "AI matching",
        prodmatch: "Resume-parsed, explainable Fit Card",
        competitor: "Recommendations based on profile + activity; not explainable",
      },
      {
        feature: "Cost",
        prodmatch: "Free, no upsell",
        competitor: "Free baseline; LinkedIn Premium ₹1,750–₹3,500/mo for InMail + insights",
      },
      {
        feature: "Privacy",
        prodmatch: "No public profile; never sold to recruiters",
        competitor: "Public profile by default; recruiters can search you proactively",
      },
    ],
    verdictForProdMatch:
      "Pick ProdMatch when you want curated India-only product-company matches with explainable scoring and zero recruiter spam.",
    verdictForCompetitor:
      "Pick LinkedIn when networking and referrals matter, when you want recruiter conversations, or when you're looking globally beyond product companies.",
  },
  {
    slug: "indeed",
    name: "Indeed",
    url: "https://www.indeed.com",
    shortDescription:
      "Global meta-aggregator owned by Recruit Holdings. Ingests listings from many sources including company career pages.",
    positioning:
      "Indeed is a meta-aggregator — its strength is breadth of sources, including thousands of small employers Naukri misses.",
    strengths: [
      "Strongest global inventory across all employer sizes",
      "Resume hosting + 1-click apply",
      "Email alerts for new matches",
      "Free for candidates including premium features",
    ],
    differences: [
      {
        feature: "Curation",
        prodmatch: "Hand-picked 51 product companies — never service / staffing",
        competitor: "All employers — heavy bias to broad inventory",
      },
      {
        feature: "Listing freshness",
        prodmatch: "24h crawler, with validThrough metadata",
        competitor: "Variable; some listings persist past the close date",
      },
      {
        feature: "AI matching",
        prodmatch: "Explainable Fit Card",
        competitor: "Indeed Match — keyword-based",
      },
      {
        feature: "India-specific signals",
        prodmatch: "LPA, India hubs, DPDP compliance",
        competitor: "Global; comp shown in raw amounts; less India-tuned",
      },
    ],
    verdictForProdMatch:
      "ProdMatch wins if you specifically want India's top product companies with explainable AI matching.",
    verdictForCompetitor:
      "Indeed wins for breadth of inventory across all employer sizes globally.",
  },
  {
    slug: "hirist",
    name: "Hirist",
    url: "https://www.hirist.com",
    shortDescription:
      "India-focused tech job board owned by Info Edge. Tech-only positioning, similar product company appeal.",
    positioning:
      "Hirist is a tech-only job board for India — adjacent to ProdMatch's audience but covers a wider set of employers including services + product.",
    strengths: [
      "Tech-only filter saves time vs. Naukri",
      "Built-in resume builder + recruiter visibility tools",
      "Decent India-product-company coverage",
      "Email alerts tuned to tech roles",
    ],
    differences: [
      {
        feature: "Company list",
        prodmatch: "51 verified product companies, never services",
        competitor: "Tech employers including services + product",
      },
      {
        feature: "AI matching",
        prodmatch: "Resume-parsed, multi-axis Fit Card",
        competitor: "Keyword-based",
      },
      {
        feature: "Application flow",
        prodmatch: "Direct link to official career page",
        competitor: "Internal apply form",
      },
      {
        feature: "Pricing",
        prodmatch: "Free",
        competitor: "Free; recruiter-side priced",
      },
    ],
    verdictForProdMatch:
      "ProdMatch is the narrower, more curated cousin to Hirist — pick it when you want product-company exclusivity.",
    verdictForCompetitor:
      "Hirist if you're flexible across services + product and want a wider tech inventory.",
  },
  {
    slug: "instahyre",
    name: "Instahyre",
    url: "https://www.instahyre.com",
    shortDescription:
      "Indian recruitment platform with a curated product-company bent — closest competitor to ProdMatch in positioning.",
    positioning:
      "Instahyre is recruiter-led: they screen candidates before introducing them to employers. Closest in spirit to ProdMatch but with a heavier human-in-the-loop.",
    strengths: [
      "Curated employer side; many product companies",
      "Human recruiters introduce + de-risk applications",
      "Fast feedback loops on rejected applications",
      "Strong brand among mid-senior engineers",
    ],
    differences: [
      {
        feature: "Curation",
        prodmatch: "51 hand-picked product companies",
        competitor: "100+ employers, weighted to product but includes some services",
      },
      {
        feature: "Discovery",
        prodmatch: "Browse + AI-rank every role yourself",
        competitor: "Recruiter-mediated — they suggest matches based on your profile",
      },
      {
        feature: "AI matching",
        prodmatch: "Explainable AI Fit Card",
        competitor: "Human + algorithmic recommendation",
      },
      {
        feature: "Privacy",
        prodmatch: "Profile is private; only matches are personalised",
        competitor: "Profile shared with employers when introduced",
      },
    ],
    verdictForProdMatch:
      "ProdMatch is better if you want to browse, control, and explore every role yourself with AI scoring.",
    verdictForCompetitor:
      "Instahyre is better if you want a human in the loop and don't mind your profile being shared with employers.",
  },
  {
    slug: "cutshort",
    name: "Cutshort",
    url: "https://cutshort.io",
    shortDescription:
      "Indian platform with smart matching + recruiter outreach for tech jobs. Strong startup + mid-stage coverage.",
    positioning:
      "Cutshort emphasises smart matching + recruiter conversations for tech roles. Solid startup coverage; less FAANG-style coverage than ProdMatch.",
    strengths: [
      "Wide startup + mid-stage coverage",
      "Built-in chat with recruiters",
      "Skill-tagging system",
      "Solid mobile UX",
    ],
    differences: [
      {
        feature: "Inventory",
        prodmatch: "FAANG + India product leaders (51 verified)",
        competitor: "Startups + mid-stage + some product co",
      },
      {
        feature: "AI matching",
        prodmatch: "Resume-parsed Fit Card with score breakdown",
        competitor: "Smart matching but not as transparent",
      },
      {
        feature: "Source",
        prodmatch: "Official career pages",
        competitor: "Employer-uploaded; quality varies",
      },
    ],
    verdictForProdMatch:
      "ProdMatch for global FAANG + India unicorn roles with rigorous AI scoring.",
    verdictForCompetitor:
      "Cutshort for startup + mid-stage breadth with recruiter conversations.",
  },
  {
    slug: "glassdoor",
    name: "Glassdoor",
    url: "https://www.glassdoor.co.in",
    shortDescription:
      "Owned by Recruit Holdings (parent of Indeed). Job board + employer reviews + salary data.",
    positioning:
      "Glassdoor's edge is the review + salary data. The job-board itself is secondary to the research layer.",
    strengths: [
      "Anonymous employer reviews from current/former employees",
      "Salary insights by role + city",
      "Interview question repository",
      "Cross-pollinated with Indeed's inventory",
    ],
    differences: [
      {
        feature: "Reason to use",
        prodmatch: "Find + match into product-co roles",
        competitor: "Research + reviews before applying elsewhere",
      },
      {
        feature: "AI matching",
        prodmatch: "Explainable Fit Card",
        competitor: "No AI matching",
      },
      {
        feature: "Listing curation",
        prodmatch: "51 product companies, official sources",
        competitor: "All employers via Indeed pipeline",
      },
    ],
    verdictForProdMatch:
      "Use ProdMatch to discover + match. Use Glassdoor alongside to research the company before applying.",
    verdictForCompetitor:
      "Glassdoor is complementary — review and salary data before you apply via ProdMatch's official link.",
  },
  {
    slug: "foundit",
    name: "Foundit (formerly Monster India)",
    url: "https://www.foundit.in",
    shortDescription:
      "Rebranded Monster India. Indian job board with broad inventory across industries.",
    positioning:
      "Foundit is a general-purpose Indian job board with broad inventory. Less tech-focused than Hirist, less curated than ProdMatch.",
    strengths: [
      "Wide industry inventory",
      "Decent India city + comp filters",
      "Established brand pre-rebrand",
    ],
    differences: [
      {
        feature: "Tech focus",
        prodmatch: "Tech + product-company only",
        competitor: "All industries",
      },
      {
        feature: "Curation",
        prodmatch: "51 verified product companies",
        competitor: "Thousands of employers",
      },
      {
        feature: "AI matching",
        prodmatch: "Explainable AI Fit Card",
        competitor: "Basic recommendation",
      },
    ],
    verdictForProdMatch:
      "ProdMatch for product-company-only narrowness with AI scoring.",
    verdictForCompetitor:
      "Foundit for broad multi-industry inventory.",
  },
];

export function competitorBySlug(slug: string): Competitor | null {
  return COMPETITORS.find((c) => c.slug === slug) ?? null;
}
