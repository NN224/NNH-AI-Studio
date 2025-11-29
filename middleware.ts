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
  // 5. Handle i18n routing
  // -------------------------------------------------------------------------
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale: "en",
  });

  const i18nResponse = handleI18nRouting(request);

  // Apply security headers to i18n response as well
  if (i18nResponse) {
    applySecurityHeaders(i18nResponse);
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
  const locale = pathname.split("/")[1] || "en";

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
  ];

  const isProtectedRoute = protectedPaths.some((path) =>
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
