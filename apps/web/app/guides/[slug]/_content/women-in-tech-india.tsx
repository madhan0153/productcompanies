import Link from "next/link";
import { JsonLd, faqJsonLd } from "@/lib/seo/json-ld";

export function WomenInTechIndia() {
  const faq = [
    {
      question: "Which Indian product companies are best for women engineers in 2026?",
      answer: "On publicly-reported DEI metrics, Microsoft India, Google India, Salesforce India, Atlassian and Razorpay lead — published gender-pay audits, formal returnship programs (Microsoft Returnship, Google Career Reboot, Atlassian Reignite), and engineering-leadership representation. Newer / smaller product cos (CRED, Groww, Zerodha) are improving but typically have fewer structured programs. Across all 51, the statutory 26-week paid maternity leave applies; several companies extend to 30+ weeks.",
    },
    {
      question: "What's the salary gap between men and women at Indian product companies?",
      answer: "Self-reported industry data (Linkedin India, AmbitionBox, Glassdoor) puts the median raw gap at ~14–20% across Indian tech overall. At specific product companies that publish equal-pay audits — Microsoft India, Google India, Salesforce — the controlled gap (adjusting for role + level + tenure) is < 1.5%. Always negotiate at offer time using disclosed comp bands; ProdMatch's salary pages show p25/p50/p75 by company × seniority.",
    },
    {
      question: "Do Indian product companies have returnship programs for women coming back from career breaks?",
      answer: "Yes. The major ones in 2026: Microsoft India Returnship (6-month structured re-entry), Google India Career Reboot, Atlassian Reignite, Salesforce Bring Women Back, Cisco/Razorpay/PhonePe ad-hoc returnship cohorts. Most run 1-2 cohorts per year with applications opening 2-3 months ahead of start dates.",
    },
    {
      question: "What's the maternity leave policy at India's product companies?",
      answer: "All 51 companies meet the Maternity Benefit Act minimum of 26 weeks paid. Several extend it: Google India and Microsoft India offer 26 weeks paid + flexible additional unpaid; Atlassian offers 30 weeks; Razorpay and PhonePe match the statutory minimum with phased return options. Adoption + surrogacy benefits vary.",
    },
    {
      question: "Where can I find women-focused tech communities in India?",
      answer: "Women Who Code Bangalore, Lean In Bangalore, AnitaB.org India, Geek Girls Carrots India, plus Slack communities run by Razorpay (Razorpay Women in Tech), Microsoft India D&I, and Google Women Techmakers. These networks routinely surface referrals + insider context for the application loop.",
    },
  ];

  return (
    <>
      <JsonLd data={faqJsonLd(faq) as Record<string, unknown>} />

      <h2>What this guide is for</h2>
      <p>
        Practical, data-grounded guide for women software engineers
        targeting India&apos;s 51 product-based companies in 2026. Covers
        publicly-reported DEI signals at each major company, the
        application loop, comp negotiation patterns, returnship paths,
        and the communities that actually move referrals.
      </p>

      <h2>The honest assessment</h2>
      <p>
        India&apos;s product-company landscape is not uniform on DEI.
        FAANG-tier offices (Microsoft, Google, Salesforce, Atlassian,
        Apple, Amazon) publish equal-pay audits, run formal returnship
        programs, and disclose engineering-leadership representation.
        India unicorns (Razorpay, PhonePe, Swiggy, Zomato, Flipkart,
        CRED, Groww) are accelerating their programs in 2025-26 but the
        signals are less standardised. ProdMatch tracks publicly-available
        DEI signals where they exist — but does not score companies on
        DEI as a separate dimension.
      </p>

      <h2>By company — what we know publicly (2026)</h2>
      <p>
        These are publicly-reported signals as of mid-2026. Verify the
        latest on each company&apos;s diversity report or annual report
        before applying.
      </p>
      <ul>
        <li>
          <strong>Microsoft India / Google India</strong>: published global equal-pay audits with &lt; 1.5% gap. Formal returnship (Microsoft Returnship, Google Career Reboot). 26-week maternity + flexible extension.
        </li>
        <li>
          <strong>Salesforce India</strong>: ~33% women in workforce globally. Bring Women Back returnship. Equal-pay audit published annually.
        </li>
        <li>
          <strong>Atlassian</strong>: ~37% women globally (lower in tech roles). Reignite returnship cohort 2x / year.
        </li>
        <li>
          <strong>Amazon India / Meta India / Apple India</strong>: corporate DEI reports published; India-specific cuts vary. 26-week maternity standard.
        </li>
        <li>
          <strong>Razorpay, PhonePe</strong>: D&I leaders hired in 2023-24. Returnship cohorts run ad-hoc. Maternity matches statute with phased-return options.
        </li>
        <li>
          <strong>Swiggy, Zomato, Flipkart</strong>: D&I programs published; data on engineering-specific representation is thinner.
        </li>
        <li>
          <strong>CRED, Groww, Zerodha, Nvidia, Oracle, SAP Labs</strong>: standard statutory benefits; smaller-scale structured programs.
        </li>
      </ul>

      <h2>The application path</h2>
      <p>
        The right path is identical to the rest of ProdMatch&apos;s
        canonical advice: <strong>apply directly through each
        company&apos;s official career page</strong> — never through
        aggregators that can sit on resumes or expose you to recruiter
        spam. If you&apos;re returning from a break, look specifically
        for the returnship landing page on each company&apos;s site
        (usually under <em>Careers → Inclusion</em> or <em>Programs</em>).
      </p>

      <h2>Comp negotiation specifics</h2>
      <p>
        Use ProdMatch&apos;s <Link href="/salaries">salary pages</Link>
        for company-specific p25 / p50 / p75 bands. Two patterns matter:
      </p>
      <ul>
        <li>
          <strong>Anchor on p75</strong> when negotiating, not p50.
          Recruiters often open at p25; counter at p75 for your seniority
          and let them meet at p60-65 of the disclosed band.
        </li>
        <li>
          <strong>Always ask about stock + variable in writing</strong>.
          The published base band is only ~60-70% of TC at FAANG-tier.
          ESOPs at India unicorns vary wildly; ask for vesting curve and
          strike-price specifics.
        </li>
      </ul>

      <h2>Returnships — the realistic path back</h2>
      <p>
        If you&apos;re returning from a career break, three things matter:
      </p>
      <ol>
        <li>
          <strong>Target a structured returnship</strong> (Microsoft
          Returnship, Google Career Reboot, Atlassian Reignite, Salesforce
          Bring Women Back). These are designed for 1-5-year-break
          engineers and reduce the negotiation friction substantially.
        </li>
        <li>
          <strong>Refresh DSA over 6-8 weeks before applying</strong> —
          most returnships still include a technical screen. The 17
          patterns in ProdMatch&apos;s{" "}
          <Link href="/dsa/patterns">DSA roadmap</Link> are the right
          coverage.
        </li>
        <li>
          <strong>Lean on community networks</strong> — Women Who Code
          Bangalore, Razorpay Women in Tech, Google Women Techmakers, and
          Microsoft India D&I run referral threads multiple times a year.
        </li>
      </ol>

      <h2>Communities that actually move referrals</h2>
      <ul>
        <li><strong>Women Who Code Bangalore</strong> — monthly meetups, Slack with referral threads.</li>
        <li><strong>Lean In India</strong> — regional circles, mentorship matching.</li>
        <li><strong>AnitaB.org India</strong> — runs the Grace Hopper Celebration India each year (~5K women engineers attend; many product cos sponsor).</li>
        <li><strong>Geek Girls Carrots India</strong> — Bengaluru + Pune + Delhi chapters.</li>
        <li><strong>Company-specific ERGs</strong>: Microsoft Women in Engineering, Google Women Techmakers, Razorpay Women in Tech, PhonePe Pulse (women in product).</li>
      </ul>

      <p>
        ProdMatch is built so the application loop is the same whether
        you&apos;re a fresher, a returning engineer, or a senior IC — the
        51 product companies, the same AI Fit Card, the same direct apply
        link to the company&apos;s own career page.
      </p>
    </>
  );
}
