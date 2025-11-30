import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales } from "./i18n";
import {
  applyEdgeRateLimit,
  checkEdgeRateLimit,
  createRateLimitResponse,
  getClientIP,
  getDynamicRateLimit,
  isSuspiciousRequest,
} from "./lib/security/edge-rate-limit";
import {
  HSTS_HEADER,
  SECURITY_HEADERS,
  generateCSP,
} from "./lib/security/headers";

// ============================================================================
// Security Headers
// ============================================================================

function applySecurityHeaders(response: NextResponse): NextResponse {
  // Apply basic security headers
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    if (value) {
      response.headers.set(key, value);
    }
  });

  // Apply HSTS in production
  if (process.env.NODE_ENV === "production") {
    Object.entries(HSTS_HEADER).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
  }

  // Apply CSP
  response.headers.set("Content-Security-Policy", generateCSP());

  return response;
}

// ============================================================================
// Main Middleware
// ============================================================================

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // -------------------------------------------------------------------------
  // 1. SECURITY: Block suspicious requests immediately
  // -------------------------------------------------------------------------
  if (isSuspiciousRequest(request)) {
    console.warn("[Middleware] Blocked suspicious request:", {
      ip: getClientIP(request),
      path: pathname,
      userAgent: request.headers.get("user-agent"),
      timestamp: new Date().toISOString(),
    });

    return new NextResponse("Forbidden", { status: 403 });
  }

  // -------------------------------------------------------------------------
  // 2. SECURITY: Edge-level rate limiting (DDoS protection)
  // -------------------------------------------------------------------------
  const rateLimitConfig = getDynamicRateLimit(request);
  const rateLimitResponse = applyEdgeRateLimit(request, rateLimitConfig);

  if (rateLimitResponse) {
    console.warn("[Middleware] Rate limit exceeded:", {
      ip: getClientIP(request),
      path: pathname,
      timestamp: new Date().toISOString(),
    });
    return rateLimitResponse;
  }

  // -------------------------------------------------------------------------
  // 3. Additional rate limiting for API routes
  // -------------------------------------------------------------------------
  if (pathname.startsWith("/api/")) {
    // Stricter rate limit for API endpoints
    const ip = getClientIP(request);
    const apiResult = checkEdgeRateLimit(`api:${ip}`, 200, 60); // 200 req/min for APIs

    if (!apiResult.success) {
      return createRateLimitResponse(apiResult);
    }
  }

  // -------------------------------------------------------------------------
  // 4. Initialize response with security headers
  // -------------------------------------------------------------------------
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apply security headers to all responses
  response = applySecurityHeaders(response);

  // -------------------------------------------------------------------------
  // 5. Handle i18n routing (skip for API routes)
  // -------------------------------------------------------------------------
  let i18nResponse: NextResponse | undefined;

  // Skip i18n for API routes, sentry pages, and other non-page routes
  const skipI18nPaths = [
    "/api/",
    "/sentry-example-page",
    "/monitoring",
    "/_next/",
    "/favicon",
    "/manifest",
    "/sitemap",
    "/robots",
  ];

  const shouldSkipI18n = skipI18nPaths.some((path) =>
    pathname.startsWith(path),
  );

  if (!shouldSkipI18n) {
    const handleI18nRouting = createIntlMiddleware({
      locales,
      defaultLocale: "en",
    });

    i18nResponse = handleI18nRouting(request);

    // Apply security headers to i18n response as well
    if (i18nResponse) {
      applySecurityHeaders(i18nResponse);
    }
  }

  // Create Supabase client for auth checks
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // -------------------------------------------------------------------------
  // 6. Check auth for protected routes
  // -------------------------------------------------------------------------
  const pathSegments = pathname.split("/");
  const potentialLocale = pathSegments[1];
  const locale = (locales as readonly string[]).includes(potentialLocale)
    ? potentialLocale
    : "en";

  // Check if this is the root page (/ or /[locale])
  const isRootPage =
    pathname === "/" ||
    (pathSegments.length === 2 &&
      (locales as readonly string[]).includes(potentialLocale));

  // Redirect authenticated users from root to /home
  if (isRootPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const homeUrl = new URL(`/${locale}/home`, request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // Routes that require authentication
  const protectedPaths = [
    "/dashboard",
    "/reviews",
    "/questions",
    "/posts",
    "/settings",
    "/metrics",
    "/media",
    "/locations",
    "/youtube-dashboard",
    "/home",
    "/owner-diagnostics",
    "/sync-diagnostics",
    "/sync-progress",
    "/analytics",
    "/automation",
    "/products",
    "/features",
    "/gmb-posts",
  ];

  // Routes that REQUIRE GMB connection (subset of protected routes)
  // Users without GMB connection will be redirected to /home
  const gmbRequiredPaths = [
    "/dashboard",
    "/reviews",
    "/questions",
    "/posts",
    "/media",
    "/locations",
    "/analytics",
    "/automation",
    "/products",
    "/features",
    "/gmb-posts",
  ];

  // Routes that are allowed WITHOUT GMB connection (for documentation)
  // These are implicitly exempt since they're not in gmbRequiredPaths
  const _gmbExemptPaths = [
    "/home",
    "/settings",
    "/youtube-dashboard",
    "/sync-progress",
    "/sync-diagnostics",
    "/owner-diagnostics",
    "/metrics",
  ];

  const isProtectedRoute = protectedPaths.some((path) =>
    pathname.includes(path),
  );

  const isGmbRequiredRoute = gmbRequiredPaths.some((path) =>
    pathname.includes(path),
  );

  if (isProtectedRoute) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // Clear any stale session cookies on session expiry
      if (error?.code === "session_expired") {
        console.warn(
          "[Middleware] Session expired, clearing cookies and redirecting to login",
        );
      }
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirectedFrom", pathname);
      if (error?.code === "session_expired") {
        loginUrl.searchParams.set("error", "session_expired");
      }
      // Validate redirect URL to prevent open redirect attacks
      if (loginUrl.origin === new URL(request.url).origin) {
        return NextResponse.redirect(loginUrl);
      }
      // Fallback to safe redirect if URL validation fails
      return NextResponse.redirect(
        new URL(`/${locale}/auth/login`, request.url),
      );
    }

    // -------------------------------------------------------------------------
    // 6b. GMB Connection Check for GMB-required routes
    // -------------------------------------------------------------------------
    // Use cookie-based check first for performance (no DB query)
    // Cookie is set by the OAuth callback and dashboard layout
    if (isGmbRequiredRoute) {
      const gmbConnectedCookie = request.cookies.get("gmb_connected")?.value;

      // If cookie says connected, trust it (fast path)
      if (gmbConnectedCookie === "true") {
        // User has GMB connection, allow access
      } else if (gmbConnectedCookie === "false") {
        // Cookie explicitly says not connected, redirect to home
        console.warn(
          "[Middleware] GMB not connected (cookie), redirecting to home",
        );
        const homeUrl = new URL(`/${locale}/home`, request.url);
        homeUrl.searchParams.set("gmb_required", "true");
        return NextResponse.redirect(homeUrl);
      } else {
        // No cookie - need to check DB (slower path, but only happens once)
        // This sets the cookie for future requests
        try {
          const { count, error: gmbError } = await supabase
            .from("gmb_accounts")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_active", true);

          const hasGmbConnection = !gmbError && (count || 0) > 0;

          // Set cookie for future requests (expires in 1 hour)
          response.cookies.set(
            "gmb_connected",
            hasGmbConnection ? "true" : "false",
            {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 3600, // 1 hour
              path: "/",
            },
          );

          if (!hasGmbConnection) {
            console.warn(
              "[Middleware] GMB not connected (DB check), redirecting to home",
            );
            const homeUrl = new URL(`/${locale}/home`, request.url);
            homeUrl.searchParams.set("gmb_required", "true");

            // Create redirect response with the cookie
            const redirectResponse = NextResponse.redirect(homeUrl);
            redirectResponse.cookies.set("gmb_connected", "false", {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 3600,
              path: "/",
            });
            return redirectResponse;
          }
        } catch (dbError) {
          // On DB error, allow access but log warning
          console.error("[Middleware] GMB check failed:", dbError);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // 7. Redirect authenticated users away from auth pages
  // -------------------------------------------------------------------------
  const authPaths = ["/auth/login", "/auth/signup"];
  const isAuthRoute = authPaths.some((path) => pathname.includes(path));

  if (isAuthRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Safe redirect to home page (same origin)
      const homeUrl = new URL(`/${locale}/home`, request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return i18nResponse || response;
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    // Also match API routes for rate limiting
    "/api/:path*",
  ],
  runtime: "nodejs",
};
