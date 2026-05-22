// Curated facts about each of the 18 product companies ProdMatch tracks.
//
// Purpose: every public surface (homepage, /companies, /cities, /skills,
// /salaries) needs to render useful content even when the daily crawler
// hasn't populated the jobs table yet. This module supplies the static
// truth that's always-true: HQ, founded year, what the company does,
// India hubs they operate in, role functions they hire for, typical
// tech stack, and reference salary bands.
//
// Editorial integrity: every salary band carries a "reference" qualifier
// and is sourced from publicly-known patterns (engineering blogs,
// disclosed JDs ProdMatch has seen historically, Glassdoor/levels.fyi
// medians). NOT precise per-month figures — these are calibrated bands
// the page can show in the absence of live JD data.

import type { CanonicalRoleFunction } from "@prodmatch/shared";

export interface ReferenceBand {
  seniority: string;
  /** Reference low — base only, INR LPA. */
  refLowLpa: number;
  /** Reference high — base only, INR LPA. */
  refHighLpa: number;
  /** TC includes variable + stock typical multiplier. */
  refTcLowLpa: number;
  refTcHighLpa: number;
}

export interface CompanyFacts {
  slug: string;
  /** Full legal / display name. */
  name: string;
  /** Short type label — for the hero pill on company pages. */
  kind: "Big Tech" | "Fintech" | "Consumer-Tech" | "Enterprise SaaS" | "E-commerce";
  /** 1-sentence what-they-do — for the listing card subline. */
  oneLiner: string;
  /** 2-3 paragraph overview for the company landing page. */
  overview: string;
  /** Global HQ city — used in schema.org + the Stats strip. */
  hqCity: string;
  /** Country (ISO label, used in schema.org). */
  hqCountry: string;
  /** Year founded. */
  founded: number;
  /** Official career-page URL. */
  careersUrl: string;
  /** Primary India hubs where they actively hire (subset of INDIA_HUBS). */
  indiaHubs: string[];
  /** Role functions they actively hire across (canonical keys). */
  roleFunctions: CanonicalRoleFunction[];
  /** Typical tech stack signal (12-20 entries, casual order). */
  typicalStack: string[];
  /** Reference salary bands per seniority — used when live JDs disclose nothing. */
  referenceBands: ReferenceBand[];
}

const COMMON_ROLES: CanonicalRoleFunction[] = [
  "backend", "frontend", "fullstack", "data_engineering", "ml_ai",
  "devops_platform", "mobile", "qa_sdet", "product_management",
];

const FAANG_BANDS: ReferenceBand[] = [
  { seniority: "SDE-1 / Junior",   refLowLpa: 18, refHighLpa: 26, refTcLowLpa: 25, refTcHighLpa: 45 },
  { seniority: "SDE-2 / Mid",      refLowLpa: 28, refHighLpa: 42, refTcLowLpa: 45, refTcHighLpa: 75 },
  { seniority: "SDE-3 / Senior",   refLowLpa: 42, refHighLpa: 60, refTcLowLpa: 75, refTcHighLpa: 110 },
  { seniority: "Staff / Lead",     refLowLpa: 60, refHighLpa: 85, refTcLowLpa: 110, refTcHighLpa: 170 },
  { seniority: "Principal",        refLowLpa: 85, refHighLpa: 130, refTcLowLpa: 170, refTcHighLpa: 280 },
];

const INDIA_UNICORN_BANDS: ReferenceBand[] = [
  { seniority: "SDE-1 / Junior",   refLowLpa: 12, refHighLpa: 18, refTcLowLpa: 14, refTcHighLpa: 24 },
  { seniority: "SDE-2 / Mid",      refLowLpa: 18, refHighLpa: 32, refTcLowLpa: 22, refTcHighLpa: 40 },
  { seniority: "SDE-3 / Senior",   refLowLpa: 28, refHighLpa: 48, refTcLowLpa: 34, refTcHighLpa: 60 },
  { seniority: "Staff / Lead",     refLowLpa: 45, refHighLpa: 70, refTcLowLpa: 55, refTcHighLpa: 95 },
  { seniority: "Principal",        refLowLpa: 65, refHighLpa: 95, refTcLowLpa: 80, refTcHighLpa: 130 },
];

const FINTECH_BANDS: ReferenceBand[] = [
  { seniority: "SDE-1 / Junior",   refLowLpa: 14, refHighLpa: 22, refTcLowLpa: 16, refTcHighLpa: 28 },
  { seniority: "SDE-2 / Mid",      refLowLpa: 22, refHighLpa: 38, refTcLowLpa: 26, refTcHighLpa: 48 },
  { seniority: "SDE-3 / Senior",   refLowLpa: 35, refHighLpa: 55, refTcLowLpa: 42, refTcHighLpa: 70 },
  { seniority: "Staff / Lead",     refLowLpa: 50, refHighLpa: 80, refTcLowLpa: 65, refTcHighLpa: 110 },
  { seniority: "Principal",        refLowLpa: 75, refHighLpa: 110, refTcLowLpa: 95, refTcHighLpa: 160 },
];

export const COMPANY_FACTS: readonly CompanyFacts[] = [
  {
    slug: "google",
    name: "Google",
    kind: "Big Tech",
    oneLiner: "Search, ads, cloud, Android, YouTube — global tech across product surfaces.",
    overview: "Google's India engineering presence includes Bengaluru, Hyderabad, and Gurugram offices working across Search, Ads, Android, Cloud (GCP), YouTube, Maps and Workspace. India teams contribute to globally-deployed products — the bar matches Mountain View. Hiring loops emphasise structured DSA + system design + Googleyness rounds; comp follows the global L-band template (L3-L6 most common in India).",
    hqCity: "Mountain View, CA",
    hqCountry: "United States",
    founded: 1998,
    careersUrl: "https://www.google.com/about/careers/applications/jobs/results?location=India",
    indiaHubs: ["Bengaluru", "Hyderabad", "Gurugram"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design", "program_management"],
    typicalStack: ["Java", "Go", "Python", "C++", "Kubernetes", "BigQuery", "Spanner", "TensorFlow", "Bigtable", "Borg", "Protobuf", "gRPC"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    kind: "Big Tech",
    oneLiner: "Azure, Office, GitHub, Windows, AI — enterprise + consumer at global scale.",
    overview: "Microsoft India has major engineering centres in Hyderabad (largest outside Redmond) and Bengaluru, plus a Gurugram office. Teams work across Azure, Microsoft 365, GitHub, Bing/AI Search, Windows, and the Office stack. Hiring loops follow the standard Microsoft template — 4-5 rounds combining DSA, system design, and 'as appropriate' behavioural rounds. The 'Customer obsession + One Microsoft' value rubric is real and shows up in behavioural scoring.",
    hqCity: "Redmond, WA",
    hqCountry: "United States",
    founded: 1975,
    careersUrl: "https://careers.microsoft.com/v2/global/en/search?lc=India",
    indiaHubs: ["Hyderabad", "Bengaluru", "Gurugram", "Noida"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design", "program_management"],
    typicalStack: ["C#", ".NET", "TypeScript", "Azure", "Kubernetes", "PowerShell", "Cosmos DB", "Bicep", "React", "Python"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "meta",
    name: "Meta",
    kind: "Big Tech",
    oneLiner: "Facebook, Instagram, WhatsApp, Reality Labs — global consumer + AR/VR.",
    overview: "Meta's India engineering footprint is centred on Bengaluru (and a smaller Hyderabad presence), working primarily on Reality Labs, infrastructure, ads, and parts of WhatsApp + Instagram. Engineering loops follow Meta's standard E3-E7 template — 4-5 rounds with sharp DSA + product-design + behavioural rounds. The 'move fast + impact' rubric is real in behavioural scoring; explicit metrics + scope matter.",
    hqCity: "Menlo Park, CA",
    hqCountry: "United States",
    founded: 2004,
    careersUrl: "https://www.metacareers.com/jobs/?offices[0]=India",
    indiaHubs: ["Bengaluru", "Hyderabad"],
    roleFunctions: ["backend", "frontend", "fullstack", "ml_ai", "data_engineering", "devops_platform", "mobile", "product_management", "design"],
    typicalStack: ["PHP/Hack", "Python", "C++", "React", "GraphQL", "Cassandra", "PyTorch", "Presto", "Bento ML", "Buck2"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "amazon",
    name: "Amazon",
    kind: "Big Tech",
    oneLiner: "AWS, retail, Prime Video, Alexa, devices — broadest scope across all 18.",
    overview: "Amazon India has the largest single engineering footprint of any product company in India — Bengaluru (HQ for India tech), Hyderabad, Chennai, Pune, Delhi NCR. Teams work across AWS, Retail, Prime Video, Alexa, and dozens of internal platforms. Hiring loops are explicitly Amazon — 4-6 rounds with strong Leadership Principles emphasis throughout (every interviewer scores LPs, not just behavioural). Bar Raiser owns the final call.",
    hqCity: "Seattle, WA",
    hqCountry: "United States",
    founded: 1994,
    careersUrl: "https://www.amazon.jobs/en/search?base_query=&loc_query=India",
    indiaHubs: ["Bengaluru", "Hyderabad", "Chennai", "Pune", "Delhi NCR"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "program_management"],
    typicalStack: ["Java", "Python", "AWS", "DynamoDB", "Lambda", "S3", "EKS", "TypeScript", "React", "C++", "Rust"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "apple",
    name: "Apple",
    kind: "Big Tech",
    oneLiner: "iPhone, iOS, services, silicon, retail — tightly-integrated consumer hardware + software.",
    overview: "Apple India engineering is centred on Hyderabad (Apple Service Centre + maps + iCloud teams) and Bengaluru (smaller). India hiring is relatively limited compared to Microsoft / Google / Amazon — but the bar is exceptionally high. Loops emphasise deep technical mastery in narrower domains (iOS, audio, silicon, services). Behavioural rounds favour craft-obsession + secrecy + cross-functional collaboration.",
    hqCity: "Cupertino, CA",
    hqCountry: "United States",
    founded: 1976,
    careersUrl: "https://jobs.apple.com/en-in/search?location=india-INDC",
    indiaHubs: ["Hyderabad", "Bengaluru"],
    roleFunctions: ["backend", "ml_ai", "mobile", "devops_platform", "qa_sdet"],
    typicalStack: ["Swift", "Objective-C", "C++", "Python", "Metal", "Core ML", "Foundation", "AppKit", "Combine", "SwiftUI"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "atlassian",
    name: "Atlassian",
    kind: "Enterprise SaaS",
    oneLiner: "Jira, Confluence, Bitbucket — collaboration + dev-tools at scale.",
    overview: "Atlassian's India engineering centre is Bengaluru (newly expanded since 2022). Teams work across Jira, Confluence, Bitbucket, Compass, and the underlying platform. Atlassian is known for a strong remote-friendly culture and a values-based hiring process — behavioural rounds explicitly probe the Atlassian values (Open Company / No Bullshit, Don't #@!% the Customer, etc.). Engineering loops are 4-5 rounds with DSA + system design + values.",
    hqCity: "Sydney",
    hqCountry: "Australia",
    founded: 2002,
    careersUrl: "https://www.atlassian.com/company/careers/all-jobs?team=Engineering&location=India",
    indiaHubs: ["Bengaluru"],
    roleFunctions: ["backend", "frontend", "fullstack", "data_engineering", "ml_ai", "devops_platform", "product_management", "design"],
    typicalStack: ["Java", "Kotlin", "TypeScript", "React", "Kafka", "PostgreSQL", "AWS", "Kubernetes", "GraphQL"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "nvidia",
    name: "Nvidia",
    kind: "Big Tech",
    oneLiner: "GPUs, AI infrastructure, CUDA, robotics, automotive — the AI-era foundation.",
    overview: "Nvidia India has engineering centres in Bengaluru, Pune, Hyderabad, and Gurugram — historically anchored in GPU driver / SoC / automotive teams, expanding rapidly into AI software (NIM, NeMo, Triton) since 2023. Hiring loops emphasise deep technical depth in chosen domain (CUDA, computer graphics, ML systems) plus strong systems fundamentals. Compensation has risen sharply since 2023 alongside the AI demand wave.",
    hqCity: "Santa Clara, CA",
    hqCountry: "United States",
    founded: 1993,
    careersUrl: "https://www.nvidia.com/en-in/about-nvidia/careers/",
    indiaHubs: ["Bengaluru", "Pune", "Hyderabad", "Gurugram"],
    roleFunctions: ["backend", "ml_ai", "devops_platform", "data_engineering", "qa_sdet"],
    typicalStack: ["C++", "CUDA", "Python", "PyTorch", "TensorRT", "OpenGL", "Vulkan", "Linux kernel", "Triton", "NeMo"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "oracle",
    name: "Oracle",
    kind: "Enterprise SaaS",
    oneLiner: "Oracle DB, Cloud Infrastructure (OCI), NetSuite, Fusion ERP — enterprise software.",
    overview: "Oracle's India engineering presence is large across Bengaluru, Hyderabad, and Noida — working on Oracle Database, OCI (Oracle Cloud Infrastructure, the AWS-competitor), Fusion ERP, NetSuite, and the AI/Analytics stack. Hiring loops are standard 4-5 round product-co template; engineering culture emphasises stability + scale + enterprise rigour over startup velocity.",
    hqCity: "Austin, TX",
    hqCountry: "United States",
    founded: 1977,
    careersUrl: "https://careers.oracle.com/jobs/#en/sites/jobsearch/requisitions?location=India",
    indiaHubs: ["Bengaluru", "Hyderabad", "Noida"],
    roleFunctions: [...COMMON_ROLES, "engineering_management"],
    typicalStack: ["Java", "Oracle DB", "PL/SQL", "OCI", "Kubernetes", "Python", "C++", "TypeScript", "Terraform"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "salesforce",
    name: "Salesforce",
    kind: "Enterprise SaaS",
    oneLiner: "Sales Cloud, Service Cloud, Marketing Cloud, Data Cloud, Tableau — CRM platform.",
    overview: "Salesforce India is anchored in Bengaluru and Hyderabad, working across the core Sales / Service / Marketing Clouds, Data Cloud, Einstein AI, Tableau and MuleSoft. Hiring loops follow the standard product-co template with extra emphasis on Salesforce 'V2MOM' + Trailblazer values. India teams contribute to global product surfaces, not India-only features.",
    hqCity: "San Francisco, CA",
    hqCountry: "United States",
    founded: 1999,
    careersUrl: "https://careers.salesforce.com/en/jobs/?location=India",
    indiaHubs: ["Bengaluru", "Hyderabad"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "product_management"],
    typicalStack: ["Java", "Apex", "Lightning Web Components", "TypeScript", "React", "Kubernetes", "AWS", "Python", "PostgreSQL"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "sap-labs",
    name: "SAP Labs",
    kind: "Enterprise SaaS",
    oneLiner: "S/4HANA, SuccessFactors, Concur, Ariba — enterprise resource planning at scale.",
    overview: "SAP Labs India is one of the largest SAP R&D centres outside Germany — Bengaluru is the primary location, with smaller presence in Gurugram and Mumbai. Engineering work spans S/4HANA, SuccessFactors, BTP (Business Technology Platform), and AI / ML embedded across the suite. The culture is enterprise + structured but globally connected — India teams ship for global SAP customers.",
    hqCity: "Walldorf",
    hqCountry: "Germany",
    founded: 1972,
    careersUrl: "https://jobs.sap.com/search/?locationsearch=India",
    indiaHubs: ["Bengaluru", "Gurugram", "Mumbai"],
    roleFunctions: [...COMMON_ROLES, "engineering_management"],
    typicalStack: ["Java", "ABAP", "JavaScript", "SAP HANA", "SAP UI5", "Kubernetes", "Python", "Node.js"],
    referenceBands: FAANG_BANDS,
  },
  {
    slug: "razorpay",
    name: "Razorpay",
    kind: "Fintech",
    oneLiner: "Payments, banking, payroll for businesses — India's leading product fintech.",
    overview: "Razorpay is India's leading product-led fintech, headquartered in Bengaluru with a large engineering team and growing presence in Singapore. Products span payment gateway (the original), payment links, RazorpayX (business banking), Razorpay Payroll, and lending. Engineering loops emphasise practical machine-coding rounds (build a small system in 90 minutes) over pure DSA puzzles, with strong payment-domain knowledge expected at senior levels.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2014,
    careersUrl: "https://razorpay.com/jobs/",
    indiaHubs: ["Bengaluru"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design"],
    typicalStack: ["Go", "Python", "Java", "Kafka", "PostgreSQL", "Redis", "AWS", "Kubernetes", "MySQL", "Elasticsearch"],
    referenceBands: FINTECH_BANDS,
  },
  {
    slug: "phonepe",
    name: "PhonePe",
    kind: "Fintech",
    oneLiner: "UPI payments, financial services, PhonePe Switch, lending — India's largest UPI app.",
    overview: "PhonePe is India's largest UPI payment app by volume, headquartered in Bengaluru with engineering across Bengaluru and a growing Pune presence. Products span UPI payments (the core), wealth management, insurance, lending, and PhonePe Switch (a mini-app platform). Engineering loops emphasise distributed-systems at high RPS, idempotency, and on-call sensibility. Comp bands track Razorpay closely.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2015,
    careersUrl: "https://www.phonepe.com/careers/",
    indiaHubs: ["Bengaluru", "Pune"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design"],
    typicalStack: ["Java", "Go", "Kafka", "Aerospike", "Cassandra", "AWS", "Kubernetes", "Python", "TypeScript"],
    referenceBands: FINTECH_BANDS,
  },
  {
    slug: "zerodha",
    name: "Zerodha",
    kind: "Fintech",
    oneLiner: "India's largest stockbroker — Kite, Console, Coin, Varsity.",
    overview: "Zerodha is India's largest retail stockbroker, famously profitable and known for an unconventional engineering culture — small teams, open-source first, no VC funding. Engineering is centred on Bengaluru with a smaller Hyderabad presence. Teams work across Kite (trading platform), Console (portfolio), Coin (mutual funds), and Varsity. Hiring loops are lean — typically 2-3 rounds focusing on practical engineering + GitHub portfolio over puzzle DSA.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2010,
    careersUrl: "https://zerodha.com/careers/",
    indiaHubs: ["Bengaluru", "Hyderabad"],
    roleFunctions: ["backend", "frontend", "fullstack", "mobile", "devops_platform", "data_engineering"],
    typicalStack: ["Go", "Python", "PostgreSQL", "Redis", "Vue.js", "React", "Linux", "Kafka", "Postgres"],
    referenceBands: FINTECH_BANDS,
  },
  {
    slug: "cred",
    name: "CRED",
    kind: "Fintech",
    oneLiner: "Premium credit-card management, payments, rewards, lending — India's design-first fintech.",
    overview: "CRED is a Bengaluru-headquartered fintech focused on the premium consumer segment — credit-card payments + rewards + lending + ecommerce. Engineering teams emphasise design quality, polish, and performance at scale. Hiring loops are 3-4 rounds with a strong design-sensibility component (even backend rounds occasionally probe product instincts). Comp is competitive within the India-unicorn band.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2018,
    careersUrl: "https://careers.cred.club/",
    indiaHubs: ["Bengaluru"],
    roleFunctions: ["backend", "frontend", "fullstack", "ml_ai", "mobile", "devops_platform", "design", "product_management"],
    typicalStack: ["Kotlin", "Java", "TypeScript", "React Native", "AWS", "Kubernetes", "PostgreSQL", "Redis", "Kafka"],
    referenceBands: INDIA_UNICORN_BANDS,
  },
  {
    slug: "groww",
    name: "Groww",
    kind: "Fintech",
    oneLiner: "Investing app for stocks, mutual funds, F&O, IPOs — direct-to-consumer wealth.",
    overview: "Groww is a Bengaluru-headquartered investing platform serving 20M+ retail investors across stocks, mutual funds, F&O, and IPOs. Engineering teams emphasise high-throughput consumer apps + regulatory + scale. Hiring loops are 3-4 rounds focused on DSA + system design + product instincts. Groww is known for relatively flat engineering bands compared to other India unicorns.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2017,
    careersUrl: "https://groww.in/careers",
    indiaHubs: ["Bengaluru"],
    roleFunctions: ["backend", "frontend", "fullstack", "ml_ai", "mobile", "devops_platform", "data_engineering", "product_management"],
    typicalStack: ["Java", "TypeScript", "React", "React Native", "Kotlin", "AWS", "PostgreSQL", "Redis", "Kafka"],
    referenceBands: INDIA_UNICORN_BANDS,
  },
  {
    slug: "swiggy",
    name: "Swiggy",
    kind: "Consumer-Tech",
    oneLiner: "Food delivery, Instamart (10-min grocery), Dineout, Genie — India's super-app for hyperlocal.",
    overview: "Swiggy is a Bengaluru-headquartered consumer-tech company operating food delivery, Instamart (10-min grocery), Dineout, and Genie. Engineering teams emphasise high-throughput consumer systems (200K+ RPS food orders), real-time ETA / surge / dispatch, and hyperlocal logistics. Hiring loops are 4-5 rounds with strong system-design emphasis on food-delivery-domain scenarios.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2014,
    careersUrl: "https://careers.swiggy.com/",
    indiaHubs: ["Bengaluru", "Gurugram", "Pune"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design"],
    typicalStack: ["Java", "Go", "Python", "React", "React Native", "Kafka", "Cassandra", "AWS", "PostgreSQL", "Redis"],
    referenceBands: INDIA_UNICORN_BANDS,
  },
  {
    slug: "zomato",
    name: "Zomato",
    kind: "Consumer-Tech",
    oneLiner: "Food delivery, Hyperpure (B2B supply), Blinkit (10-min grocery), dining — India's hyperlocal giant.",
    overview: "Zomato is a Gurugram-headquartered consumer-tech company operating food delivery, dining-out, Hyperpure (B2B restaurant supply), and Blinkit (10-min quick commerce). Engineering teams emphasise high-RPS consumer apps, real-time dispatch + ETA, search + discovery, and AI for menu / fraud / pricing. Hiring loops are 4-5 rounds with system design + behavioural emphasis.",
    hqCity: "Gurugram",
    hqCountry: "India",
    founded: 2008,
    careersUrl: "https://www.zomato.com/careers",
    indiaHubs: ["Gurugram", "Bengaluru", "Delhi NCR"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design"],
    typicalStack: ["Go", "Java", "Python", "React", "React Native", "Kafka", "MySQL", "MongoDB", "AWS", "Redis"],
    referenceBands: INDIA_UNICORN_BANDS,
  },
  {
    slug: "flipkart",
    name: "Flipkart",
    kind: "E-commerce",
    oneLiner: "E-commerce marketplace, Myntra (fashion), Cleartrip (travel) — India's largest online retailer.",
    overview: "Flipkart is a Bengaluru-headquartered e-commerce group (owned by Walmart) operating the core marketplace, Myntra (fashion), Cleartrip (travel), and Flipkart Health+. Engineering teams emphasise marketplace scale, search + discovery, pricing + promotions, supply-chain ML, and high-throughput consumer apps. Hiring loops are 4-5 rounds with strong DSA + system design.",
    hqCity: "Bengaluru",
    hqCountry: "India",
    founded: 2007,
    careersUrl: "https://www.flipkartcareers.com/",
    indiaHubs: ["Bengaluru"],
    roleFunctions: [...COMMON_ROLES, "engineering_management", "design"],
    typicalStack: ["Java", "Go", "Python", "React", "React Native", "Kafka", "MySQL", "Elasticsearch", "AWS", "Hadoop"],
    referenceBands: INDIA_UNICORN_BANDS,
  },
];

export function companyFactsBySlug(slug: string): CompanyFacts | null {
  return COMPANY_FACTS.find((c) => c.slug === slug) ?? null;
}

/** Companies that publicly operate engineering in the given hub. */
export function companiesInHub(hub: string): CompanyFacts[] {
  return COMPANY_FACTS.filter((c) => c.indiaHubs.includes(hub));
}

/** Companies that hire for the given canonical role function. */
export function companiesForRole(role: CanonicalRoleFunction): CompanyFacts[] {
  return COMPANY_FACTS.filter((c) => c.roleFunctions.includes(role));
}

/** Companies whose typical stack mentions a token matching the skill name or its aliases. */
export function companiesForSkill(skillAliases: string[]): CompanyFacts[] {
  const lower = skillAliases.map((a) => a.toLowerCase());
  return COMPANY_FACTS.filter((c) =>
    c.typicalStack.some((s) => lower.some((a) => s.toLowerCase().includes(a) || a.includes(s.toLowerCase()))),
  );
}
