import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales } from "./i18n";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // 1. Handle i18n first
  const handleI18nRouting = createIntlMiddleware({
    locales,
    defaultLocale: "en",
  });

  const i18nResponse = handleI18nRouting(request);

  // 2. Create Supabase client
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

  // 3. Check auth for protected routes
  const pathname = request.nextUrl.pathname;
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
      const loginUrl = new URL(`/${locale}/auth/login`, request.url);
      loginUrl.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Redirect authenticated users away from auth pages
  const authPaths = ["/auth/login", "/auth/signup"];
  const isAuthRoute = authPaths.some((path) => pathname.includes(path));

  if (isAuthRoute) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.redirect(new URL(`/${locale}/home`, request.url));
    }
  }

  return i18nResponse || response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|manifest\\.webmanifest|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
  runtime: "nodejs",
};
