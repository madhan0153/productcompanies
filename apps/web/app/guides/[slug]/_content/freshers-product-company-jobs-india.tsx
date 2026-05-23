import Link from "next/link";
import { JsonLd, faqJsonLd, howToJsonLd } from "@/lib/seo/json-ld";
import { absoluteUrl } from "@/lib/seo/site";

export function FreshersProductCompanyJobs() {
  const howTo = howToJsonLd({
    name: "How freshers get jobs at India's product companies",
    description: "6-month playbook for fresh graduates targeting India's top 51 product companies.",
    totalTimeISO: "P180D",
    steps: [
      { name: "Identify the 13 product companies that hire freshers", text: "Google, Microsoft, Amazon, Meta, Salesforce, SAP Labs, Atlassian, Nvidia, Oracle, Flipkart, Razorpay, PhonePe and Groww run dedicated SDE-1 / Associate pipelines.", url: absoluteUrl("/companies") },
      { name: "Build 2-3 strong projects on GitHub", text: "Two product-shaped projects with deployed demos beat 10 college assignments. Include README, tests, CI.", url: absoluteUrl("/profile/resume") },
      { name: "Cover the 17 DSA patterns", text: "Work the ProdMatch roadmap over 12 weeks: arrays + hashing through DP-2D.", url: absoluteUrl("/dsa/patterns") },
      { name: "Apply directly to University / Early Career pages", text: "Each of the 13 companies has its own fresher pipeline. Apply through the company's career page — never aggregators.", url: absoluteUrl("/companies") },
      { name: "Refer through alumni + LinkedIn", text: "Referrals materially raise interview odds. Reach out to alumni from your college at each target company.", url: undefined },
    ],
  });

  const faq = [
    {
      question: "Which product-based companies in India hire freshers in 2026?",
      answer: "13 of India's 51 tracked product companies: Google, Microsoft, Amazon, Meta, Salesforce, SAP Labs, Atlassian, Nvidia, Oracle, Flipkart, Razorpay, PhonePe and Groww. The other 5 (Apple India, Swiggy, Zomato, CRED, Zerodha) hire mostly experienced engineers but occasionally run small fresher pilots.",
    },
    {
      question: "What's the salary for a fresher at a product company in India?",
      answer: "Indicative 2026 bands for SDE-1 / Associate freshers: FAANG-tier (Google, Microsoft, Amazon, Meta, Apple) — 25-45 LPA TC; India unicorns (Razorpay, PhonePe, Swiggy, Zomato, Flipkart) — 18-32 LPA; mid-stage (Groww, CRED, Zerodha when hiring freshers) — 12-22 LPA. Stock + sign-on can add 20-40% at FAANG.",
    },
    {
      question: "Can I get a product-company job without any internship?",
      answer: "Yes, but harder. Strong DSA + 2-3 portfolio projects can substitute for an internship. The realistic conversion rate without an internship is ~5-10% of applications to interviews vs ~15-25% with relevant internship experience. Compensate with referrals and a well-positioned GitHub.",
    },
    {
      question: "How early should I start preparing for product-company interviews as a fresher?",
      answer: "Realistic prep window: 6 months of focused DSA + system-design basics + 2-3 strong projects. Most successful candidates start in their 3rd-year summer break and aim for the 4th-year placement cycle. If you missed the window, off-campus applications run year-round.",
    },
    {
      question: "What's the typical interview loop for a fresher SDE-1 at an Indian product company?",
      answer: "4-5 rounds: 1 online assessment (DSA + sometimes aptitude), 2 technical interviews (DSA + basic CS fundamentals + project deep-dive), 1 system-design-lite or design fundamentals round (sometimes skipped for freshers), and 1 hiring-manager / behavioural round. Total ~3-4 hours of interview time over 1-2 weeks.",
    },
  ];

  return (
    <>
      <JsonLd data={howTo} />
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <h2>The honest landscape for freshers in 2026</h2>
      <p>
        India&apos;s product companies hire freshers — but not uniformly.
        Across the 51 ProdMatch tracks, several run dedicated SDE-1 / Associate
        pipelines. The remaining 5 hire mostly mid + senior engineers
        with the occasional fresher pilot.
      </p>

      <h3>Companies actively hiring freshers</h3>
      <ul>
        <li><strong>FAANG-tier in India</strong>: Google, Microsoft, Amazon, Meta, Salesforce, SAP Labs, Atlassian, Nvidia, Oracle</li>
        <li><strong>India unicorns hiring freshers</strong>: Razorpay, PhonePe, Flipkart, Groww</li>
      </ul>
      <h3>Companies that hire experienced engineers primarily</h3>
      <ul>
        <li>Apple India (rarely runs fresher hiring)</li>
        <li>Swiggy + Zomato (occasional fresher cohorts)</li>
        <li>CRED, Zerodha (mostly experienced; pilots are rare and small)</li>
      </ul>

      <h2>The 6-month prep playbook</h2>

      <h3>Months 1-2 — Foundations</h3>
      <ul>
        <li>Pick a primary language: TypeScript, Python, or Java. Spend 6 weeks getting genuinely fluent.</li>
        <li>Read <em>Designing Data-Intensive Applications</em> (DDIA) chapters 1-4 + 11-12. Skip the rest for now.</li>
        <li>Build a small end-to-end project (~200 commits): a personal portfolio, a URL shortener with auth, a small ML inference API.</li>
      </ul>

      <h3>Months 2-5 — DSA, pattern by pattern</h3>
      <ul>
        <li>Use ProdMatch&apos;s <Link href="/dsa/patterns">17-pattern roadmap</Link>.</li>
        <li>One pattern per week, with 4-5 problems solved cleanly in your primary language.</li>
        <li>Friday: spaced-repetition revisit a pattern from 2 weeks ago.</li>
        <li>Weekend: solve 1 medium + 1 hard from this week&apos;s pattern.</li>
      </ul>

      <h3>Month 5 — System-design fundamentals (lite)</h3>
      <ul>
        <li>For freshers, system design rounds are usually skipped or kept light. Cover the basics anyway: REST API design, caching, eventual consistency, basic database scaling.</li>
        <li>Practice explaining 2-3 of your portfolio projects&apos; architecture out loud — that&apos;s what often gets asked.</li>
      </ul>

      <h3>Month 6 — Applications + referrals</h3>
      <ul>
        <li>Apply to each company&apos;s University / Early Career page directly. Don&apos;t use aggregators.</li>
        <li>Reach out to 5-10 alumni per target company on LinkedIn for referrals.</li>
        <li>Schedule mock interviews with friends or paid platforms (Interviewing.io, Pramp).</li>
      </ul>

      <h2>Realistic compensation expectations (2026)</h2>
      <p>
        Indicative bands for SDE-1 / Associate freshers (base + variable +
        stock, total comp):
      </p>
      <ul>
        <li><strong>FAANG-tier India</strong>: Google, Microsoft, Amazon, Meta, Apple — 25-45 LPA TC (base ~16-22L + stock + sign-on).</li>
        <li><strong>India unicorns</strong>: Razorpay, PhonePe, Swiggy, Zomato, Flipkart — 18-32 LPA TC.</li>
        <li><strong>Mid-stage</strong>: Groww, CRED, Zerodha when hiring freshers — 12-22 LPA.</li>
      </ul>
      <p>
        Check <Link href="/salaries">live salary pages</Link> for per-company
        bands sourced from disclosed JDs.
      </p>

      <h2>What to apply through</h2>
      <p>
        Every application goes through the company&apos;s own University /
        Early Career page. ProdMatch lists every active fresher-eligible
        role with a direct apply link — no middleman, no fees, no
        recruiter spam. The 51 product companies&apos; career pages are
        the only source of truth.
      </p>

      <h2>Common fresher mistakes</h2>
      <ul>
        <li><strong>Spray-applying</strong> — 200 generic applications get you 200 rejections. 30 thoughtful ones with referrals get you 8-12 screens.</li>
        <li><strong>Skipping the project portfolio</strong> — your GitHub matters more than your CGPA at 90% of these companies.</li>
        <li><strong>Ignoring referrals</strong> — referrals materially raise interview-screen odds. Reach out to alumni; most are happy to refer.</li>
        <li><strong>Treating placements as the only chance</strong> — off-campus + side-door application paths run year-round.</li>
      </ul>
    </>
  );
}
