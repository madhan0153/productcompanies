import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { clientEnv } from "@/lib/env";

// Public routes that bypass the auth-redirect. Three categories:
//   - Root marketing + auth + health   (legacy)
//   - SEO templated landing pages      (NEW — companies/cities/roles/listings)
//   - Content / legal pages            (NEW — about/privacy/terms/guides)
// Match uses exact equality OR prefix-with-slash so deep children share the
// rule. Order doesn't matter — middleware does a single pass.
const PUBLIC_PATHS = ["/", "/auth/login", "/auth/callback", "/api/health"];
const PUBLIC_PREFIXES = [
  "/companies",
  "/cities",
  "/roles",
  "/listings",
  "/about",
  "/privacy",
  "/terms",
  "/guides",
  "/dsa",              // DSA practice — public read, sign-in only for tracking
  "/sitemap",          // /sitemap.xml is served at /sitemap
  "/robots",           // /robots.txt
  "/llms",             // /llms.txt and /llms-full.txt
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p)) return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

// Best-effort per-instance rate limiter — module-level Map persists per Edge worker.
// Not distributed, but effective deterrence against simple abuse.
const rl = new Map<string, { n: number; resetAt: number }>();

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  // Prune stale entries to prevent unbounded growth
  if (rl.size > 10_000) {
    for (const [k, v] of rl) if (now > v.resetAt) rl.delete(k);
  }
  const rec = rl.get(key);
  if (!rec || now > rec.resetAt) {
    rl.set(key, { n: 1, resetAt: now + windowMs });
    return false;
  }
  if (rec.n >= max) return true;
  rec.n++;
  return false;
}

export async function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const { pathname } = request.nextUrl;

  // 15 requests/min per IP on all auth routes (magic link / OAuth / callback)
  if (pathname.startsWith("/auth/")) {
    if (isRateLimited(`auth:${ip}`, 15, 60_000)) {
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "60" },
      });
    }
  }

  // 5 requests/10 min per IP on the data-export endpoint
  if (pathname === "/api/export") {
    if (isRateLimited(`export:${ip}`, 5, 600_000)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again in 10 minutes." },
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }
  }

  // QA fix (B1): API routes and the health endpoint authenticate themselves.
  // Calling supabase.auth.getUser() in middleware on every /api/* request
  // burned an Auth round-trip per cold start with no benefit. Short-circuit
  // here so the rest of the auth + consent dance only fires on real page
  // navigations.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  // Expose the pathname to server components via a request header so layouts
  // can branch on the route (e.g. (app)/layout.tsx skipping its auth-redirect
  // for public DSA paths nested inside the route group).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-prodmatch-pathname", pathname);

  let supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    clientEnv.NEXT_PUBLIC_SUPABASE_URL,
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request: { headers: requestHeaders } });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session (keeps cookie alive)
  const { data: { user } } = await supabase.auth.getUser();

  // /api/* already short-circuited above — only page paths reach here.
  const isPublic = isPublicPath(pathname);

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages — honour ?next= so a
  // mid-session re-auth (e.g. magic-link from another device) returns the
  // user to where they were trying to go.
  if (user && pathname.startsWith("/auth/login")) {
    const url = request.nextUrl.clone();
    const next = request.nextUrl.searchParams.get("next");
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
    url.pathname = safeNext;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users who haven't completed the consent flow.
  // We only check on protected app routes (not on /consent itself, not on API routes,
  // not on public routes, not on /auth/*) to avoid infinite redirect loops.
  const isConsentable =
    user &&
    !pathname.startsWith("/consent") &&
    !pathname.startsWith("/auth/") &&
    !isPublicPath(pathname);

  if (isConsentable) {
    // Lightweight check: look for the mandatory 'account' consent row.
    // We use the anon client here (already created above) — the user is authed
    // so RLS allows the select on their own consents row.
    const { data: consentRow } = await supabase
      .from("consents")
      .select("granted")
      .eq("user_id", user.id)
      .eq("purpose", "account")
      .eq("granted", true)
      .maybeSingle();

    if (!consentRow) {
      const url = request.nextUrl.clone();
      url.pathname = "/consent";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
