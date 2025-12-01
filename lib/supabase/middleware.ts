import { authLogger } from "@/lib/utils/logger";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
  response?: NextResponse,
) {
  let supabaseResponse =
    response ||
    NextResponse.next({
      request,
    });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const pathnameWithoutLocale = pathname.replace(/^\/(en|ar)/, "") || "/";

  const publicRoutes = [
    "/",
    "/privacy",
    "/terms",
    "/about",
    "/contact",
    "/pricing",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathnameWithoutLocale === route,
  );
  const isAuthRoute = pathnameWithoutLocale.startsWith("/auth");

  let user = null;

  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Only log actual errors, not missing sessions (which are expected)
      if (
        !isPublicRoute &&
        !isAuthRoute &&
        error.name !== "AuthSessionMissingError"
      ) {
        authLogger.error(
          "Auth error in middleware",
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      // If session expired or invalid, clear cookies and redirect to login (only for protected routes)
      if (
        error.message?.includes("session") ||
        error.message?.includes("expired") ||
        error.message?.includes("Invalid") ||
        error.message?.includes("refresh_token_not_found") ||
        error.message?.includes("Refresh Token") ||
        error.name === "AuthSessionMissingError"
      ) {
        if (!isPublicRoute && !isAuthRoute) {
          const locale = pathname.match(/^\/(en|ar)/)?.[1] || "en";
          const url = request.nextUrl.clone();
          url.pathname = `/${locale}/auth/login`;
          const response = NextResponse.redirect(url);

          // Clear all auth cookies
          response.cookies.delete("sb-access-token");
          response.cookies.delete("sb-refresh-token");
          response.cookies.delete("sb-auth-token");

          return response;
        }
      }
    }

    user = authUser;
  } catch (error) {
    // Only log critical errors for protected routes
    if (!isPublicRoute && !isAuthRoute) {
      authLogger.error(
        "Middleware authentication error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
    // On any auth error, treat as unauthenticated
    user = null;
  }

  // Get locale from pathname
  const locale = pathname.match(/^\/(en|ar)/)?.[1] || "en";

  // Redirect to login if not authenticated and trying to access protected routes
  if (!user && !isAuthRoute && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/auth/login`;
    const response = NextResponse.redirect(url);

    // Clear all auth cookies
    response.cookies.delete("sb-access-token");
    response.cookies.delete("sb-refresh-token");
    response.cookies.delete("sb-auth-token");

    return response;
  }

  // Redirect to home if authenticated and trying to access auth pages (except signout)
  if (
    user &&
    isAuthRoute &&
    !pathnameWithoutLocale.startsWith("/auth/signout")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/home`;
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
