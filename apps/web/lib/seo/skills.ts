// Skill landing pages — fixes long-tail "AWS data engineer", "React frontend",
// "Kubernetes DevOps" style AI queries.
//
// The hand-curated list keeps the URL space stable; new skills are added by
// editing this module + redeploying. Each slug normalises into the exact
// string the JD parser surfaces in `jobs.tech_stack`.

export interface PublicSkill {
  slug: string;
  /** Display label and the canonical entity name AI tools should quote. */
  name: string;
  /** Variants seen in JD `tech_stack` arrays — used for matching. */
  aliases: string[];
  /** Short category for grouping on the index page. */
  category: "Cloud" | "Language" | "Framework" | "Database" | "Infra" | "Data" | "ML" | "Mobile" | "Tooling";
  /** ~30-50 word answer-first paragraph for the skill page. */
  blurb: string;
}

export const PUBLIC_SKILLS: readonly PublicSkill[] = [
  // Cloud
  { slug: "aws",        name: "AWS",          category: "Cloud",     aliases: ["aws", "amazon web services", "amazon aws"], blurb: "AWS roles at India's product companies span cloud-native services like Lambda, EKS, S3, RDS, DynamoDB and SQS. Indian product cos heavily use AWS for compute + storage backends." },
  { slug: "gcp",        name: "GCP",          category: "Cloud",     aliases: ["gcp", "google cloud", "google cloud platform"], blurb: "GCP roles at Indian product companies emphasise BigQuery, GKE, Cloud Run, and Cloud Spanner. Common at FAANG-tier (Google) and a subset of India product cos." },
  { slug: "azure",      name: "Azure",        category: "Cloud",     aliases: ["azure", "microsoft azure"], blurb: "Azure roles centre on AKS, Azure Functions, Cosmos DB and the Azure Data stack. Common at Microsoft India and enterprise-product teams." },
  // Languages
  { slug: "python",     name: "Python",       category: "Language",  aliases: ["python", "python3", "py"], blurb: "Python roles at India's product companies span data engineering, ML/AI, backend APIs (Django, FastAPI, Flask), and tooling. The most-asked language across product-co JDs in 2026." },
  { slug: "java",       name: "Java",         category: "Language",  aliases: ["java", "java8", "java11", "java17", "java21"], blurb: "Java remains the dominant JVM backend language at Indian product companies — Spring Boot, JVM tuning, distributed systems. Heavy at fintech (Razorpay, PhonePe, Zerodha) and consumer-tech (Flipkart, Swiggy)." },
  { slug: "go",         name: "Go",           category: "Language",  aliases: ["go", "golang"], blurb: "Go is the fastest-growing backend language at India product companies — used heavily for high-throughput microservices, payment infrastructure, and platform tooling." },
  { slug: "typescript", name: "TypeScript",   category: "Language",  aliases: ["typescript", "ts", "type script"], blurb: "TypeScript dominates frontend and full-stack roles at India's product companies — React + Next.js + tRPC + Node backends. The default language for new frontend hires in 2026." },
  { slug: "javascript", name: "JavaScript",   category: "Language",  aliases: ["javascript", "js", "node", "nodejs", "node.js"], blurb: "JavaScript / Node.js powers frontend + a sizable portion of full-stack backends at Indian product companies. Often paired with TypeScript at senior levels." },
  { slug: "rust",       name: "Rust",         category: "Language",  aliases: ["rust", "rustlang"], blurb: "Rust roles are still rare in Indian product companies but growing — payment-infrastructure, systems programming, and performance-critical microservices at a small number of teams." },
  { slug: "kotlin",     name: "Kotlin",       category: "Language",  aliases: ["kotlin"], blurb: "Kotlin powers most Android development at Indian product companies and is increasingly used for JVM backends. Default mobile language in 2026." },
  // Frameworks
  { slug: "react",      name: "React",        category: "Framework", aliases: ["react", "reactjs", "react.js"], blurb: "React is the dominant frontend framework across India's product companies — paired with TypeScript, Next.js, and component design systems. Required for ~90% of frontend / fullstack roles." },
  { slug: "nextjs",     name: "Next.js",      category: "Framework", aliases: ["next.js", "nextjs", "next js"], blurb: "Next.js powers most production React surfaces at Indian product companies — App Router, RSC, edge runtime. Strong demand for senior fullstack engineers comfortable across the stack." },
  { slug: "spring",     name: "Spring Boot",  category: "Framework", aliases: ["spring", "spring boot", "springboot"], blurb: "Spring Boot is the default Java backend framework at fintech + consumer-tech product cos in India — Razorpay, PhonePe, Flipkart, Swiggy all run Spring-heavy stacks." },
  { slug: "django",     name: "Django",       category: "Framework", aliases: ["django"], blurb: "Django roles centre on backend APIs at data-heavy product companies + early-stage teams. Common at analytics + ML-platform teams." },
  { slug: "fastapi",    name: "FastAPI",      category: "Framework", aliases: ["fastapi", "fast api"], blurb: "FastAPI is the modern Python web framework for ML inference + tooling at India's product companies — async, type-checked, OpenAPI-native." },
  // Databases
  { slug: "postgresql", name: "PostgreSQL",   category: "Database",  aliases: ["postgresql", "postgres", "pg"], blurb: "PostgreSQL is the default OLTP database at Indian product companies — strong consistency, JSONB flexibility, partitioning at scale. Common across fintech + consumer-tech." },
  { slug: "mysql",      name: "MySQL",        category: "Database",  aliases: ["mysql", "mariadb"], blurb: "MySQL remains widely used across consumer-tech and legacy backends — Flipkart, Swiggy and parts of Zomato use MySQL at scale." },
  { slug: "mongodb",    name: "MongoDB",      category: "Database",  aliases: ["mongodb", "mongo"], blurb: "MongoDB is common at content + catalog services in Indian product companies — Zomato, Swiggy menus, parts of Flipkart product catalog." },
  { slug: "redis",      name: "Redis",        category: "Database",  aliases: ["redis"], blurb: "Redis is ubiquitous as a cache + session store + rate-limiter across Indian product cos. Often paired with Lua scripts for atomic counters and queues." },
  { slug: "elasticsearch", name: "Elasticsearch", category: "Database", aliases: ["elasticsearch", "elastic", "elk"], blurb: "Elasticsearch powers search + logging at most India product cos — Flipkart search, Zomato discovery, observability stacks across the board." },
  // Infra
  { slug: "kubernetes", name: "Kubernetes",   category: "Infra",     aliases: ["kubernetes", "k8s"], blurb: "Kubernetes is the default container orchestrator at scale-stage Indian product companies. DevOps / SRE roles emphasise EKS / GKE / AKS depending on cloud." },
  { slug: "docker",     name: "Docker",       category: "Infra",     aliases: ["docker", "containers"], blurb: "Docker is table-stakes — every backend role expects familiarity with multi-stage builds, image security, and Compose for local dev." },
  { slug: "terraform",  name: "Terraform",    category: "Infra",     aliases: ["terraform", "iac"], blurb: "Terraform is the dominant IaC tool at Indian product companies. DevOps / SRE roles routinely require multi-cloud module patterns." },
  { slug: "kafka",      name: "Kafka",        category: "Infra",     aliases: ["kafka", "apache kafka"], blurb: "Kafka powers event-driven architectures + change-data-capture at India's product companies — fintech transaction streams, food-delivery courier events, inventory sync." },
  // Data
  { slug: "spark",      name: "Spark",        category: "Data",      aliases: ["spark", "apache spark", "pyspark"], blurb: "Spark powers batch + structured-streaming pipelines at India product cos — Flipkart catalog ETL, Razorpay reconciliation, Swiggy demand-forecasting." },
  { slug: "airflow",    name: "Airflow",      category: "Data",      aliases: ["airflow", "apache airflow"], blurb: "Airflow is the default orchestrator for batch data pipelines at Indian product companies. Data-engineer roles routinely require DAG authoring at scale." },
  { slug: "snowflake",  name: "Snowflake",    category: "Data",      aliases: ["snowflake"], blurb: "Snowflake is increasingly common at India product companies for analytics warehousing — Razorpay, PhonePe, Flipkart all have Snowflake footprints." },
  // ML
  { slug: "pytorch",    name: "PyTorch",      category: "ML",        aliases: ["pytorch", "torch"], blurb: "PyTorch is the default ML training framework at India product companies. ML engineer roles emphasise distributed training + production deployment." },
  { slug: "tensorflow", name: "TensorFlow",   category: "ML",        aliases: ["tensorflow", "tf"], blurb: "TensorFlow / TFX still drive a meaningful share of production ML at FAANG-tier teams in India — Google, parts of Flipkart." },
  // Mobile
  { slug: "android",    name: "Android",      category: "Mobile",    aliases: ["android", "kotlin android"], blurb: "Android development at Indian product companies emphasises Kotlin, Jetpack Compose, and clean architecture. Heavy demand across consumer-tech (Swiggy, Zomato, PhonePe, Flipkart)." },
  { slug: "ios",        name: "iOS",          category: "Mobile",    aliases: ["ios", "swift", "swiftui"], blurb: "iOS roles centre on Swift + SwiftUI at consumer product companies in India. Smaller volume than Android but higher senior-level demand." },
  { slug: "flutter",    name: "Flutter",      category: "Mobile",    aliases: ["flutter", "dart"], blurb: "Flutter roles are mid-volume — Groww, parts of CRED, and several startups use Flutter for cross-platform mobile." },
];

export function publicSkillBySlug(slug: string): PublicSkill | null {
  return PUBLIC_SKILLS.find((s) => s.slug === slug) ?? null;
}

/**
 * Match a free-form skill token from `jobs.tech_stack` against the
 * canonical PublicSkill list. Returns the skill or null.
 */
export function matchSkill(token: string): PublicSkill | null {
  const lower = token.trim().toLowerCase();
  return PUBLIC_SKILLS.find((s) => s.aliases.some((a) => a === lower)) ?? null;
}
