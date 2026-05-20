// Static metadata about the 18 approved company crawlers.
//
// Lives in @prodmatch/shared so both the crawler package and the web admin
// UI can import it without dragging in Playwright as a dependency. This is
// the single source of truth for "which crawlers have been upgraded to the
// adaptive selector pipeline" + which ingestion strategy each one uses.

/**
 * How the crawler reaches the official career source.
 *
 *   "html-dom"    Playwright navigates and reads the DOM with CSS selectors.
 *                 Vulnerable to selector drift → benefits from the adaptive
 *                 fingerprint fallback + golden HTML fixtures.
 *
 *   "html-regex"  Playwright (or fetch) loads server-rendered HTML and
 *                 extracts via regex over the raw text. Adaptive DOM matching
 *                 does not apply, but golden HTML fixtures still catch
 *                 markup drift in CI.
 *
 *   "api"         Crawler hits a JSON / GraphQL endpoint (or intercepts one
 *                 via Playwright network capture). No DOM selectors → no
 *                 selector drift to recover from. Resilience here is the
 *                 stability of the upstream API contract.
 */
export type CrawlerKind = "html-dom" | "html-regex" | "api";

export interface CrawlerMeta {
  slug: string;
  /** Display name; matches the seeded companies row. */
  name: string;
  /** Ingestion strategy — see CrawlerKind. */
  kind: CrawlerKind;
  /**
   * Adaptive selector + fingerprint fallback wired? Only meaningful for
   * kind === "html-dom". For other kinds we still set this true when the
   * crawler is considered fully wired (so the resilience UI grades it
   * fairly), and the badge in the UI uses `kind` rather than `adaptive`.
   */
  adaptive: boolean;
  /** Golden HTML fixture committed under packages/crawler/__fixtures__/<slug>/. */
  hasFixture: boolean;
}

/**
 * Roll-out matrix. Keep this in lockstep with what each company crawler
 * imports — the resilience UI reads from here, so a missing entry shows
 * up as a low-coverage warning in the admin dashboard.
 *
 * Order matches the seed order in supabase/schema.sql.
 *
 * `adaptive: true` is set automatically for API crawlers (no selector drift
 * is possible by construction). For HTML-DOM crawlers it tracks the
 * resolveAdaptive() wiring in companies/<slug>.ts.
 */
export const CRAWLER_META: readonly CrawlerMeta[] = [
  { slug: "google",     name: "Google",     kind: "html-dom",   adaptive: true,  hasFixture: true  },
  { slug: "microsoft",  name: "Microsoft",  kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "meta",       name: "Meta",       kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "amazon",     name: "Amazon",     kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "apple",      name: "Apple",      kind: "html-dom",   adaptive: true,  hasFixture: true  },
  { slug: "atlassian",  name: "Atlassian",  kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "nvidia",     name: "Nvidia",     kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "oracle",     name: "Oracle",     kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "salesforce", name: "Salesforce", kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "sap-labs",   name: "SAP Labs",   kind: "html-regex", adaptive: true,  hasFixture: false },
  { slug: "razorpay",   name: "Razorpay",   kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "phonepe",    name: "PhonePe",    kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "zerodha",    name: "Zerodha",    kind: "html-dom",   adaptive: true,  hasFixture: true  },
  { slug: "cred",       name: "CRED",       kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "groww",      name: "Groww",      kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "swiggy",     name: "Swiggy",     kind: "api",        adaptive: true,  hasFixture: true  },
  { slug: "zomato",     name: "Zomato",     kind: "html-dom",   adaptive: true,  hasFixture: true  },
  { slug: "flipkart",   name: "Flipkart",   kind: "api",        adaptive: true,  hasFixture: true  },
] as const;

export const CRAWLER_META_BY_SLUG: Readonly<Record<string, CrawlerMeta>> =
  Object.freeze(
    Object.fromEntries(CRAWLER_META.map((m) => [m.slug, m])) as Record<string, CrawlerMeta>,
  );

/** Convenience: only the crawlers where adaptive DOM selectors are meaningful. */
export const HTML_DOM_SLUGS: readonly string[] = CRAWLER_META
  .filter((m) => m.kind === "html-dom")
  .map((m) => m.slug);
