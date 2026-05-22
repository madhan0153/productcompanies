import Link from "next/link";
import { JsonLd, faqJsonLd } from "@/lib/seo/json-ld";

export function AiResumeMatcherComparison() {
  const faq = [
    {
      question: "What is the best AI resume matcher for product-based company jobs in India?",
      answer: "An AI resume matcher worth using has four properties: (1) it sources jobs only from official company career pages, not aggregator feeds; (2) it produces an explainable Fit Card with strengths, gaps, and a calibrated score — not just a keyword-match number; (3) it understands India-specific signals (LPA, hubs, role function taxonomy); (4) it does not sell or share your resume data. ProdMatch.ai is built specifically for this use case for India's 18 verified product companies.",
    },
    {
      question: "How does ProdMatch's AI matching actually work?",
      answer: "ProdMatch parses your resume into structured signals (role function, years, tech stack, projects, products built) and ranks every active job against four scoring axes: semantic match (40%), tech-stack coverage (25%), role-function alignment (21%), and experience band (14%). Calibrated bands surface as Priority (≥60), Explore (40-59), and Filtered (<40 or hard-cap reason). Top matches get an LLM-generated Fit Card with strengths, gaps, and reasoning.",
    },
    {
      question: "Are AI resume matchers safe — do they sell my resume?",
      answer: "Some do. ProdMatch is DPDP Act 2023 compliant from day one: granular per-purpose consent (account, AI matching, digest emails, analytics), resume stored in a private RLS-protected bucket, never used for model training, never shared with the 18 companies tracked, one-click full erasure, append-only audit log. Always check the privacy policy of any tool before uploading a resume.",
    },
    {
      question: "Do free AI resume matchers work as well as paid ones?",
      answer: "For Indian product-company matching specifically, yes. The matching quality is bounded by data sources (official career pages vs. aggregator feeds) and matching transparency (explainable Fit Card vs. opaque score), not by whether you pay. ProdMatch is free for candidates with no premium tier.",
    },
    {
      question: "Can AI resume matchers replace recruiters in 2026?",
      answer: "Partially. They replace the discovery + match step. They don't replace the recruiter's role in negotiation, relationship-building, or insider-context on team fit. A typical hire today involves both: AI matching for discovery, recruiter conversation for context.",
    },
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <h2>What an AI resume matcher actually does</h2>
      <p>
        An AI resume matcher takes your resume and a set of job descriptions
        and produces a ranked list of matches. The interesting question is{" "}
        <em>how</em>. The good matchers reason structurally; the bad ones
        do keyword overlap with extra steps.
      </p>
      <p>
        For Indian product-company job-seekers, four properties separate
        useful tools from theatre:
      </p>
      <ol>
        <li>
          <strong>Source quality.</strong> Listings sourced from
          aggregators (Naukri, LinkedIn) can be days or weeks stale, or
          ghost roles posted by recruiters with no real opening. Listings
          sourced from <em>official career pages</em> are by definition
          current.
        </li>
        <li>
          <strong>Explainability.</strong> A score of 73 without a reason
          is useless. A Fit Card showing &quot;strong: distributed
          systems, Python; gap: no production ML deployments; reasoning:
          your microservices work maps to their backend stack, but the
          team prefers prior ML deployment experience for the Sr ML
          Engineer role&quot; is actionable.
        </li>
        <li>
          <strong>India-specific signals.</strong> LPA bands, hub
          preferences (Bengaluru / Hyderabad / Pune / etc.), role-function
          taxonomy that matches Indian product-co conventions. Tools built
          for the US market miss these.
        </li>
        <li>
          <strong>Data handling.</strong> DPDP Act 2023 compliance with
          per-purpose consent, owner-scoped storage, no resume-training
          use, no third-party sharing. Some matchers&apos; business model
          is recruiter access — you become the product.
        </li>
      </ol>

      <h2>How ProdMatch&apos;s matching scores work</h2>
      <p>
        Four axes, weighted:
      </p>
      <ul>
        <li><strong>Semantic match (40%)</strong>: embedding-space cosine similarity between your resume and the JD. Anchors the score in &quot;does the work overlap?&quot;</li>
        <li><strong>Tech-stack coverage (25%)</strong>: explicit Jaccard-like coverage of the JD&apos;s required skills against your declared stack.</li>
        <li><strong>Role-function alignment (21%)</strong>: backend vs frontend vs data-engineering vs ML — strict normalisation across resume and JD.</li>
        <li><strong>Experience band (14%)</strong>: years of experience vs JD&apos;s expected band, with adjacency tolerance.</li>
      </ul>
      <p>
        Bands map to <strong>Priority (≥ 60)</strong>, <strong>Explore (40–59)</strong>,
        and <strong>Filtered (&lt; 40 or hard-cap reason)</strong>. The
        hard-cap reasons are explicit and surface in the UI — e.g.{" "}
        <em>role_signal_conflict</em>, <em>thin_jd</em>,{" "}
        <em>no_stack</em>. No mystery scores.
      </p>

      <h2>What ProdMatch does differently vs. generic AI matchers</h2>
      <ul>
        <li><strong>18-company narrowness.</strong> No services. No staffing. No FAANG-aspirant scams.</li>
        <li><strong>Daily crawl from official career pages</strong> — every role stamped with last-seen-at.</li>
        <li><strong>Fit Card for the top-25 matches</strong>, LLM-generated, with strengths and gaps.</li>
        <li><strong>Project Translator</strong> rewrites services-company-style bullets into product-company language. (See <Link href="/profile/resume">profile editor</Link>.)</li>
        <li><strong>DSA roadmap</strong> tuned to product-company patterns. (<Link href="/dsa/patterns">17 patterns</Link>.)</li>
        <li><strong>DPDP Act 2023 compliant</strong>. Per-purpose consent, full export, one-click erasure.</li>
      </ul>

      <h2>How to evaluate any AI resume matcher</h2>
      <p>Run these tests before trusting any tool:</p>
      <ol>
        <li>Upload a resume. Does it parse role function correctly?</li>
        <li>Check the top-3 matches. Can you click through to the company&apos;s <em>official</em> apply URL?</li>
        <li>Read the explanation. Does it cite specific resume + JD facts, or hand-wave?</li>
        <li>Read the privacy policy. Is the resume ever shared without your explicit consent?</li>
        <li>Check freshness. When was each listing last verified?</li>
      </ol>

      <h2>How to use ProdMatch</h2>
      <ol>
        <li><Link href="/auth/login">Sign in</Link> with email or Google (free, no credit card).</li>
        <li>Upload your resume PDF (5 MB max, 12 pages max).</li>
        <li>Within 60 seconds, ProdMatch ranks every active role at 18 product companies against your profile.</li>
        <li>Browse Priority / Explore / Filtered tabs. Open Fit Card on any role for the strengths / gaps breakdown.</li>
        <li>Apply directly via the official career page link.</li>
      </ol>

      <p>
        Compare ProdMatch directly against other Indian job platforms on the
        {" "}<Link href="/compare">comparison page</Link>.
      </p>
    </>
  );
}
