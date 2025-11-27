import { createClient } from "@/lib/supabase/server";
import {
  buildSafeRedirectUrl,
  getSafeBaseUrl,
} from "@/lib/utils/safe-redirect";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const state = requestUrl.searchParams.get("state");
  const baseUrl = getSafeBaseUrl(request);

  // Extract locale from URL path (e.g., /en/auth/callback or /ar/auth/callback)
  const pathSegments = requestUrl.pathname.split("/").filter(Boolean);
  const locale =
    pathSegments[0] && (pathSegments[0] === "en" || pathSegments[0] === "ar")
      ? pathSegments[0]
      : "en";

  // Handle OAuth callback from Google (GMB) - check state FIRST
  // Google OAuth sends both code AND state, so we check state first
  if (state) {
    // GMB OAuth is handled by /api/gmb/oauth-callback directly
    // This route should not be used for GMB OAuth
    // Redirect to the Next.js API route instead
    const gmbRedirectUrl = buildSafeRedirectUrl(
      baseUrl,
      `/api/gmb/oauth-callback${requestUrl.search}`,
    );
    return NextResponse.redirect(gmbRedirectUrl);
  }

  // Handle Supabase auth callback (only code, no state)
  if (code) {
    const supabase = await createClient();

    // Exchange code for session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const errorRedirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${locale}/auth/login`,
        {
          error: error.message,
        },
      );
      return NextResponse.redirect(errorRedirectUrl);
    }

    // Redirect to home with success
    const homeRedirectUrl = buildSafeRedirectUrl(baseUrl, `/${locale}/home`);
    return NextResponse.redirect(homeRedirectUrl);
  }

  const defaultRedirectUrl = buildSafeRedirectUrl(baseUrl, `/${locale}`);
  return NextResponse.redirect(defaultRedirectUrl);
}
