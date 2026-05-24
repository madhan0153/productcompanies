// ProdMatch-owned premium DSA catalog.
//
// No LeetCode dependency, no copied statements, no fabricated "asked at X"
// claims. Problems are deterministic product-company interview simulations:
// each stable slug maps to a role track, algorithmic pattern, company/product
// context, statement, constraints, and solution guide. The generator gives each
// role 108 unique problems (12 blueprints x 9 product contexts), enough to
// avoid repeats for the 60-day no-repeat window.

export type DsaPattern =
  | "arrays_hashing"
  | "two_pointers"
  | "sliding_window"
  | "stack_queue"
  | "binary_search"
  | "linked_list"
  | "trees"
  | "tries"
  | "heap_priority_queue"
  | "backtracking"
  | "graphs"
  | "dp_1d"
  | "dp_2d"
  | "greedy"
  | "intervals"
  | "math_geometry"
  | "bit_manipulation";

export type DsaDifficulty = "easy" | "medium" | "hard";

export type DsaRole =
  | "software_engineer"
  | "backend_engineer"
  | "frontend_engineer"
  | "full_stack_engineer"
  | "ai_ml_engineer"
  | "data_engineer"
  | "devops_sre"
  | "mobile_engineer"
  | "security_engineer"
  | "platform_engineer";

export interface DsaRoleTrack {
  role: DsaRole;
  label: string;
  description: string;
  concepts: string[];
  problemCount: number;
}

export interface DsaProblemContext {
  company: string;
  companySlug: string;
  productTeam: string;
  month: string;
  productSurface: string;
  disclaimer: string;
}

export interface DsaProblem {
  /** Stable identifier persisted in interview_daily_dispatch.problem_slug. */
  slug: string;
  title: string;
  pattern: DsaPattern;
  difficulty: DsaDifficulty;
  /** Kept nullable for backward compatibility with older callers. */
  leetcode_id: null;
  /** ProdMatch problems are self-contained; no external judge dependency. */
  url: null;
  companies: string[];
  roles: DsaRole[];
  primaryRole: DsaRole;
  context: DsaProblemContext;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  examples: string[];
  concepts: string[];
  premiumSignal: string;
}

const APPROVED_COMPANIES: readonly { slug: string; name: string }[] = [
  { slug: "google", name: "Google" },
  { slug: "microsoft", name: "Microsoft" },
  { slug: "meta", name: "Meta" },
  { slug: "amazon", name: "Amazon" },
  { slug: "apple", name: "Apple" },
  { slug: "atlassian", name: "Atlassian" },
  { slug: "nvidia", name: "NVIDIA" },
  { slug: "oracle", name: "Oracle" },
  { slug: "salesforce", name: "Salesforce" },
  { slug: "sap-labs", name: "SAP Labs" },
  { slug: "razorpay", name: "Razorpay" },
  { slug: "phonepe", name: "PhonePe" },
  { slug: "zerodha", name: "Zerodha" },
  { slug: "cred", name: "CRED" },
  { slug: "groww", name: "Groww" },
  { slug: "swiggy", name: "Swiggy" },
  { slug: "zomato", name: "Zomato" },
  { slug: "flipkart", name: "Flipkart" },
  { slug: "adobe", name: "Adobe" },
  { slug: "intuit", name: "Intuit" },
  { slug: "uber", name: "Uber" },
  { slug: "paypal", name: "PayPal" },
  { slug: "servicenow", name: "ServiceNow" },
  { slug: "stripe", name: "Stripe" },
  { slug: "freshworks", name: "Freshworks" },
  { slug: "zoho", name: "Zoho" },
  { slug: "postman", name: "Postman" },
  { slug: "browserstack", name: "BrowserStack" },
  { slug: "chargebee", name: "Chargebee" },
  { slug: "meesho", name: "Meesho" },
  { slug: "nykaa", name: "Nykaa" },
  { slug: "dream11", name: "Dream11" },
  { slug: "policybazaar", name: "PolicyBazaar" },
  { slug: "lenskart", name: "Lenskart" },
  { slug: "udaan", name: "Udaan" },
  { slug: "delhivery", name: "Delhivery" },
  { slug: "sharechat", name: "ShareChat" },
  { slug: "ola", name: "Ola" },
  { slug: "paytm", name: "Paytm" },
  { slug: "inmobi", name: "InMobi" },
  { slug: "unacademy", name: "Unacademy" },
  { slug: "cars24", name: "Cars24" },
  { slug: "myntra", name: "Myntra" },
  { slug: "practo", name: "Practo" },
  { slug: "pine-labs", name: "Pine Labs" },
  { slug: "nobroker", name: "NoBroker" },
  { slug: "wingify", name: "Wingify" },
  { slug: "clevertap", name: "CleverTap" },
  { slug: "moengage", name: "MoEngage" },
  { slug: "yellow-ai", name: "Yellow.ai" },
  { slug: "arcesium", name: "Arcesium" },
] as const;

const FRESH_CONTEXT_MONTHS = ["May 2026", "April 2026", "March 2026"] as const;
const ROLE_PROBLEM_COUNT = 108;

export const DSA_ROLE_TRACKS: readonly DsaRoleTrack[] = [
  {
    role: "software_engineer",
    label: "Software Engineer",
    description: "Core product engineering rounds: invariants, graphs, DP, concurrency-like ordering and scalable data structures.",
    concepts: ["invariants", "API correctness", "graph modelling", "dynamic programming", "streaming data"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "backend_engineer",
    label: "Backend Engineer",
    description: "High-throughput services, queues, ranking, idempotency, rate limits, cache eviction and distributed scheduling.",
    concepts: ["idempotency", "queues", "rate limiting", "caching", "service dependency graphs"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "frontend_engineer",
    label: "Frontend Engineer",
    description: "UI state, event streams, dependency graphs, layout constraints, browser performance and offline-first interactions.",
    concepts: ["render scheduling", "state graphs", "virtualization", "debounced streams", "layout intervals"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "full_stack_engineer",
    label: "Full Stack Developer",
    description: "End-to-end flows across UI, APIs, auth, jobs, databases and observability.",
    concepts: ["workflow graphs", "API pagination", "cache invalidation", "optimistic state", "job orchestration"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "ai_ml_engineer",
    label: "AI/ML Engineer",
    description: "RAG, vector search, feature stores, recommendation graphs, beam search, batching and model-serving queues.",
    concepts: ["vector search", "RAG retrieval", "recommendation graphs", "beam search", "feature pipelines", "model batching"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "data_engineer",
    label: "Data Engineer",
    description: "Streaming joins, watermarking, lineage graphs, dedupe, partition pruning and batch/real-time correctness.",
    concepts: ["stream windows", "watermarks", "lineage DAGs", "deduplication", "partition pruning"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "devops_sre",
    label: "DevOps / SRE Engineer",
    description: "Incident routing, dependency blast radius, rolling deploy windows, alert compression and capacity planning.",
    concepts: ["blast-radius graphs", "alert dedupe", "rolling windows", "capacity heaps", "deployment ordering"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "mobile_engineer",
    label: "Mobile Engineer",
    description: "Offline sync, feed ranking, local caches, gesture streams, battery-aware batching and network retry logic.",
    concepts: ["offline sync", "local cache", "gesture streams", "retry queues", "feed pagination"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "security_engineer",
    label: "Security Engineer",
    description: "Attack graphs, auth policy evaluation, anomaly windows, secret rotation and permission minimization.",
    concepts: ["attack graphs", "policy tries", "anomaly detection", "secret rotation", "least privilege"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
  {
    role: "platform_engineer",
    label: "Platform Engineer",
    description: "Multi-tenant infrastructure, build graphs, shared libraries, quota enforcement and developer productivity systems.",
    concepts: ["build DAGs", "tenant quotas", "artifact caching", "dependency indexing", "scheduler fairness"],
    problemCount: ROLE_PROBLEM_COUNT,
  },
] as const;

type Theme = {
  short: string;
  product: string;
  team: string;
  noun: string;
};

const ROLE_THEMES: Record<DsaRole, readonly Theme[]> = {
  software_engineer: [
    { short: "Workflow", product: "collaboration workflow", team: "Workspace Platform", noun: "tasks" },
    { short: "Search", product: "product search", team: "Search Quality", noun: "documents" },
    { short: "Checkout", product: "checkout reliability", team: "Payments Core", noun: "events" },
    { short: "Feed", product: "personalized feed", team: "Consumer Feed", noun: "items" },
    { short: "Maps", product: "location graph", team: "Maps Infra", noun: "nodes" },
    { short: "Editor", product: "collaborative editor", team: "Creation Tools", noun: "operations" },
    { short: "Tickets", product: "support ticket routing", team: "Service Desk", noun: "tickets" },
    { short: "Catalog", product: "commerce catalog", team: "Marketplace", noun: "products" },
    { short: "Notifications", product: "notification delivery", team: "Messaging Platform", noun: "messages" },
  ],
  backend_engineer: [
    { short: "Idempotency", product: "payment idempotency", team: "Payments Core", noun: "requests" },
    { short: "Ledger", product: "wallet ledger", team: "Fintech Ledger", noun: "transactions" },
    { short: "Courier", product: "courier assignment", team: "Dispatch Engine", noun: "orders" },
    { short: "Inventory", product: "flash-sale inventory", team: "Marketplace Infra", noun: "stock updates" },
    { short: "RateLimit", product: "tenant rate limits", team: "API Gateway", noun: "calls" },
    { short: "Queue", product: "job queue", team: "Async Platform", noun: "jobs" },
    { short: "Cache", product: "multi-region cache", team: "Edge Platform", noun: "keys" },
    { short: "Settlement", product: "settlement batches", team: "Payouts", noun: "batches" },
    { short: "Routing", product: "service routing", team: "Core Infra", noun: "services" },
  ],
  frontend_engineer: [
    { short: "Timeline", product: "social timeline", team: "Consumer Web", noun: "cards" },
    { short: "Autocomplete", product: "search autocomplete", team: "Search UX", noun: "queries" },
    { short: "Canvas", product: "design canvas", team: "Creation UX", noun: "layers" },
    { short: "Table", product: "virtualized analytics table", team: "Dashboard UX", noun: "rows" },
    { short: "Forms", product: "dynamic form builder", team: "Growth UX", noun: "fields" },
    { short: "Player", product: "video player events", team: "Media Web", noun: "events" },
    { short: "Offline", product: "offline draft sync", team: "Web Platform", noun: "drafts" },
    { short: "Experiment", product: "A/B experiment console", team: "Experimentation", noun: "variants" },
    { short: "Notifications", product: "in-app notification tray", team: "Engagement UX", noun: "notifications" },
  ],
  full_stack_engineer: [
    { short: "Onboarding", product: "merchant onboarding", team: "Growth Platform", noun: "steps" },
    { short: "Billing", product: "subscription billing", team: "Revenue Platform", noun: "invoices" },
    { short: "CRM", product: "sales CRM", team: "Customer Platform", noun: "activities" },
    { short: "Admin", product: "admin permissions", team: "Internal Tools", noun: "policies" },
    { short: "Scheduler", product: "campaign scheduler", team: "Marketing Automation", noun: "campaigns" },
    { short: "Import", product: "bulk data import", team: "Data Experience", noun: "records" },
    { short: "Approvals", product: "approval workflow", team: "Workflow Platform", noun: "approvals" },
    { short: "Realtime", product: "realtime collaboration", team: "Realtime Platform", noun: "patches" },
    { short: "Audit", product: "audit trail explorer", team: "Trust Platform", noun: "logs" },
  ],
  ai_ml_engineer: [
    { short: "Vector", product: "vector search retrieval", team: "RAG Platform", noun: "embeddings" },
    { short: "GraphRAG", product: "knowledge graph RAG", team: "AI Search", noun: "entities" },
    { short: "Recommend", product: "recommendation system", team: "Personalization ML", noun: "candidates" },
    { short: "Batching", product: "model-serving batcher", team: "Inference Platform", noun: "requests" },
    { short: "Features", product: "feature store freshness", team: "ML Platform", noun: "features" },
    { short: "Beam", product: "beam-search decoder", team: "GenAI Runtime", noun: "tokens" },
    { short: "Eval", product: "LLM evaluation harness", team: "AI Quality", noun: "runs" },
    { short: "Ranking", product: "learning-to-rank pipeline", team: "Search ML", noun: "documents" },
    { short: "Embeddings", product: "embedding drift monitor", team: "Model Observability", noun: "vectors" },
  ],
  data_engineer: [
    { short: "Watermark", product: "stream watermarking", team: "Realtime Data", noun: "events" },
    { short: "Lineage", product: "data lineage graph", team: "Data Platform", noun: "datasets" },
    { short: "Dedupe", product: "transaction dedupe", team: "Trust Data", noun: "records" },
    { short: "Join", product: "stream-table join", team: "Warehouse Platform", noun: "rows" },
    { short: "Partition", product: "partition pruning", team: "Lakehouse", noun: "partitions" },
    { short: "Backfill", product: "incremental backfill", team: "Data Reliability", noun: "jobs" },
    { short: "Metrics", product: "metric dependency graph", team: "Analytics Platform", noun: "metrics" },
    { short: "Quality", product: "data quality monitor", team: "Data Trust", noun: "checks" },
    { short: "Schema", product: "schema evolution", team: "Data Contracts", noun: "versions" },
  ],
  devops_sre: [
    { short: "Incident", product: "incident correlation", team: "Reliability", noun: "alerts" },
    { short: "Deploy", product: "rolling deploy planner", team: "Release Platform", noun: "pods" },
    { short: "Capacity", product: "capacity allocator", team: "Cloud Infra", noun: "workloads" },
    { short: "Blast", product: "blast-radius explorer", team: "Service Reliability", noun: "services" },
    { short: "OnCall", product: "on-call routing", team: "Incident Response", noun: "pages" },
    { short: "Logs", product: "log compaction", team: "Observability", noun: "spans" },
    { short: "SLO", product: "SLO burn-rate monitor", team: "Reliability Platform", noun: "windows" },
    { short: "Secrets", product: "secret rotation graph", team: "Cloud Security", noun: "secrets" },
    { short: "Quota", product: "tenant quota scheduler", team: "Platform Ops", noun: "tenants" },
  ],
  mobile_engineer: [
    { short: "Sync", product: "offline sync", team: "Mobile Platform", noun: "mutations" },
    { short: "Feed", product: "mobile feed ranking", team: "Consumer Mobile", noun: "cards" },
    { short: "Cache", product: "local cache eviction", team: "App Performance", noun: "entries" },
    { short: "Gesture", product: "gesture recognizer", team: "Mobile UX", noun: "touches" },
    { short: "Retry", product: "network retry queue", team: "Connectivity", noun: "requests" },
    { short: "Media", product: "media upload manager", team: "Creator Mobile", noun: "chunks" },
    { short: "Battery", product: "battery-aware batcher", team: "Performance", noun: "jobs" },
    { short: "Search", product: "on-device search", team: "Mobile Search", noun: "tokens" },
    { short: "DeepLink", product: "deep-link resolver", team: "Growth Mobile", noun: "routes" },
  ],
  security_engineer: [
    { short: "Attack", product: "attack path analysis", team: "Cloud Security", noun: "assets" },
    { short: "Policy", product: "authorization policy engine", team: "Identity", noun: "rules" },
    { short: "Anomaly", product: "login anomaly detector", team: "Account Trust", noun: "sessions" },
    { short: "Secrets", product: "secret exposure scanner", team: "AppSec", noun: "findings" },
    { short: "Risk", product: "risk scoring", team: "Fraud Platform", noun: "signals" },
    { short: "ACL", product: "permission minimizer", team: "Zero Trust", noun: "grants" },
    { short: "Threat", product: "threat intel graph", team: "Security Platform", noun: "indicators" },
    { short: "Patch", product: "patch priority queue", team: "Vulnerability Management", noun: "CVEs" },
    { short: "Audit", product: "audit event compressor", team: "Compliance", noun: "events" },
  ],
  platform_engineer: [
    { short: "Build", product: "build graph scheduler", team: "Developer Platform", noun: "targets" },
    { short: "Artifacts", product: "artifact cache", team: "Build Infra", noun: "objects" },
    { short: "Tenancy", product: "multi-tenant quota", team: "Cloud Platform", noun: "tenants" },
    { short: "Packages", product: "package dependency index", team: "DevEx", noun: "packages" },
    { short: "CI", product: "CI flake detector", team: "Engineering Productivity", noun: "jobs" },
    { short: "SDK", product: "SDK compatibility matrix", team: "Platform SDK", noun: "versions" },
    { short: "Flags", product: "feature-flag rollout", team: "Release Platform", noun: "rules" },
    { short: "Sandboxes", product: "sandbox allocator", team: "Runtime Platform", noun: "sessions" },
    { short: "Registry", product: "service registry", team: "Internal Platform", noun: "services" },
  ],
};

type Blueprint = {
  key: string;
  title: string;
  pattern: DsaPattern;
  baseDifficulty: DsaDifficulty;
  concepts: string[];
  statement: (x: { role: DsaRoleTrack; theme: Theme }) => string;
  input: string;
  output: string;
  constraints: string[];
  examples: (theme: Theme) => string[];
};

const BLUEPRINTS: readonly Blueprint[] = [
  {
    key: "dependency-dag",
    title: "Dependency DAG Recovery",
    pattern: "graphs",
    baseDifficulty: "hard",
    concepts: ["topological sort", "cycle detection", "dependency graph"],
    statement: ({ role, theme }) => `You own ${theme.product} for a ${role.label} loop. Given ${theme.noun} and directed dependencies between them, return a valid execution order. If a cycle exists, return an empty list and identify that the rollout is blocked.`,
    input: "n nodes labelled 0..n-1 and dependency pairs [before, after].",
    output: "A valid order of all nodes, or [] when dependencies contain a cycle.",
    constraints: ["1 <= n <= 200000", "0 <= dependencies.length <= 400000", "The graph may be disconnected."],
    examples: (theme) => [`${theme.noun}: 4, deps: [[0,1],[0,2],[2,3]] -> [0,1,2,3] or [0,2,1,3]`],
  },
  {
    key: "window-anomaly",
    title: "Streaming Window Anomaly",
    pattern: "sliding_window",
    baseDifficulty: "hard",
    concepts: ["sliding window", "frequency map", "stream processing"],
    statement: ({ role, theme }) => `For ${theme.product}, process a timestamp-ordered stream of ${theme.noun}. Find the longest contiguous window where at most k distinct risk labels appear and the total severity stays under budget.`,
    input: "Array of events {label, severity} and integers k, budget.",
    output: "Maximum window length satisfying both constraints.",
    constraints: ["1 <= events.length <= 300000", "1 <= k <= 50", "Severity values are positive integers."],
    examples: () => ["labels: A,B,A,C with k=2 and budget=7 -> longest valid window length is 3"],
  },
  {
    key: "top-k-stream",
    title: "Real-Time Top-K Prioritizer",
    pattern: "heap_priority_queue",
    baseDifficulty: "hard",
    concepts: ["heap", "top-k", "streaming rank"],
    statement: ({ role, theme }) => `Your ${theme.team} team needs a live top-k view for ${theme.noun}. Each update changes an item's score. Return the current top k item IDs after each update, ordered by score desc then ID asc.`,
    input: "Initial scores, k, and update stream [id, delta].",
    output: "Top-k IDs after every update.",
    constraints: ["1 <= items <= 200000", "1 <= updates <= 200000", "Scores can be negative."],
    examples: () => ["scores: [5,1,3], k=2, update [1,+5] -> [1,0]"],
  },
  {
    key: "interval-capacity",
    title: "Capacity Interval Planner",
    pattern: "intervals",
    baseDifficulty: "hard",
    concepts: ["line sweep", "interval merge", "capacity planning"],
    statement: ({ role, theme }) => `Plan capacity for ${theme.product}. Given reservation intervals with requested units, return the minimum capacity needed and all time ranges where capacity crosses a critical threshold.`,
    input: "Intervals [start, end, units] and threshold.",
    output: "Peak capacity and merged high-pressure intervals.",
    constraints: ["1 <= intervals.length <= 200000", "Intervals are half-open: [start, end).", "Timestamps fit in signed 32-bit integers."],
    examples: () => ["[[1,4,3],[2,5,4]], threshold=6 -> peak=7, hot=[[2,4]]"],
  },
  {
    key: "state-compression",
    title: "Policy State Compression",
    pattern: "bit_manipulation",
    baseDifficulty: "hard",
    concepts: ["bitmask DP", "state compression", "subset enumeration"],
    statement: ({ role, theme }) => `For ${theme.product}, each ${theme.noun} requires a subset of capabilities. Choose the smallest team of services covering all required capabilities; tie-break by lowest total risk.`,
    input: "m capabilities and services with capability masks plus risk.",
    output: "Minimum service count and risk, or impossible.",
    constraints: ["1 <= m <= 22", "1 <= services.length <= 2000", "Capability sets may overlap heavily."],
    examples: () => ["required={A,B,C}, services=[AB risk 4, C risk 1] -> count=2, risk=5"],
  },
  {
    key: "rag-shortest-path",
    title: "Evidence Path Finder",
    pattern: "graphs",
    baseDifficulty: "hard",
    concepts: ["shortest path", "weighted graph", "retrieval quality"],
    statement: ({ role, theme }) => `In ${theme.product}, entities are connected by weighted evidence edges. For each query, find the least-cost evidence path from source to target while avoiding blocked entities.`,
    input: "Weighted graph, blocked set, and q source-target queries.",
    output: "Minimum cost per query, or -1 if unreachable.",
    constraints: ["1 <= nodes <= 100000", "1 <= edges <= 300000", "1 <= queries <= 100000", "All weights are non-negative."],
    examples: () => ["0-1 cost 2, 1-2 cost 3, query 0->2 -> 5"],
  },
  {
    key: "rank-dp",
    title: "Ranking Budget Optimizer",
    pattern: "dp_1d",
    baseDifficulty: "hard",
    concepts: ["dynamic programming", "knapsack", "ranking trade-off"],
    statement: ({ role, theme }) => `Your ${theme.team} roadmap has candidate improvements for ${theme.product}. Each improvement has cost, lift and risk. Maximize lift under budget while keeping total risk below a threshold.`,
    input: "Items [cost, lift, risk], budget and maxRisk.",
    output: "Maximum lift achievable.",
    constraints: ["1 <= items.length <= 500", "Budget <= 10000", "maxRisk <= 10000"],
    examples: () => ["items [[2,5,1],[4,9,4]], budget=4, risk=4 -> 9"],
  },
  {
    key: "matrix-path",
    title: "Grid Reliability DP",
    pattern: "dp_2d",
    baseDifficulty: "hard",
    concepts: ["grid DP", "path optimization", "obstacle handling"],
    statement: ({ role, theme }) => `Model ${theme.product} as a grid of processing zones. Move only right or down. Return the maximum reliability path score while avoiding blocked cells.`,
    input: "Grid of scores with blocked cells marked -1.",
    output: "Maximum score from top-left to bottom-right, or -1.",
    constraints: ["1 <= rows, cols <= 1000", "Scores may be zero.", "Start or end may be blocked."],
    examples: () => ["[[5,1],[2,4]] -> 11"],
  },
  {
    key: "prefix-index",
    title: "Prefix Intent Index",
    pattern: "tries",
    baseDifficulty: "medium",
    concepts: ["trie", "prefix counts", "autocomplete"],
    statement: ({ role, theme }) => `Build a prefix index for ${theme.product}. Support insert(term, weight), delete(term), and topPrefix(prefix) returning the best active term by weight then lexicographic order.`,
    input: "A sequence of index operations.",
    output: "Return values for topPrefix operations.",
    constraints: ["1 <= operations <= 200000", "Total characters <= 1000000", "Weights can change through reinsertion."],
    examples: () => ["insert pay 5, insert payout 7, topPrefix pa -> payout"],
  },
  {
    key: "binary-answer",
    title: "Minimum Feasible Throughput",
    pattern: "binary_search",
    baseDifficulty: "medium",
    concepts: ["binary search on answer", "monotonic predicate"],
    statement: ({ role, theme }) => `For ${theme.product}, choose the minimum processing rate so all ${theme.noun} finish before deadline. Each worker can process rate units per minute, rounded up per item.`,
    input: "Work item sizes and deadline minutes.",
    output: "Minimum integer rate.",
    constraints: ["1 <= items.length <= 200000", "1 <= item size <= 1e9", "Deadline is at least items.length."],
    examples: () => ["sizes [3,6,7,11], deadline=8 -> 4"],
  },
  {
    key: "greedy-rebalance",
    title: "Greedy Load Rebalancer",
    pattern: "greedy",
    baseDifficulty: "medium",
    concepts: ["greedy proof", "sorting", "load balancing"],
    statement: ({ role, theme }) => `Rebalance ${theme.noun} across shards for ${theme.product}. Each move has a cost equal to distance between shards. Compute minimum cost to make shard loads differ by at most one.`,
    input: "Array of shard loads.",
    output: "Minimum movement cost.",
    constraints: ["1 <= shards <= 200000", "Total load <= 1e12"],
    examples: () => ["loads [0,3,0] -> move one unit left and one right, cost=2"],
  },
  {
    key: "hash-dedupe",
    title: "Duplicate Signal Resolver",
    pattern: "arrays_hashing",
    baseDifficulty: "easy",
    concepts: ["hash map", "dedupe", "stable ordering"],
    statement: ({ role, theme }) => `For ${theme.product}, collapse duplicate ${theme.noun} by external ID. Keep the newest event per ID and return IDs in first-seen order.`,
    input: "Array of events {id, version}.",
    output: "Deduped IDs and their kept version.",
    constraints: ["1 <= events.length <= 200000", "Versions are comparable integers."],
    examples: () => ["[(a,1),(b,1),(a,3)] -> [(a,3),(b,1)]"],
  },
] as const;

export const DSA_CATALOG: readonly DsaProblem[] = buildCatalog();

export const DSA_PATTERNS_DISPLAY: Record<DsaPattern, string> = {
  arrays_hashing: "Arrays & Hashing",
  two_pointers: "Two Pointers",
  sliding_window: "Sliding Window",
  stack_queue: "Stack / Queue",
  binary_search: "Binary Search",
  linked_list: "Linked List",
  trees: "Trees",
  tries: "Tries",
  heap_priority_queue: "Heap / Priority Queue",
  backtracking: "Backtracking",
  graphs: "Graphs",
  dp_1d: "Dynamic Programming / 1D",
  dp_2d: "Dynamic Programming / 2D",
  greedy: "Greedy",
  intervals: "Intervals",
  math_geometry: "Math / Geometry",
  bit_manipulation: "Bit Manipulation",
};

export function getDsaProblemBySlug(slug: string): DsaProblem | undefined {
  return DSA_CATALOG.find((p) => p.slug === slug);
}

export function getDsaRoleTrack(role: DsaRole): DsaRoleTrack {
  return DSA_ROLE_TRACKS.find((track) => track.role === role) ?? DSA_ROLE_TRACKS[0]!;
}

export function inferDsaRole(input: {
  role_function?: string | null;
  target_role_functions?: string[] | null;
  current_role?: string | null;
  tech_stack?: string[] | null;
  resume_text?: string | null;
}): DsaRole {
  const haystack = [
    input.role_function,
    ...(input.target_role_functions ?? []),
    input.current_role,
    ...(input.tech_stack ?? []),
    input.resume_text,
  ].filter(Boolean).join(" ").toLowerCase();

  if (/(ai|ml|machine learning|llm|rag|genai|model|nlp|computer vision|recommend)/.test(haystack)) return "ai_ml_engineer";
  if (/(data engineer|spark|airflow|kafka|etl|warehouse|lakehouse|analytics)/.test(haystack)) return "data_engineer";
  if (/(sre|devops|kubernetes|infra|observability|terraform|platform ops)/.test(haystack)) return "devops_sre";
  if (/(security|appsec|iam|threat|vulnerability|zero trust|fraud)/.test(haystack)) return "security_engineer";
  if (/(android|ios|react native|flutter|mobile|swift|kotlin)/.test(haystack)) return "mobile_engineer";
  if (/(frontend|front-end|react|vue|angular|web ui|typescript)/.test(haystack)) return "frontend_engineer";
  if (/(full stack|full-stack|next.js|node.js.*react|react.*node)/.test(haystack)) return "full_stack_engineer";
  if (/(platform|developer productivity|devex|build|ci\/cd|internal tools)/.test(haystack)) return "platform_engineer";
  if (/(backend|back-end|api|microservice|distributed|java|go|spring)/.test(haystack)) return "backend_engineer";
  return "software_engineer";
}

/**
 * Pick the next problem for a user.
 *
 * Rules:
 * - Role track dominates the score.
 * - 60-day no-repeat is enforced before scoring.
 * - Difficulty rotates hard -> medium -> easy by solved-count, as requested.
 * - User/date seed gives different users different picks while remaining
 *   stable for a user across refreshes on the same day.
 */
export function pickNextDsaProblem(input: {
  weakPatterns: DsaPattern[];
  targetCompanies: string[];
  recentSlugs: Set<string>;
  solvedCount: number;
  targetRole?: DsaRole | null;
  userDateSeed?: number;
}): DsaProblem | null {
  const desiredDifficulty = difficultyForAttempt(input.solvedCount);
  const targetRole = input.targetRole ?? "software_engineer";
  const weakSet = new Set(input.weakPatterns);
  const companySet = new Set(input.targetCompanies);
  const seed = input.userDateSeed ?? 0;

  const candidates = DSA_CATALOG
    .filter((p) => !input.recentSlugs.has(p.slug))
    .map((p) => {
      let score = 0;
      if (p.primaryRole === targetRole) score += 12;
      else if (p.roles.includes(targetRole)) score += 5;
      if (p.difficulty === desiredDifficulty) score += 8;
      if (weakSet.has(p.pattern)) score += 3;
      if (p.companies.some((c) => companySet.has(c))) score += 2;
      if (p.difficulty === "hard") score += 1;
      return { problem: p, score };
    });

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const sa = (slugHash(a.problem.slug) + seed) % 104729;
    const sb = (slugHash(b.problem.slug) + seed) % 104729;
    if (sa !== sb) return sa - sb;
    return a.problem.slug.localeCompare(b.problem.slug);
  });

  return candidates[0]?.problem ?? null;
}

export function getDsaRoleStats(): Array<DsaRoleTrack & { easy: number; medium: number; hard: number }> {
  return DSA_ROLE_TRACKS.map((track) => {
    const problems = DSA_CATALOG.filter((p) => p.primaryRole === track.role);
    return {
      ...track,
      easy: problems.filter((p) => p.difficulty === "easy").length,
      medium: problems.filter((p) => p.difficulty === "medium").length,
      hard: problems.filter((p) => p.difficulty === "hard").length,
    };
  });
}

export function difficultyForAttempt(solvedCount: number): DsaDifficulty {
  const mod = Math.max(0, solvedCount) % 3;
  if (mod === 0) return "hard";
  if (mod === 1) return "medium";
  return "easy";
}

function buildCatalog(): DsaProblem[] {
  const out: DsaProblem[] = [];
  DSA_ROLE_TRACKS.forEach((role, roleIndex) => {
    const themes = ROLE_THEMES[role.role];
    themes.forEach((theme, themeIndex) => {
      BLUEPRINTS.forEach((blueprint, blueprintIndex) => {
        const company = APPROVED_COMPANIES[(roleIndex * 11 + themeIndex * 5 + blueprintIndex * 3) % APPROVED_COMPANIES.length]!;
        const difficulty = difficultyForBlueprint(blueprint.baseDifficulty, blueprintIndex, themeIndex);
        const month = FRESH_CONTEXT_MONTHS[(roleIndex + themeIndex + blueprintIndex) % FRESH_CONTEXT_MONTHS.length]!;
        const title = `${theme.short} ${blueprint.title}`;
        out.push({
          slug: slugify(`${role.role}-${theme.short}-${blueprint.key}`),
          title,
          pattern: blueprint.pattern,
          difficulty,
          leetcode_id: null,
          url: null,
          companies: [company.slug],
          roles: relatedRoles(role.role),
          primaryRole: role.role,
          context: {
            company: company.name,
            companySlug: company.slug,
            productTeam: theme.team,
            month,
            productSurface: theme.product,
            disclaimer: "ProdMatch interview simulation based on product-team patterns; not a claim of a real company question.",
          },
          statement: blueprint.statement({ role, theme }),
          inputFormat: blueprint.input,
          outputFormat: blueprint.output,
          constraints: blueprint.constraints,
          examples: blueprint.examples(theme),
          concepts: [...new Set([...role.concepts.slice(0, 3), ...blueprint.concepts])],
          premiumSignal: `${role.label} signal: ${blueprint.concepts.slice(0, 2).join(" + ")} in a ${theme.product} context.`,
        });
      });
    });
  });
  return out;
}

function difficultyForBlueprint(base: DsaDifficulty, blueprintIndex: number, themeIndex: number): DsaDifficulty {
  if (base === "easy") return (themeIndex + blueprintIndex) % 3 === 0 ? "medium" : "easy";
  if (base === "medium") return (themeIndex + blueprintIndex) % 4 === 0 ? "hard" : "medium";
  return (themeIndex + blueprintIndex) % 6 === 0 ? "medium" : "hard";
}

function relatedRoles(role: DsaRole): DsaRole[] {
  const shared: Record<DsaRole, DsaRole[]> = {
    software_engineer: ["software_engineer", "backend_engineer", "full_stack_engineer", "platform_engineer"],
    backend_engineer: ["backend_engineer", "software_engineer", "platform_engineer", "devops_sre"],
    frontend_engineer: ["frontend_engineer", "full_stack_engineer", "mobile_engineer", "software_engineer"],
    full_stack_engineer: ["full_stack_engineer", "frontend_engineer", "backend_engineer", "software_engineer"],
    ai_ml_engineer: ["ai_ml_engineer", "data_engineer", "backend_engineer", "software_engineer"],
    data_engineer: ["data_engineer", "ai_ml_engineer", "backend_engineer", "platform_engineer"],
    devops_sre: ["devops_sre", "platform_engineer", "backend_engineer", "security_engineer"],
    mobile_engineer: ["mobile_engineer", "frontend_engineer", "full_stack_engineer", "software_engineer"],
    security_engineer: ["security_engineer", "devops_sre", "backend_engineer", "platform_engineer"],
    platform_engineer: ["platform_engineer", "backend_engineer", "devops_sre", "software_engineer"],
  };
  return shared[role];
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function slugHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
