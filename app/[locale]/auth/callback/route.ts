import { createClient, createAdminClient } from "@/lib/supabase/server";
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
    const { data: sessionData, error } =
      await supabase.auth.exchangeCodeForSession(code);

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

    // Check if user has any connected accounts
    const userId = sessionData.user?.id;

    if (userId) {
      const adminClient = createAdminClient();

      const [
        { count: locationsCount },
        { data: youtubeToken },
        { data: profile },
      ] = await Promise.all([
        // Check for LOCATIONS (not accounts!) - means user completed full flow
        adminClient
          .from("gmb_locations")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_active", true),
        adminClient
          .from("oauth_tokens")
          .select("id")
          .eq("user_id", userId)
          .eq("provider", "youtube")
          .maybeSingle(),
        adminClient
          .from("profiles")
          .select("onboarding_completed")
          .eq("id", userId)
          .maybeSingle(),
      ]);

      const hasLocations = (locationsCount || 0) > 0;
      const hasYouTube = !!youtubeToken;
      const onboardingCompleted = profile?.onboarding_completed || false;

      // If user has no locations and hasn't completed onboarding, redirect to onboarding
      if (!hasLocations && !hasYouTube && !onboardingCompleted) {
        const onboardingRedirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${locale}/onboarding`,
        );
        return NextResponse.redirect(onboardingRedirectUrl);
      }
    }

    // User has accounts or completed onboarding, redirect to home
    const homeRedirectUrl = buildSafeRedirectUrl(baseUrl, `/${locale}/home`);
    return NextResponse.redirect(homeRedirectUrl);
  }

  const defaultRedirectUrl = buildSafeRedirectUrl(baseUrl, `/${locale}`);
  return NextResponse.redirect(defaultRedirectUrl);
}
