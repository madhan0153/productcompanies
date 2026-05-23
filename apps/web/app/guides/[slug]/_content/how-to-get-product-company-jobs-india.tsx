// Pillar guide: how to get product-company jobs in India.
// Server component — content is pure JSX so it's in the initial HTML for
// crawlers + AI agents to extract cleanly.

import Link from "next/link";
import { JsonLd, faqJsonLd, howToJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";

export function HowToGetProductJobs() {
  const howTo = howToJsonLd({
    name: "How to get product-company jobs in India",
    description: "Step-by-step process for landing a job at India's top 51 product companies.",
    totalTimeISO: "PT9M",
    steps: [
      { name: "Frame your resume in product-company language", text: "Replace 'maintained' / 'supported' / 'worked on' with impact + scale + ownership verbs. Quantify every project.", url: absoluteUrl("/profile/resume") },
      { name: "Target the right role function", text: "Map your current title to a canonical role function (backend, frontend, data, ML, DevOps). ProdMatch does this automatically when you upload a resume.", url: absoluteUrl("/roles") },
      { name: "Prep for DSA + system design", text: "Cover the 17 product-company DSA patterns. Most interviews touch arrays + hashing, two pointers, sliding window, BFS/DFS, and dynamic programming.", url: absoluteUrl("/dsa/patterns") },
      { name: "Apply directly to official career pages", text: "Skip aggregator middlemen. Every ProdMatch listing links to the company's own apply URL.", url: absoluteUrl("/companies") },
      { name: "Track and iterate", text: "Track which applications get a response. Use the feedback to refine your resume and target role.", url: absoluteUrl("/dashboard") },
    ],
  });

  const faq = [
    {
      question: "How long does it take to get a job at a product company in India?",
      answer: "Realistic timeline: 3–6 months of focused prep for IT-services engineers transitioning in. Founders + already-product engineers report 4–8 weeks once their resume is dialled in. The bottleneck is usually DSA + system-design readiness, not application volume.",
    },
    {
      question: "Do product companies in India hire from IT services?",
      answer: "Yes — extensively. Razorpay, PhonePe, Swiggy, Zomato, Flipkart, CRED and Groww routinely hire from TCS, Infosys, Wipro, Cognizant, Capgemini, Accenture and Mindtree. The bar is on skills + impact, not your current employer's name. FAANG-tier companies (Google, Microsoft, Meta, Amazon) hire from services too, especially for SDE-2 / SDE-3 roles with 4-8 years of experience.",
    },
    {
      question: "What salary should I expect at a product company in India?",
      answer: "Comp varies by company, level, and city. Indicative 2026 bands for SDE-1: 12–22 LPA (Razorpay, PhonePe, Groww), 18–32 LPA (Swiggy, Zomato, Flipkart), 25–45 LPA (Google, Microsoft, Meta, Amazon India). SDE-2 and above can reach 35–80+ LPA with stock at the FAANG tier.",
    },
    {
      question: "Do I need to be in Bengaluru to get a product-company job?",
      answer: "No. Hyderabad has comparable product-co density (Microsoft, Amazon, Google, Salesforce, Atlassian all have major offices). Pune, Gurugram, and Mumbai have product-company presence too. Remote-India roles exist but are fewer than they were in 2021-22.",
    },
  ];

  return (
    <>
      <JsonLd data={howTo} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <h2>The honest path</h2>
      <p>
        Getting hired at a product company in India in 2026 is no longer a
        lottery. The hiring loops are well-documented, the role
        expectations are public, and the application path is mostly direct.
        What stops most engineers is not opportunity — it is one of three
        things: resume framing, DSA readiness, or applying to the wrong roles.
      </p>
      <p>
        This guide is the field-tested process ProdMatch&apos;s matching
        engine sees work. The five-step process below is what consistently
        moves people from rejection to offers.
      </p>

      <h2>Step 1 — Frame your resume in product-company language</h2>
      <p>
        Product companies want to see <strong>impact</strong>,{" "}
        <strong>scale</strong>, and <strong>ownership</strong>. Service-company
        engineers tend to write bullets that describe <em>activities</em>
        instead — &quot;maintained the API layer&quot;, &quot;supported
        production&quot;, &quot;worked on the migration&quot;. Re-write
        every bullet to answer three questions: what did you build, what was
        the scale (users, RPS, data volume), and what was the business outcome?
      </p>
      <p>
        Example transformation:
      </p>
      <ul>
        <li>
          <em>Before:</em> &quot;Worked on auth service. Resolved production issues. Coordinated with QA.&quot;
        </li>
        <li>
          <em>After:</em> &quot;Owned the auth service serving 8K RPS at 99.95% availability. Cut p99 latency from 240ms to 95ms via async batching, eliminating a recurring incident class.&quot;
        </li>
      </ul>
      <p>
        ProdMatch includes a <Link href="/profile/resume">Project Translator</Link> that does this rewrite in-line — paste a bullet, get the product-company version with measurable impact.
      </p>

      <h2>Step 2 — Target the right role function</h2>
      <p>
        Product companies hire by <strong>role function</strong>, not by
        generic &quot;software engineer&quot;. The 13 functions ProdMatch
        tracks across the 51 companies are: backend, frontend, full-stack,
        data engineering, data analytics, ML/AI, DevOps/SRE, mobile, security,
        engineering management, product management, program management, and
        product design.
      </p>
      <p>
        Applying as a generalist is the #1 mistake. A backend engineer
        applying to a data-engineering JD because both involve Python +
        Postgres will score below 40 in any decent matching engine and the
        recruiter will skip the resume in seconds. ProdMatch normalises your
        resume into a canonical role function automatically and only ranks
        roles where the role-function aligns.
      </p>

      <h2>Step 3 — Prep for DSA + system design</h2>
      <p>
        Every product-company loop has at least one DSA round and one
        system-design round (or a debug-real-code round for senior levels).
        The DSA round draws from a knowable set of <strong>17 patterns</strong>:
        arrays + hashing, two pointers, sliding window, stack / queue,
        binary search, linked list, trees, heap / priority queue, graphs,
        backtracking, DP-1D, DP-2D, greedy, intervals, tries, bit
        manipulation, math / geometry.
      </p>
      <p>
        Cover one pattern per week. For each pattern: read the canonical
        approach, solve 4-5 problems by hand, code 2-3 cleanly in your
        primary language. ProdMatch&apos;s <Link href="/dsa/patterns">DSA pattern
        roadmap</Link> includes solutions in TypeScript, Python, and Java with
        common-mistake callouts.
      </p>

      <h2>Step 4 — Apply directly to official career pages</h2>
      <p>
        Aggregator job boards (Naukri, LinkedIn, Indeed, Hirist) carry
        listings that can be stale by days or weeks. Worse, applying through
        them often means a recruiter inbox you can&apos;t see. The reliable
        path is to apply through each company&apos;s own career page. Every
        ProdMatch listing has a direct &quot;Apply on official site&quot;
        link with no middleman or fee.
      </p>
      <p>
        Realistic application volume: target <strong>20-30 carefully chosen roles</strong>{" "}
        across the 51 companies. Spray-applying to 200 roles dilutes the
        signal you put into each application.
      </p>

      <h2>Step 5 — Track and iterate</h2>
      <p>
        After 2-3 weeks of applying, look at the response rate. If 0 out of
        20 applications got a response, the issue is upstream — usually the
        resume, sometimes the role match. If 3-5 got recruiter screens but
        0 progressed past the technical round, the issue is interview
        readiness. ProdMatch tracks application status across companies in
        a single <Link href="/applications">dashboard</Link> so you can see the funnel.
      </p>

      <h2>The realistic timeline</h2>
      <ul>
        <li><strong>Week 1-2:</strong> Resume rewrite + role-function calibration.</li>
        <li><strong>Week 3-12:</strong> DSA prep, 1 pattern per week. System-design reading in parallel.</li>
        <li><strong>Week 8-16:</strong> Begin applying. Most rejections happen in week 8-10 — adjust.</li>
        <li><strong>Week 14-24:</strong> Interview loops. Expect 4-6 simultaneous, 1-2 offers.</li>
      </ul>

      <h2>What ProdMatch handles for you</h2>
      <ul>
        <li>Step 1: Project Translator rewrites bullets in product-company language.</li>
        <li>Step 2: Resume parser normalises your role into a canonical function.</li>
        <li>Step 3: DSA pattern roadmap with TypeScript / Python / Java solutions.</li>
        <li>Step 4: Direct apply links from every listing to the company&apos;s own career page.</li>
        <li>Step 5: Application tracker + recompute on every resume edit.</li>
      </ul>
    </>
  );
}
