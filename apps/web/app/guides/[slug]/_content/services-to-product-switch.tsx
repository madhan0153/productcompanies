import Link from "next/link";
import { JsonLd, faqJsonLd } from "@/lib/seo/json-ld";

export function ServicesToProductSwitch() {
  const faq = [
    {
      question: "Is it realistic to switch from TCS / Infosys / Wipro to a product company in India?",
      answer: "Yes — thousands do it every year. The realistic prep window is 3-6 months. The bottleneck is rarely your current employer; it's resume framing + DSA readiness. Razorpay, Swiggy, PhonePe, Flipkart, Zomato and Groww have engineers across all seniority levels who started at services companies.",
    },
    {
      question: "Will product companies look down on my services-company experience?",
      answer: "Recruiters do not. Hiring managers occasionally apply a soft discount, but only if your resume doesn't demonstrate ownership and impact. A bullet like 'owned the auth service handling 8K RPS at 99.95% availability' from a services-company project beats 'worked on architecture' at a startup. The work matters more than the logo.",
    },
    {
      question: "How long does the switch take in practice?",
      answer: "Median: 4-6 months from start of DSA prep to offer. Fast track: 8-12 weeks if you already have product-shaped experience. The slowest part is interview loops scheduling, not your prep.",
    },
    {
      question: "Do I need to leave my current job to interview at product companies?",
      answer: "No. Most product companies in India schedule 2-4 evening/weekend rounds. The final loop is sometimes a single 4-6 hour onsite. You can do all of this without leaving your current role.",
    },
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <h2>Who this guide is for</h2>
      <p>
        Indian software engineer at TCS, Infosys, Wipro, Cognizant,
        Capgemini, Accenture, Mindtree, or any other large IT-services
        company. 2-8 years of experience. Targeting a move to a product
        company — Razorpay, Swiggy, PhonePe, Flipkart, Zomato, Google,
        Microsoft, or one of the other 12 ProdMatch tracks.
      </p>

      <h2>The honest assessment up front</h2>
      <p>
        The switch is achievable but not casual. The bar for a product
        company is real: it&apos;s not your services employer that&apos;s
        holding you back — it&apos;s usually one of three things:
      </p>
      <ol>
        <li><strong>Your resume is written in services-company language</strong> (activities instead of impact).</li>
        <li><strong>Your DSA readiness is several months out of date</strong> from any college-level practice you had.</li>
        <li><strong>You apply broadly</strong> instead of narrowly, so each application lands as noise.</li>
      </ol>
      <p>
        Fix those three and the company name on your current payslip becomes
        irrelevant.
      </p>

      <h2>The 6-month plan</h2>

      <h3>Month 1 — Resume + role positioning</h3>
      <p>
        Rewrite every project bullet in <strong>STAR + scale</strong> format:
        Situation, Task, Action, Result, with concrete numbers wherever you
        can. If you genuinely don&apos;t know the scale (most services
        engineers don&apos;t see production metrics), <em>find out</em> —
        ask your team lead, check Grafana / Datadog dashboards, dig into
        the JIRA tickets. Numbers like &quot;serves 10K active users&quot;
        or &quot;processes 50GB of nightly batch data&quot; transform a
        resume.
      </p>
      <p>
        Map your current role to one of the 13 canonical{" "}
        <Link href="/roles">role functions</Link> ProdMatch tracks.
        Don&apos;t apply as &quot;Software Engineer&quot; — apply as
        &quot;Backend Engineer&quot; or &quot;Data Engineer&quot; with the
        narrative to match.
      </p>

      <h3>Months 2-4 — DSA prep, pattern by pattern</h3>
      <p>
        Allocate ~60 minutes a day, 5 days a week. Pick one pattern per
        week from the 17 ProdMatch tracks. The cadence:
      </p>
      <ul>
        <li>Mon-Tue: read the pattern, solve 2-3 problems by hand on paper.</li>
        <li>Wed-Thu: code 2-3 problems cleanly in TypeScript or Python.</li>
        <li>Fri: revisit one pattern from 2 weeks ago — spaced repetition matters more than the headline number.</li>
        <li>Weekend: 1 medium + 1 hard from this week&apos;s pattern.</li>
      </ul>
      <p>
        Use ProdMatch&apos;s <Link href="/dsa/patterns">pattern roadmap</Link>{" "}
        — TypeScript / Python / Java solutions with common-mistake callouts
        per problem.
      </p>

      <h3>Month 5 — System design (only if applying to SDE-2+)</h3>
      <p>
        For 4+ years of experience, system-design rounds matter. Cover the
        canonical scenarios: design a URL shortener, design a rate limiter,
        design a chat / WebSocket service, design a feed (Twitter / Insta),
        design a payment gateway (gold for Razorpay / PhonePe interviews).
        Don&apos;t memorise architecture diagrams — practise reasoning
        out loud through tradeoffs.
      </p>

      <h3>Month 6 — Apply with focus</h3>
      <p>
        Target 25-35 carefully chosen roles across the 18 product
        companies. Customise each application minimally — most companies
        screen on resume + GitHub, not cover letter. Apply through the
        company&apos;s official career page via ProdMatch&apos;s direct
        links — never through aggregator middlemen.
      </p>
      <p>
        Expect: 8-12 recruiter screens out of 30 applications. 4-6 progress
        to technical rounds. 1-2 offers. This is the funnel.
      </p>

      <h2>Common traps to avoid</h2>
      <ul>
        <li>
          <strong>Spray-applying.</strong> 200 generic applications gets you 200 ignored emails. 30 targeted ones get you 10 screens.
        </li>
        <li>
          <strong>Lying about your level.</strong> Senior backend engineer at TCS ≠ Senior backend engineer at Razorpay. Apply one level lower if you&apos;re unsure — better to be over-levelled at interview than under-prepared.
        </li>
        <li>
          <strong>Ignoring the DSA bar.</strong> Even if your services experience is product-shaped, product companies will gate on DSA.
        </li>
        <li>
          <strong>Burnout interviewing.</strong> Cluster your loops into a 6-8 week window. Avoid 6+ months of constant interviewing — fatigue kills performance.
        </li>
      </ul>

      <h2>What to expect inside a product company after you land</h2>
      <ul>
        <li>Stronger ownership: you own services / features, not tickets.</li>
        <li>Direct user impact: most teams see usage dashboards daily.</li>
        <li>Steeper learning curve in months 1-3: catch up on system internals you may not have touched before.</li>
        <li>Better comp (1.5×-3× services-company TCTC, often more at FAANG).</li>
        <li>More cultural autonomy: less BAU process, more &quot;build it&quot; mode.</li>
      </ul>

      <p>
        ProdMatch is built for exactly this transition. Free, India-first, no
        recruiter spam, every application routes through the company&apos;s
        official career page.
      </p>
    </>
  );
}
