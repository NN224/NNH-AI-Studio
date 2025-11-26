import { createAdminClient, createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { getBaseUrlDynamic } from "@/lib/utils/get-base-url-dynamic";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPES = [
  "https://www.googleapis.com/auth/business.manage",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "openid", // Added for ID token and better security
];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return handleApiError(
        authError || new Error("User not authenticated"),
        "[Create Auth URL]",
        401,
      );
    }

    // Ensure user has a profile (optional check - profiles table may not be required)
    // This is just a safety check, but since we use auth.users FK, it's not critical
    const { error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError && profileError.code !== "PGRST116") {
      // PGRST116 = no rows returned, which is OK
      console.error(
        "[Create Auth URL] Profile check error:",
        profileError.message,
      );
    }

    // Get OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const baseUrl = getBaseUrlDynamic(request);
    // Ensure consistent redirect_uri between create-auth-url and oauth-callback
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/gmb/oauth-callback`;

    if (!clientId) {
      return handleApiError(
        new Error(
          "Server configuration error: Missing Google OAuth credentials",
        ),
        "[Create Auth URL]",
        500,
      );
    }

    // Ensure redirect_uri doesn't have trailing slash
    const cleanRedirectUri = redirectUri.replace(/\/$/, "");

    // Generate random state for security
    const state = crypto.randomUUID();

    // Calculate expiry time (30 minutes from now)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 30);

    // Save state to database using admin client to bypass RLS
    // (We've already authenticated the user above with getUser())
    const adminClient = createAdminClient();
    const { error: stateError } = await adminClient
      .from("oauth_states")
      .insert({
        state,
        user_id: user.id,
        provider: "google",
        expires_at: expiresAt.toISOString(),
        used: false,
      })
      .select();

    if (stateError) {
      return handleApiError(
        stateError,
        "[Create Auth URL] Failed to save OAuth state",
      );
    }

    // Build OAuth URL
    const authUrl = new URL(GOOGLE_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", cleanRedirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", state);

    const authUrlString = authUrl.toString();

    console.warn("[GMB Create Auth URL] Auth URL generated successfully");
    return NextResponse.json({
      authUrl: authUrlString,
      url: authUrlString, // For backward compatibility
      message:
        "Google OAuth URL created successfully, dashboard refresh triggered",
    });
  } catch (error: unknown) {
    return handleApiError(error, "[Create Auth URL] Unexpected error");
  }
}
