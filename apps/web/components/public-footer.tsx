// Shared footer for public SEO pages. Dense internal-link footer is
// classic Zomato-style: every page links to every other top-level
// hub + a sample of long-tail children, which spreads PageRank evenly
// across the templated routes.

import Link from "next/link";
import { CRAWLER_META } from "@prodmatch/shared";
import { INDIA_HUBS, hubToSlug } from "@/lib/seo/site";
import { PUBLIC_ROLES } from "@/lib/seo/roles";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Companies
            </h3>
            <ul className="mt-3 space-y-1.5">
              {CRAWLER_META.slice(0, 8).map((c) => (
                <li key={c.slug}>
                  <Link
                    href={`/companies/${c.slug}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/companies" className="text-xs font-medium text-primary hover:underline">
                  See all 18 →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cities
            </h3>
            <ul className="mt-3 space-y-1.5">
              {INDIA_HUBS.map((hub) => (
                <li key={hub}>
                  <Link
                    href={`/cities/${hubToSlug(hub)}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {hub} jobs
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Roles
            </h3>
            <ul className="mt-3 space-y-1.5">
              {PUBLIC_ROLES.slice(0, 8).map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/roles/${r.slug}`}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {r.plural}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/roles" className="text-xs font-medium text-primary hover:underline">
                  All roles →
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              ProdMatch
            </h3>
            <ul className="mt-3 space-y-1.5">
              <li><Link href="/about"   className="text-xs text-muted-foreground hover:text-foreground">About</Link></li>
              <li><Link href="/dsa"     className="text-xs text-muted-foreground hover:text-foreground">DSA practice</Link></li>
              <li><Link href="/privacy" className="text-xs text-muted-foreground hover:text-foreground">Privacy</Link></li>
              <li><Link href="/terms"   className="text-xs text-muted-foreground hover:text-foreground">Terms</Link></li>
              <li><Link href="/auth/login" className="text-xs font-medium text-primary hover:underline">Sign in</Link></li>
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} ProdMatch.ai · Built for India · DPDP Act 2023 compliant ·
          Job data sourced from official company career pages.
        </p>
      </div>
    </footer>
  );
}
