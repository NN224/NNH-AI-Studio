import { logger } from "@/lib/utils/logger";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { locales } from "./i18n";
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  shouldProtectRequest,
} from "./lib/security/csrf";
import {
  getClientIP,
  isSuspiciousRequest,
} from "./lib/security/edge-rate-limit";
import {
  HSTS_HEADER,
  SECURITY_HEADERS,
  generateCSP,
} from "./lib/security/headers";

// ============================================================================
// CSRF Validation Helper
// ============================================================================

/**
 * Validates CSRF token from request headers against cookie.
 * Uses constant-time comparison to prevent timing attacks.
 */
function validateCSRFMiddleware(request: NextRequest): boolean {
  const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
  const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Both must be present
  if (!csrfHeader || !csrfCookie) {
    return false;
  }

  // Constant-time comparison to prevent timing attacks
  if (csrfHeader.length !== csrfCookie.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < csrfHeader.length; i++) {
    result |= csrfHeader.charCodeAt(i) ^ csrfCookie.charCodeAt(i);
  }

  return result === 0;
}

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
  const hostname = request.headers.get("host") || "";

  // -------------------------------------------------------------------------
  // ADMIN SUBDOMAIN HANDLING - STRICT SECURITY
  // -------------------------------------------------------------------------
  // Handle admin.nnh.ae with strict authentication
  if (hostname.startsWith("admin.")) {
    // Force HTTPS in production
    if (
      process.env.NODE_ENV === "production" &&
      request.headers.get("x-forwarded-proto") !== "https"
    ) {
      return NextResponse.redirect(`https://${hostname}${pathname}`);
    }

    // Check if on auth page (with or without locale prefix)
    const isOnAuthPage =
      pathname.includes("/admin/auth") || pathname.endsWith("/auth");
    const isApiRoute = pathname.startsWith("/api/");

    // Redirect to admin auth if not on auth page
    if (!isOnAuthPage && !isApiRoute) {
      // Check for valid admin session
      const adminSession = request.cookies.get("admin_2fa_verified")?.value;
      const sessionTime = request.cookies.get("admin_2fa_time")?.value;

      if (!adminSession || adminSession !== "true" || !sessionTime) {
        return NextResponse.redirect(new URL("/en/admin/auth", request.url));
      }

      // Check session expiry (30 minutes)
      const timeDiff = Date.now() - parseInt(sessionTime);
      if (timeDiff > 30 * 60 * 1000) {
        // Clear expired session
        const response = NextResponse.redirect(
          new URL("/en/admin/auth", request.url),
        );
        response.cookies.delete("admin_2fa_verified");
        response.cookies.delete("admin_2fa_time");
        return response;
      }
    }

    // For admin subdomain, let the request continue to the admin pages
    // The intl middleware will handle locale routing
  }

  // -------------------------------------------------------------------------
  // 1. SECURITY: Block suspicious requests immediately
  // -------------------------------------------------------------------------
  // TEMPORARILY DISABLED - The isSuspiciousRequest function was returning false negatives
  // TODO: Re-enable after proper testing and verification
  /*
  if (isSuspiciousRequest(request)) {
    logger.warn('[Middleware] Blocked suspicious request', {
      ip: getClientIP(request),
      path: pathname,
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString(),
    })

    return new NextResponse('Forbidden', { status: 403 })
  }
  */

  // -------------------------------------------------------------------------
  // 2. RATE LIMITING - DISABLED
  // -------------------------------------------------------------------------
  // Rate limiting removed - causing issues with Redis connectivity
  // Will be re-implemented with proper fallback mechanism
  const _isAdminSubdomain = hostname.startsWith("admin.");
  const _isAdminPath = pathname.startsWith("/admin");

  // -------------------------------------------------------------------------
  // 4. CSRF PROTECTION for state-changing requests
  // -------------------------------------------------------------------------
  // Validate CSRF token for POST, PUT, DELETE, PATCH requests
  // Skip for OAuth callbacks, webhooks (they have their own auth)
  if (shouldProtectRequest(request)) {
    const isValidCSRF = validateCSRFMiddleware(request);

    if (!isValidCSRF) {
      logger.warn("[SECURITY] CSRF validation failed", {
        ip: getClientIP(request),
        path: pathname,
        method: request.method,
        timestamp: new Date().toISOString(),
      });

      return new NextResponse(
        JSON.stringify({ error: "Invalid or missing CSRF token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // -------------------------------------------------------------------------
  // 5. Initialize response with security headers
  // -------------------------------------------------------------------------
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Apply security headers to all responses
  response = applySecurityHeaders(response);

  // -------------------------------------------------------------------------
  // 6. Handle i18n routing (skip for API routes)
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
    "/admin", // Add admin routes to protected paths
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

  // Skip auth check for admin routes on admin subdomain (handled separately above)
  const isAdminRoute = pathname.includes("/admin");
  const skipAuthForAdmin =
    isAdminRoute &&
    (hostname.startsWith("admin.") || pathname.includes("/admin/auth"));

  if (isProtectedRoute && !skipAuthForAdmin) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      // For API routes, return JSON error instead of redirect
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "Unauthorized",
            message: "Authentication required",
            code: "AUTH_REQUIRED",
          }),
          {
            status: 401,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      // Clear any stale session cookies on session expiry
      if (error?.code === "session_expired") {
        logger.warn(
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
        logger.warn(
          "[Middleware] GMB not connected (cookie), redirecting to home",
        );
        const homeUrl = new URL(`/${locale}/home`, request.url);
        homeUrl.searchParams.set("gmb_required", "true");
        return NextResponse.redirect(homeUrl);
      } else {
        // No cookie - allow access, let layout.tsx handle GMB check
        // The dashboard layout will show GMBOnboardingView if not connected
        // This avoids redirect loops and DB calls in middleware
        logger.info(
          "[Middleware] No GMB cookie, allowing access - layout will handle",
        );
        // Don't redirect - the layout.tsx will:
        // 1. Check GMB status via useGMBStatus()
        // 2. Set the cookie for future requests
        // 3. Show GMBOnboardingView if not connected
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
