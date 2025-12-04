/**
 * GMB OAuth Callback Handler
 *
 * This handler exchanges the OAuth code for tokens and saves the GMB account.
 * It does NOT fetch or save locations - that happens in the "Select-Then-Import" flow.
 *
 * Security Note: All redirects in this file use buildSafeRedirectUrl() which validates
 * URLs against an allowlist of trusted domains (see lib/utils/safe-redirect.ts).
 * Static analyzers may flag these as "open redirect" vulnerabilities, but they are
 * false positives - the URLs are validated before redirect.
 */
import { invalidateGMBCache } from "@/lib/cache/gmb-cache";
import { logAction } from "@/lib/monitoring/audit";
import { encryptToken, resolveTokenValue } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/api-error-handler";
import { gmbLogger } from "@/lib/utils/logger";
import {
  buildSafeRedirectUrl,
  getSafeBaseUrl,
} from "@/lib/utils/safe-redirect";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GMB_ACCOUNTS_URL =
  "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";

/**
 * Extract error message from various error types (Error, PostgrestError, unknown)
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return "Unknown error";
  }
}

export async function GET(request: NextRequest) {
  gmbLogger.info("Processing OAuth callback");

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    // Determine locale from cookie (fallback to 'en')
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value || "en";

    if (error) {
      gmbLogger.error("OAuth error from provider", new Error(error));
      const baseUrl = getSafeBaseUrl(request);
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: `OAuth error: ${error}`,
          error_code: "oauth_error",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Validate parameters
    if (!code || !state) {
      gmbLogger.error(
        "Missing code or state in OAuth callback",
        new Error("Missing parameters"),
      );
      const baseUrl = getSafeBaseUrl(request);
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Missing authorization code or state",
          error_code: "missing_params",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    gmbLogger.info("OAuth callback state received", { state });

    // Use admin client throughout to avoid reliance on browser session cookies.
    // OAuth callback can arrive without a valid Supabase session cookie due to
    // cross-site redirects or SameSite policies, so we must bypass RLS safely
    // using the server role. We still derive user_id from the validated state.
    const adminClient = createAdminClient();

    // Verify state and get user ID
    const { data: stateRecord, error: stateError } = await adminClient
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !stateRecord) {
      gmbLogger.error(
        "Invalid OAuth state",
        new Error(getErrorMessage(stateError)),
      );
      const baseUrl = getSafeBaseUrl(request);
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Invalid or expired authorization state",
          error_code: "invalid_state",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Check if state has expired (30 minute expiry)
    const expiresAt = new Date(stateRecord.expires_at);
    if (expiresAt < new Date()) {
      gmbLogger.error("OAuth state has expired", new Error("Expired state"));
      const baseUrl = getSafeBaseUrl(request);
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Authorization state has expired",
          error_code: "expired_state",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Mark state as used
    await adminClient
      .from("oauth_states")
      .update({ used: true })
      .eq("state", state);

    const userId = stateRecord.user_id;
    gmbLogger.info("User ID from OAuth state", { userId });

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = getSafeBaseUrl(request);
    // Ensure consistent redirect_uri - must match create-auth-url exactly
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/gmb/oauth-callback`;

    if (!clientId || !clientSecret) {
      gmbLogger.error(
        "Missing Google OAuth configuration",
        new Error("Missing credentials"),
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Server configuration error",
          error_code: "server_config_error",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Ensure redirect_uri doesn't have trailing slash (must match create-auth-url)
    const cleanRedirectUri = redirectUri.replace(/\/$/, "");
    gmbLogger.info("Using redirect URI", { redirectUri: cleanRedirectUri });
    // Optional diagnostics to help with www/non-www mismatch
    try {
      const baseHost = new URL(baseUrl).host;
      const redirectHost = new URL(cleanRedirectUri).host;
      const stripW = (h: string) => h.replace(/^www\./, "");
      if (stripW(baseHost) !== stripW(redirectHost)) {
        gmbLogger.warn("Host mismatch between base URL and redirect URI", {
          baseHost,
          redirectHost,
        });
      }
    } catch {
      // ignore URL parsing issues
    }

    gmbLogger.info("Exchanging code for tokens");
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: cleanRedirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      gmbLogger.error(
        "Token exchange failed",
        new Error(`HTTP ${tokenResponse.status}`),
        {
          status: tokenResponse.status,
          errorData: tokenData,
        },
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: `Token exchange failed: ${tokenData.error_description || tokenData.error}`,
          error_code: "token_exchange_failed",
          status: String(tokenResponse.status),
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    gmbLogger.info("Tokens received successfully");

    // Get user info from Google
    gmbLogger.info("Fetching user info from Google");
    const userInfoUrl = new URL(GOOGLE_USERINFO_URL);
    userInfoUrl.searchParams.set("alt", "json");

    const userInfoResponse = await fetch(userInfoUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userInfoResponse.ok) {
      gmbLogger.error(
        "Failed to fetch user info",
        new Error(`HTTP ${userInfoResponse.status}`),
        {
          status: userInfoResponse.status,
        },
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Failed to fetch user information",
          error_code: "userinfo_fetch_failed",
          status: String(userInfoResponse.status),
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    const userInfo = await userInfoResponse.json();
    gmbLogger.info("User info retrieved", {
      email: userInfo.email,
      id: userInfo.id,
    });

    if (!userInfo.email) {
      gmbLogger.error(
        "Google user info did not include an email address",
        new Error("Missing email"),
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Unable to determine Google account email",
          error_code: "userinfo_missing_email",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    const { data: existingProfile, error: profileLookupError } =
      await adminClient
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .maybeSingle();

    if (profileLookupError) {
      gmbLogger.error(
        "Failed to verify profile record",
        new Error(getErrorMessage(profileLookupError)),
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Failed to verify user record",
          error_code: "profile_verify_failed",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    if (!existingProfile) {
      const displayName =
        userInfo.name ||
        [userInfo.given_name, userInfo.family_name].filter(Boolean).join(" ") ||
        userInfo.email.split("@")[0] ||
        "Google User";

      gmbLogger.info("Creating profile record for new user", {
        userId,
        email: userInfo.email,
      });

      const { error: createProfileError } = await adminClient
        .from("profiles")
        .upsert(
          {
            id: userId,
            email: userInfo.email,
            full_name: displayName,
            avatar_url: userInfo.picture ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );

      if (createProfileError) {
        gmbLogger.error(
          "Failed to create profile record",
          new Error(getErrorMessage(createProfileError)),
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error: "Failed to initialize user record",
            error_code: "profile_create_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Calculate token expiry
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setSeconds(
      tokenExpiresAt.getSeconds() + (tokenData.expires_in || 3600),
    );

    // Fetch GMB accounts
    gmbLogger.info("Fetching GMB accounts from Google");
    const gmbAccountsUrl = new URL(GMB_ACCOUNTS_URL);
    gmbAccountsUrl.searchParams.set("alt", "json");

    const gmbAccountsResponse = await fetch(gmbAccountsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!gmbAccountsResponse.ok) {
      const text = await gmbAccountsResponse.text();
      gmbLogger.error(
        "Failed to fetch GMB accounts",
        new Error(`HTTP ${gmbAccountsResponse.status}`),
        {
          status: gmbAccountsResponse.status,
          body_snippet: text.substring(0, 500),
        },
      );
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Failed to fetch Google My Business accounts",
          error_code: "gmb_accounts_fetch_failed",
          status: String(gmbAccountsResponse.status),
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    const gmbAccountsData = await gmbAccountsResponse.json();
    const gmbAccounts = gmbAccountsData.accounts || [];

    gmbLogger.info(`Found ${gmbAccounts.length} GMB accounts`);

    if (gmbAccounts.length === 0) {
      gmbLogger.warn("No GMB accounts found for user");
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "No Google My Business accounts found",
          error_code: "no_gmb_accounts",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Process each GMB account
    let savedAccountId: string | null = null;
    const savedAccountIds: string[] = [];
    let userState: "FIRST_TIME" | "ADDITIONAL_ACCOUNT" | "RE_AUTH" =
      "FIRST_TIME"; // Track user state

    for (const gmbAccount of gmbAccounts) {
      const accountName = gmbAccount.accountName || gmbAccount.name;
      const accountId = gmbAccount.name; // e.g., "accounts/12345"

      gmbLogger.info(`Processing GMB account: ${accountName}`, { accountId });

      // Check if this account is already linked to another user
      const { data: existingAccount } = await adminClient
        .from("gmb_accounts")
        .select("user_id, refresh_token")
        .eq("account_id", accountId)
        .maybeSingle();

      if (existingAccount && existingAccount.user_id !== userId) {
        gmbLogger.error(
          "Security violation: GMB account already linked to different user",
          new Error("Account conflict"),
          {
            accountId,
            existingUserId: existingAccount.user_id,
            requestedUserId: userId,
          },
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error:
              "This Google My Business account is already linked to another user",
            error_code: "account_already_linked",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Try to decrypt existing refresh token, but don't fail if decryption fails
      // (we're getting a new token anyway, so corruption of old token is acceptable)
      let existingRefreshToken: string | null = null;
      if (existingAccount?.refresh_token) {
        try {
          existingRefreshToken = resolveTokenValue(
            existingAccount.refresh_token,
            {
              context: `gmb_accounts.refresh_token:${accountId}`,
            },
          );
        } catch (error) {
          gmbLogger.warn(
            "Failed to decrypt existing refresh token, will use new token",
            {
              accountId,
              error,
            },
          );
          // Continue with null - new refresh_token from OAuth will be used
        }
      }

      // ✅ Determine if this is a re-auth (needed for logging context)
      const { data: existingAccountCheck } = await adminClient
        .from("gmb_accounts")
        .select("id")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .maybeSingle();

      const isReAuth = !!existingAccountCheck;

      let encryptedAccessToken: string;
      let encryptedRefreshToken: string | null = null;

      try {
        encryptedAccessToken = encryptToken(tokenData.access_token);

        // Prioritize new refresh_token, fallback to existing, allow NULL
        const refreshTokenToPersist =
          tokenData.refresh_token || existingRefreshToken || null;

        encryptedRefreshToken = refreshTokenToPersist
          ? encryptToken(refreshTokenToPersist)
          : null;

        // ✅ NEW: Log warning if no refresh_token available
        if (!encryptedRefreshToken) {
          gmbLogger.warn(
            "No refresh_token available - user will need to re-auth when access_token expires",
            {
              accountId,
              userId,
              isReAuth,
              hadExistingRefreshToken: !!existingRefreshToken,
              receivedNewRefreshToken: !!tokenData.refresh_token,
              googleAccountId: accountId,
            },
          );
        } else {
          gmbLogger.info("Refresh token successfully encrypted", {
            accountId,
            userId,
            source: tokenData.refresh_token
              ? "new_from_google"
              : "existing_from_db",
          });
        }
      } catch (encryptionError) {
        gmbLogger.error(
          "Failed to encrypt tokens",
          encryptionError instanceof Error
            ? encryptionError
            : new Error(
                (encryptionError as any)?.message ||
                  JSON.stringify(encryptionError, null, 2) ||
                  "Unknown error",
              ),
          { accountId },
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error: "Failed to secure OAuth tokens. Please try again.",
            error_code: "token_encryption_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // ✅ Determine user state BEFORE upsert to detect first-time vs re-auth
      gmbLogger.info(`Checking user state for account`, {
        accountId,
        isReAuth,
      });

      // Check if user has any OTHER GMB accounts (to detect first-time vs additional)
      const { data: otherAccounts } = await adminClient
        .from("gmb_accounts")
        .select("id")
        .eq("user_id", userId)
        .neq("account_id", accountId); // Exclude current account

      const hasOtherAccounts = otherAccounts && otherAccounts.length > 0;

      // Determine user state (update the outer variable)
      if (isReAuth) {
        userState = "RE_AUTH";
      } else if (hasOtherAccounts) {
        userState = "ADDITIONAL_ACCOUNT";
      } else {
        userState = "FIRST_TIME";
      }

      gmbLogger.info(`User state: ${userState}`, {
        accountId,
        isReAuth,
        hasOtherAccounts,
        otherAccountsCount: otherAccounts?.length || 0,
      });

      // Use UPSERT to insert or update the account (tokens stored separately in gmb_secrets)
      // IMPORTANT: Use .select('id').single() to get the ID in the same operation
      // This avoids race conditions between upsert and secrets insertion
      gmbLogger.info(`Upserting GMB account`, { accountId });

      const upsertData = {
        user_id: userId,
        account_id: accountId,
        account_name: accountName,
        email: userInfo.email,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        last_sync: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Upsert AND get ID in single operation
      const { data: upsertedAccount, error: upsertError } = await adminClient
        .from("gmb_accounts")
        .upsert(upsertData, {
          onConflict: "account_id",
          ignoreDuplicates: false,
        })
        .select("id")
        .single();

      if (upsertError || !upsertedAccount) {
        const errorObj = upsertError as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        } | null;
        gmbLogger.error(
          "GMB account upsert error",
          new Error(getErrorMessage(upsertError)),
          {
            message: errorObj?.message,
            code: errorObj?.code,
            details: errorObj?.details,
            hint: errorObj?.hint,
            upsertData,
          },
        );
        handleApiError(
          upsertError,
          "[OAuth Callback] Failed to upsert GMB account",
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error: `Failed to save GMB account: ${getErrorMessage(upsertError)}`,
            error_code: "gmb_account_upsert_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      gmbLogger.info("GMB account upserted successfully", {
        accountId: upsertedAccount.id,
        googleAccountId: accountId,
      });

      // Store tokens in gmb_secrets table (separate from gmb_accounts for security)
      gmbLogger.info("Storing tokens in gmb_secrets", {
        accountId: upsertedAccount.id,
        hasRefreshToken: !!encryptedRefreshToken,
      });

      const { error: secretsError } = await adminClient
        .from("gmb_secrets")
        .upsert(
          {
            account_id: upsertedAccount.id,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken, // ✅ Can now be NULL
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "account_id",
            ignoreDuplicates: false,
          },
        );

      if (secretsError) {
        const errorObj = secretsError as {
          message?: string;
          code?: string;
          details?: string;
          hint?: string;
        } | null;

        gmbLogger.error(
          "Failed to store tokens in gmb_secrets",
          new Error(getErrorMessage(secretsError)),
          {
            accountId: upsertedAccount.id,
            errorCode: errorObj?.code,
            errorDetails: errorObj?.details,
            errorHint: errorObj?.hint,
            googleAccountId: accountId,
          },
        );

        // ✅ NEW: Rollback account insert if secrets fail
        gmbLogger.warn("Rolling back account insert due to secrets failure", {
          accountId: upsertedAccount.id,
        });

        await adminClient
          .from("gmb_accounts")
          .delete()
          .eq("id", upsertedAccount.id);

        // Return error to user with clear message
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error:
              "Failed to securely store your credentials. Please try reconnecting.",
            error_code: "token_storage_failed",
            details: errorObj?.message || "Unknown database error",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // ✅ NEW: Verify secrets were actually saved
      gmbLogger.info("Verifying secrets were saved", {
        accountId: upsertedAccount.id,
      });

      const { data: verifySecrets, error: verifyError } = await adminClient
        .from("gmb_secrets")
        .select("access_token, refresh_token")
        .eq("account_id", upsertedAccount.id)
        .single();

      if (verifyError || !verifySecrets) {
        gmbLogger.error(
          "Secrets verification failed - secrets not found after insert",
          new Error(getErrorMessage(verifyError)),
          {
            accountId: upsertedAccount.id,
            googleAccountId: accountId,
          },
        );

        // Rollback account
        await adminClient
          .from("gmb_accounts")
          .delete()
          .eq("id", upsertedAccount.id);

        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error:
              "Connection verification failed. Please try again or contact support if this persists.",
            error_code: "secrets_verification_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // ✅ Verify access_token exists (critical)
      if (!verifySecrets.access_token) {
        gmbLogger.error(
          "Access token missing after secrets insert",
          new Error("Critical: access_token is null"),
          {
            accountId: upsertedAccount.id,
            hasRefreshToken: !!verifySecrets.refresh_token,
          },
        );

        // Rollback
        await adminClient
          .from("gmb_accounts")
          .delete()
          .eq("id", upsertedAccount.id);

        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error:
              "Critical security error: access token missing. Please try again.",
            error_code: "access_token_missing",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      gmbLogger.info("Secrets verified successfully", {
        accountId: upsertedAccount.id,
        hasAccessToken: true,
        hasRefreshToken: !!verifySecrets.refresh_token,
      });

      savedAccountId = upsertedAccount.id;
      savedAccountIds.push(upsertedAccount.id);

      // NOTE: Locations are NOT fetched here anymore.
      // The user will select locations in the /select-account flow,
      // which calls /api/gmb/locations/fetch-google and /api/gmb/locations/import
    }

    // Redirect to GMB dashboard with success or error
    if (!savedAccountId) {
      gmbLogger.error("No account was saved", new Error("No account saved"));
      const redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/settings`,
        {
          error: "Failed to save any account",
          error_code: "no_account_saved",
        },
      );
      return NextResponse.redirect(redirectUrl);
    }

    // Audit logging for successful connection
    await logAction("gmb_connect", "gmb_account", savedAccountId, {
      google_email: userInfo.email,
      state_token: state,
    });

    // NOTE: Sync queue is NOT triggered here anymore.
    // Syncing will start after the user selects and imports locations
    // via /api/gmb/locations/import

    // Invalidate Next.js cache so Settings page shows fresh data
    await invalidateGMBCache(userId);

    // ✅ SMART REDIRECT: Check if user already has locations
    // If RE_AUTH and has locations, skip select-account and go to dashboard
    let redirectUrl: string;

    if (userState === "RE_AUTH") {
      // Check if user has existing locations for this account
      const { data: existingLocations } = await adminClient
        .from("gmb_locations")
        .select("id")
        .eq("gmb_account_id", savedAccountId)
        .eq("is_active", true)
        .limit(1);

      if (existingLocations && existingLocations.length > 0) {
        // User has locations, skip select-account
        redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/dashboard`,
          {
            reconnected: "true",
            accountId: savedAccountId,
          },
        );
        gmbLogger.info(
          "RE_AUTH with existing locations - redirecting to dashboard",
          {
            accountId: savedAccountId,
            locationsCount: existingLocations.length,
          },
        );
      } else {
        // RE_AUTH but no locations - go to select-account
        redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/select-account`,
          {
            accountId: savedAccountId,
            userState: userState,
            accountCount: String(savedAccountIds.length),
          },
        );
        gmbLogger.info(
          "RE_AUTH without locations - redirecting to select-account",
          {
            accountId: savedAccountId,
          },
        );
      }
    } else {
      // FIRST_TIME or ADDITIONAL_ACCOUNT - always go to select-account
      redirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/select-account`,
        {
          accountId: savedAccountId,
          userState: userState,
          accountCount: String(savedAccountIds.length),
        },
      );
      gmbLogger.info("Redirecting to select-account", {
        userState,
        accountId: savedAccountId,
      });
    }

    // Create redirect response and set gmb_connected cookie for middleware optimization
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.cookies.set("gmb_connected", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour - will be refreshed on subsequent requests
      path: "/",
    });

    return redirectResponse;
  } catch (error: unknown) {
    gmbLogger.error(
      "Unexpected error in OAuth callback",
      error instanceof Error
        ? error
        : new Error(
            (error as any)?.message ||
              JSON.stringify(error, null, 2) ||
              "Unknown error",
          ),
    );
    const baseUrl = getSafeBaseUrl(request);
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value || "en";
    const errorRedirectUrl = buildSafeRedirectUrl(
      baseUrl,
      `/${localeCookie}/settings`,
      {
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        error_code: "unexpected_error",
      },
    );
    return NextResponse.redirect(errorRedirectUrl);
  }
}
