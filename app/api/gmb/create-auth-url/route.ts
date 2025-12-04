import { createAdminClient, createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { gmbLogger } from "@/lib/utils/logger";
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

    // Get returnUrl from request body (where to redirect after OAuth)
    let returnUrl = "/dashboard"; // Default fallback
    try {
      const body = await request.json();
      if (body.returnUrl) {
        returnUrl = body.returnUrl;
      }
    } catch {
      // If no body or invalid JSON, use default
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
      gmbLogger.error(
        "Profile check error during create auth URL",
        profileError instanceof Error
          ? profileError
          : new Error(String(profileError)),
        { userId: user.id },
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

    // ✅ NEW: Check if user has existing active GMB accounts
    const { data: existingAccounts } = await adminClient
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1);

    const hasExistingAccounts = existingAccounts && existingAccounts.length > 0;

    const { error: stateError } = await adminClient
      .from("oauth_states")
      .insert({
        state,
        user_id: user.id,
        provider: "google",
        redirect_uri: returnUrl, // Store where to redirect after OAuth
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

    // ✅ NEW: Use "consent" for re-auth to ensure refresh_token is returned
    // First-time: "select_account" (better UX)
    // Re-auth: "consent" (forces Google to return refresh_token)
    const promptValue = hasExistingAccounts ? "consent" : "select_account";
    authUrl.searchParams.set("prompt", promptValue);

    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("state", state);

    gmbLogger.info("OAuth prompt strategy", {
      userId: user.id,
      hasExistingAccounts,
      promptUsed: promptValue,
      reason: hasExistingAccounts
        ? "Re-auth detected - forcing consent to get refresh_token"
        : "First-time connection - using select_account for better UX",
    });

    const authUrlString = authUrl.toString();

    gmbLogger.warn("Auth URL generated successfully", {
      userId: user.id,
      state,
    });
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
