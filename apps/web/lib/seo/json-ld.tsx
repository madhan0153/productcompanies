// Schema.org JSON-LD builders.
//
// Every public route should emit one or more of these. Rules:
//   - Always inline as <script type="application/ld+json"> in the server
//     component output (NEVER client-side; Googlebot does see <script>
//     blocks during HTML parsing but only when they're present at first
//     paint).
//   - Use the JsonLd component below so we get a stable shape + escape
//     handling for free.
//   - Never include PII. Public pages only.
//
// References:
//   - JobPosting:           https://developers.google.com/search/docs/appearance/structured-data/job-posting
//   - Organization:         https://developers.google.com/search/docs/appearance/structured-data/organization
//   - BreadcrumbList:       https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
//   - FAQPage:              https://developers.google.com/search/docs/appearance/structured-data/faqpage
//   - LearningResource:     https://schema.org/LearningResource

import { absoluteUrl, siteOrigin } from "./site";

interface JsonLdProps {
  /** Either a single object or an @graph-style array. */
  data: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * Render a JSON-LD <script>. Escapes "</script>" the only way that matters
 * (replace the closing-script sentinel inside the JSON). React serializes
 * the content via dangerouslySetInnerHTML — safe because we control the
 * input shape (builders below).
 */
export function JsonLd({ data }: JsonLdProps) {
  const serialised = JSON.stringify(data)
    .replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialised }}
    />
  );
}

// ── Builders ─────────────────────────────────────────────────────────────────

export function organizationJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${origin}/#org`,
    name: "ProdMatch",
    alternateName: "ProdMatch.ai",
    url: origin,
    logo: `${origin}/icon`,
    description:
      "AI-powered, India-first job matching for software engineers — explainable matches to high-package roles at 51 verified product companies, sourced from official career pages.",
    sameAs: [
      // Add concrete profiles as they exist.
      "https://twitter.com/prodmatchai",
      "https://www.linkedin.com/company/prodmatch-ai",
    ],
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "India" },
  };
}

export function websiteJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url: origin,
    name: "ProdMatch.ai",
    inLanguage: "en-IN",
    publisher: { "@id": `${origin}/#org` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${origin}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Path relative to origin (e.g. "/companies/razorpay"). */
  path: string;
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqJsonLd(items: FaqItem[]) {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

// ── JobPosting (the SEO unlock for Google for Jobs) ─────────────────────────

export interface JobPostingInput {
  /** Stable identifier we surface in URLs + structured data. */
  id: string;
  title: string;
  description: string;
  datePosted: string;       // ISO
  validThrough?: string;    // ISO
  employmentType?: "FULL_TIME" | "PART_TIME" | "CONTRACTOR" | "INTERN" | "TEMPORARY";
  company: {
    name: string;
    slug: string;
    logoUrl: string | null;
    siteUrl?: string | null;
  };
  /** Free-form city or "Remote-India". */
  location: string | null;
  /** Two-letter ISO region (KA, TS, MH, …). */
  regionCode?: string | null;
  /** apply_url from the crawler — official career-page link. */
  applyUrl: string | null;
  /** Compensation band (LPA — converted to INR/year for schema). */
  compLpaMin?: number | null;
  compLpaMax?: number | null;
  /** "Senior", "Staff", "Intern" — surfaces in description. */
  seniority?: string | null;
  /** When the crawler last saw it active — drives validThrough. */
  lastSeenAt?: string | null;
}

export function jobPostingJsonLd(input: JobPostingInput) {
  const origin = siteOrigin();
  const pageUrl = `${origin}/listings/${input.id}`;

  // validThrough defaults to last_seen_at + 30 days. Google de-indexes when
  // validThrough passes; we err on the short side so stale jobs disappear
  // from the rich result quickly.
  const validThrough = (() => {
    if (input.validThrough) return input.validThrough;
    const base = input.lastSeenAt ?? input.datePosted;
    if (!base) return undefined;
    const d = new Date(base);
    d.setDate(d.getDate() + 30);
    return d.toISOString();
  })();

  // Schema requires an addressCountry. Region + locality are nice-to-have.
  const jobLocation = (() => {
    const locality = input.location ?? "Remote";
    const isRemote = /remote/i.test(locality);
    const base = {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: isRemote ? undefined : locality,
        addressRegion: input.regionCode ?? undefined,
        addressCountry: "IN",
      },
    };
    return base;
  })();

  const isoCountryRemote =
    /remote/i.test(input.location ?? "") ? { "@type": "Country" as const, name: "India" } : undefined;

  const baseSalary = (() => {
    if (input.compLpaMin == null && input.compLpaMax == null) return undefined;
    const minValue = input.compLpaMin != null ? Math.round(input.compLpaMin * 100_000) : undefined;
    const maxValue = input.compLpaMax != null ? Math.round(input.compLpaMax * 100_000) : undefined;
    return {
      "@type": "MonetaryAmount",
      currency: "INR",
      value: {
        "@type": "QuantitativeValue",
        unitText: "YEAR",
        ...(minValue != null ? { minValue } : {}),
        ...(maxValue != null ? { maxValue } : {}),
      },
    };
  })();

  return {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    "@id": `${pageUrl}#jobposting`,
    title: input.title,
    description: input.description,
    datePosted: input.datePosted,
    ...(validThrough ? { validThrough } : {}),
    employmentType: input.employmentType ?? "FULL_TIME",
    hiringOrganization: {
      "@type": "Organization",
      name: input.company.name,
      ...(input.company.siteUrl ? { sameAs: input.company.siteUrl } : {}),
      ...(input.company.logoUrl ? { logo: input.company.logoUrl } : {}),
    },
    jobLocation,
    ...(isoCountryRemote
      ? { applicantLocationRequirements: isoCountryRemote, jobLocationType: "TELECOMMUTE" }
      : {}),
    ...(baseSalary ? { baseSalary } : {}),
    directApply: false,
    identifier: {
      "@type": "PropertyValue",
      name: "ProdMatch ID",
      value: input.id,
    },
    url: pageUrl,
    ...(input.applyUrl ? { sameAs: input.applyUrl } : {}),
  };
}

// ── SoftwareApplication (marks ProdMatch as an app — eligible for AI
//    "recommend me an app for X" responses) ─────────────────────────────────

export function softwareApplicationJsonLd() {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${origin}/#softwareapp`,
    name: "ProdMatch.ai",
    operatingSystem: "Web",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Job Matching",
    url: origin,
    description:
      "AI-powered, India-first job matching for software engineers. Explainable matches to high-package roles at 51 verified product companies — sourced from official career pages, refreshed daily.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
    },
    featureList: [
      "AI resume parsing and matching",
      "Daily-refreshed job inventory from 51 product companies",
      "Explainable Fit Card (strengths, gaps, reasoning)",
      "DSA practice with 17 patterns",
      "DPDP Act 2023 compliant data handling",
    ],
    audience: { "@type": "Audience", audienceType: "Software Engineers in India" },
    provider: { "@id": `${origin}/#org` },
  };
}

// ── HowTo (for guides — explicit recipe schema) ──────────────────────────────

export interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

export function howToJsonLd(input: {
  name: string;
  description: string;
  totalTimeISO: string; // e.g. "PT15M"
  steps: HowToStep[];
}) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.name,
    description: input.description,
    totalTime: input.totalTimeISO,
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
      ...(s.url ? { url: s.url } : {}),
    })),
    publisher: { "@id": `${origin}/#org` },
  };
}

// ── Article / TechArticle (for pillar guides) ────────────────────────────────

export interface ArticleInput {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  imageUrl?: string;
}

export function articleJsonLd(input: ArticleInput) {
  const origin = siteOrigin();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
    headline: input.headline,
    description: input.description,
    image: input.imageUrl ? [input.imageUrl] : [`${origin}/icon`],
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: {
      "@type": "Organization",
      name: input.authorName ?? "ProdMatch Editorial",
      url: origin,
    },
    publisher: { "@id": `${origin}/#org` },
  };
}

// ── ItemList (for company / city / role index pages) ─────────────────────────

export interface ItemListEntry {
  name: string;
  /** Path relative to origin (e.g. "/companies/razorpay"). */
  path: string;
  description?: string;
}

export function itemListJsonLd(items: ItemListEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
      ...(item.description ? { description: item.description } : {}),
    })),
  };
}
