/**
 * GMB OAuth Callback Handler
 *
 * Security Note: All redirects in this file use buildSafeRedirectUrl() which validates
 * URLs against an allowlist of trusted domains (see lib/utils/safe-redirect.ts).
 * Static analyzers may flag these as "open redirect" vulnerabilities, but they are
 * false positives - the URLs are validated before redirect.
 */
import { invalidateGMBCache } from "@/lib/cache/gmb-cache";
import { logAction } from "@/lib/monitoring/audit";
import { encryptToken, resolveTokenValue } from "@/lib/security/encryption";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/utils/api-error-handler";
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
const GMB_LOCATIONS_URL =
  "https://mybusinessbusinessinformation.googleapis.com/v1";

export async function GET(request: NextRequest) {
  console.warn("[OAuth Callback] Processing OAuth callback...");

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle OAuth errors
    // Determine locale from cookie (fallback to 'en')
    const localeCookie = request.cookies.get("NEXT_LOCALE")?.value || "en";

    if (error) {
      console.error("[OAuth Callback] OAuth error from provider:", error);
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
      console.error("[OAuth Callback] Missing code or state");
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

    console.warn("[OAuth Callback] State:", state);

    // Use admin client throughout to avoid reliance on browser session cookies.
    // OAuth callback can arrive without a valid Supabase session cookie due to
    // cross-site redirects or SameSite policies, so we must bypass RLS safely
    // using the server role. We still derive user_id from the validated state.
    const _supabase = await createClient();
    const adminClient = createAdminClient();

    // Verify state and get user ID
    const { data: stateRecord, error: stateError } = await adminClient
      .from("oauth_states")
      .select("*")
      .eq("state", state)
      .eq("used", false)
      .single();

    if (stateError || !stateRecord) {
      console.error("[OAuth Callback] Invalid state:", stateError);
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
      console.error("[OAuth Callback] State has expired");
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
    console.warn("[OAuth Callback] User ID from state:", userId);

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const baseUrl = getSafeBaseUrl(request);
    // Ensure consistent redirect_uri - must match create-auth-url exactly
    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/gmb/oauth-callback`;

    if (!clientId || !clientSecret) {
      console.error("[OAuth Callback] Missing Google OAuth configuration");
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
    console.warn("[OAuth Callback] Using redirect URI:", cleanRedirectUri);
    // Optional diagnostics to help with www/non-www mismatch
    try {
      const baseHost = new URL(baseUrl).host;
      const redirectHost = new URL(cleanRedirectUri).host;
      const stripW = (h: string) => h.replace(/^www\./, "");
      if (stripW(baseHost) !== stripW(redirectHost)) {
        console.warn(
          "[OAuth Callback] WARNING: Host mismatch between base URL and redirect URI",
          {
            baseHost,
            redirectHost,
          },
        );
      }
    } catch {
      // ignore URL parsing issues
    }

    console.warn("[OAuth Callback] Exchanging code for tokens...");
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
      console.error("[OAuth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        error: tokenData,
      });
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

    console.warn("[OAuth Callback] Tokens received successfully");

    // Get user info from Google
    console.warn("[OAuth Callback] Fetching user info...");
    const userInfoUrl = new URL(GOOGLE_USERINFO_URL);
    userInfoUrl.searchParams.set("alt", "json");

    const userInfoResponse = await fetch(userInfoUrl.toString(), {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        Accept: "application/json",
      },
    });

    if (!userInfoResponse.ok) {
      console.error("[OAuth Callback] Failed to fetch user info", {
        status: userInfoResponse.status,
      });
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
    console.warn("[OAuth Callback] User info:", {
      email: userInfo.email,
      id: userInfo.id,
    });

    if (!userInfo.email) {
      console.error(
        "[OAuth Callback] Google user info did not include an email address",
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
      console.error(
        "[OAuth Callback] Failed to verify profile record:",
        profileLookupError,
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

      console.warn("[OAuth Callback] Creating profile record for new user", {
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
        console.error(
          "[OAuth Callback] Failed to create profile record:",
          createProfileError,
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
    console.warn("[OAuth Callback] Fetching GMB accounts...");
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
      console.error("[OAuth Callback] Failed to fetch GMB accounts:", {
        status: gmbAccountsResponse.status,
        body_snippet: text.substring(0, 500),
      });
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

    console.warn(`[OAuth Callback] Found ${gmbAccounts.length} GMB accounts`);

    if (gmbAccounts.length === 0) {
      console.warn("[OAuth Callback] No GMB accounts found for user");
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

      console.warn(
        `[OAuth Callback] Processing GMB account: ${accountName} (${accountId})`,
      );

      // Check if this account is already linked to another user
      const { data: existingAccount } = await adminClient
        .from("gmb_accounts")
        .select("user_id, refresh_token")
        .eq("account_id", accountId)
        .maybeSingle();

      if (existingAccount && existingAccount.user_id !== userId) {
        console.error(
          "[OAuth Callback] Security violation: GMB account already linked to different user",
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
          console.warn(
            "[OAuth Callback] Failed to decrypt existing refresh token, will use new token:",
            error,
          );
          // Continue with null - new refresh_token from OAuth will be used
        }
      }

      let encryptedAccessToken: string;
      let encryptedRefreshToken: string | null = null;

      try {
        encryptedAccessToken = encryptToken(tokenData.access_token);
        const refreshTokenToPersist =
          tokenData.refresh_token || existingRefreshToken || null;
        encryptedRefreshToken = refreshTokenToPersist
          ? encryptToken(refreshTokenToPersist)
          : null;
      } catch (encryptionError) {
        console.error(
          "[OAuth Callback] Failed to encrypt tokens:",
          encryptionError,
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

      // ✅ NEW: Determine user state BEFORE upsert to detect first-time vs re-auth
      console.warn(
        `[OAuth Callback] Checking user state for account ${accountId}`,
      );

      // Check if this account already exists for this user (re-auth scenario)
      const { data: existingAccountForReauth } = await adminClient
        .from("gmb_accounts")
        .select("id, account_id")
        .eq("account_id", accountId)
        .eq("user_id", userId)
        .maybeSingle();

      const isReAuth = !!existingAccountForReauth;

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

      console.warn(`[OAuth Callback] User state: ${userState}`, {
        isReAuth,
        hasOtherAccounts,
        otherAccountsCount: otherAccounts?.length || 0,
      });

      // Use UPSERT to insert or update the account (tokens stored separately in gmb_secrets)
      console.warn(`[OAuth Callback] Upserting GMB account ${accountId}`);

      const upsertData = {
        user_id: userId,
        account_id: accountId,
        account_name: accountName,
        email: userInfo.email,
        token_expires_at: tokenExpiresAt.toISOString(),
        is_active: true,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // First try to upsert the account
      const { error: upsertError } = await adminClient
        .from("gmb_accounts")
        .upsert(upsertData, {
          onConflict: "account_id",
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error("[OAuth Callback] UPSERT ERROR DETAILS:", {
          message: upsertError.message,
          code: upsertError.code,
          details: upsertError.details,
          hint: upsertError.hint,
          upsertData,
        });
        handleApiError(
          upsertError,
          "[OAuth Callback] Failed to upsert GMB account",
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error: `Failed to save GMB account: ${upsertError.message}`,
            error_code: "gmb_account_upsert_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Fetch the account to get its UUID
      const { data: upsertedAccount, error: fetchError } = await adminClient
        .from("gmb_accounts")
        .select("id")
        .eq("account_id", accountId)
        .single();

      if (fetchError || !upsertedAccount) {
        console.error(
          "[OAuth Callback] Failed to fetch account after upsert:",
          fetchError,
        );
        const redirectUrl = buildSafeRedirectUrl(
          baseUrl,
          `/${localeCookie}/settings`,
          {
            error: "Failed to retrieve account after save",
            error_code: "gmb_account_fetch_failed",
          },
        );
        return NextResponse.redirect(redirectUrl);
      }

      // Store tokens in gmb_secrets table (separate from gmb_accounts for security)
      console.warn(
        `[OAuth Callback] Storing tokens in gmb_secrets for account ${upsertedAccount.id}`,
      );
      const { error: secretsError } = await adminClient
        .from("gmb_secrets")
        .upsert(
          {
            account_id: upsertedAccount.id,
            access_token: encryptedAccessToken,
            refresh_token: encryptedRefreshToken,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "account_id",
            ignoreDuplicates: false,
          },
        );

      if (secretsError) {
        console.error("[OAuth Callback] Failed to store tokens:", secretsError);
        // Continue anyway - account is saved, user can re-authenticate if needed
      }

      savedAccountId = upsertedAccount.id;
      savedAccountIds.push(upsertedAccount.id);
      console.warn(
        `[OAuth Callback] Successfully upserted account ${upsertedAccount.id}`,
      );

      // Fetch initial locations for this account
      console.warn(
        `[OAuth Callback] Fetching initial locations for account ${accountId}`,
      );
      const locationsUrl = new URL(
        `${GMB_LOCATIONS_URL}/${accountId}/locations`,
      );
      locationsUrl.searchParams.set(
        "readMask",
        "name,title,storefrontAddress,phoneNumbers,websiteUri,categories",
      );
      locationsUrl.searchParams.set("alt", "json");

      const locationsResponse = await fetch(locationsUrl.toString(), {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/json",
        },
      });

      if (locationsResponse.ok) {
        const locationsData = await locationsResponse.json();
        const locations = locationsData.locations || [];

        console.warn(`[OAuth Callback] Found ${locations.length} locations`);

        for (const location of locations) {
          const locationData = {
            gmb_account_id: savedAccountId,
            user_id: userId,
            location_name: location.title || "Unnamed Location",
            location_id: location.name,
            address: location.storefrontAddress
              ? `${location.storefrontAddress.addressLines?.join(", ") || ""}, ${
                  location.storefrontAddress.locality || ""
                }, ${location.storefrontAddress.administrativeArea || ""} ${
                  location.storefrontAddress.postalCode || ""
                }`
              : null,
            phone: location.phoneNumbers?.primaryPhone || null,
            category: location.categories?.primaryCategory?.displayName || null,
            website: location.websiteUri || null,
            is_active: true,
            metadata: location,
            updated_at: new Date().toISOString(),
          };

          // Use UPSERT to insert or update the location in a single query
          // The unique constraint on location_id will handle the conflict
          const { error: upsertLocationError } = await adminClient
            .from("gmb_locations")
            .upsert(locationData, {
              onConflict: "location_id",
              ignoreDuplicates: false,
            });

          if (upsertLocationError) {
            console.error(
              `[OAuth Callback] Error upserting location ${location.name}:`,
              upsertLocationError,
            );
          }
        }
      } else {
        const text = await locationsResponse.text();
        console.error(`[OAuth Callback] Failed to fetch locations:`, {
          status: locationsResponse.status,
          body_snippet: text.substring(0, 500),
        });
      }
    }

    // Redirect to GMB dashboard with success or error
    if (!savedAccountId) {
      console.error("[OAuth Callback] No account was saved");
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

    // ✅ NEW: Smart sync strategy based on user state
    try {
      // Dynamically import to avoid circular dependencies
      const { addToSyncQueue } = await import("@/server/actions/sync-queue");

      let syncPriority: number;
      let shouldTriggerImmediate: boolean;

      switch (userState) {
        case "FIRST_TIME":
          // 🎉 First-time user - highest priority, immediate sync
          syncPriority = 10;
          shouldTriggerImmediate = true;
          console.warn(
            "[OAuth Callback] FIRST_TIME user - full sync with overlay",
          );
          break;

        case "ADDITIONAL_ACCOUNT":
          // ⚡ Additional account - high priority, background sync
          syncPriority = 7;
          shouldTriggerImmediate = true;
          console.warn(
            "[OAuth Callback] ADDITIONAL_ACCOUNT - background sync for new account",
          );
          break;

        case "RE_AUTH":
          // 🔄 Re-auth - no sync needed (just token refresh)
          syncPriority = 0;
          shouldTriggerImmediate = false;
          console.warn(
            "[OAuth Callback] RE_AUTH - skipping sync (token refresh only)",
          );
          break;

        default:
          syncPriority = 5;
          shouldTriggerImmediate = false;
      }

      // Only add to sync queue if needed (not for re-auth)
      if (userState !== "RE_AUTH") {
        const result = await addToSyncQueue(
          savedAccountId,
          "full",
          syncPriority,
          userId,
        );

        if (result.success) {
          console.warn("[OAuth Callback] Added to sync queue:", result.queueId);

          // Trigger immediate processing if needed
          if (shouldTriggerImmediate) {
            const cronSecret = process.env.CRON_SECRET;
            if (cronSecret) {
              console.warn(
                "[OAuth Callback] Triggering immediate queue processing...",
              );
              const processUrl = `${baseUrl}/api/gmb/queue/process`;
              fetch(processUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${cronSecret}`,
                },
              }).catch((err) => {
                console.error(
                  "[OAuth Callback] Failed to trigger queue processing:",
                  err,
                );
              });
            } else {
              console.warn(
                "[OAuth Callback] CRON_SECRET not set, cannot trigger immediate processing",
              );
            }
          }
        } else {
          console.error(
            "[OAuth Callback] Failed to add to queue:",
            result.error,
          );
        }
      }
    } catch (syncError) {
      console.error("[OAuth Callback] Error adding to queue:", syncError);
    }

    // ✅ CRITICAL: Invalidate Next.js cache so Settings page shows fresh data
    await invalidateGMBCache(userId);

    // If multiple accounts were saved, redirect to account selection page
    if (savedAccountIds.length > 1) {
      const multiAccountRedirectUrl = buildSafeRedirectUrl(
        baseUrl,
        `/${localeCookie}/select-account`,
      );
      console.warn(
        "[OAuth Callback] Multiple accounts found, redirecting to selection:",
        multiAccountRedirectUrl,
      );
      return NextResponse.redirect(multiAccountRedirectUrl);
    }

    // ✅ IMPROVED: Smart redirect based on user state
    // Build redirect parameters and destination based on user state
    let redirectPath: string;
    let redirectParams: Record<string, string>;

    switch (userState) {
      case "FIRST_TIME":
        // 🎉 First-time - redirect to sync-progress page to wait for data
        // This fixes the race condition where dashboard shows 404 before data is ready
        redirectPath = `/${localeCookie}/sync-progress`;
        redirectParams = {
          initial: "true",
          accountId: savedAccountId,
        };
        console.warn(
          "[OAuth Callback] FIRST_TIME redirect - sync-progress page",
        );
        break;

      case "ADDITIONAL_ACCOUNT":
        // ⚡ Additional account - background sync notification, go to dashboard
        redirectPath = `/${localeCookie}/dashboard`;
        redirectParams = {
          accountAdded: "true",
          accountId: savedAccountId,
        };
        console.warn(
          "[OAuth Callback] ADDITIONAL_ACCOUNT redirect - background sync",
        );
        break;

      case "RE_AUTH":
        // 🔄 Re-auth - just success message, go to dashboard
        redirectPath = `/${localeCookie}/dashboard`;
        redirectParams = {
          reauth: "true",
        };
        console.warn("[OAuth Callback] RE_AUTH redirect - quick refresh");
        break;

      default:
        // Fallback - go to sync-progress to be safe
        redirectPath = `/${localeCookie}/sync-progress`;
        redirectParams = {
          initial: "true",
          accountId: savedAccountId,
        };
    }

    const successRedirectUrl = buildSafeRedirectUrl(
      baseUrl,
      redirectPath,
      redirectParams,
    );
    console.warn(
      "[OAuth Callback] Redirecting to:",
      successRedirectUrl,
      "with params:",
      redirectParams,
    );

    // Create redirect response and set gmb_connected cookie for middleware optimization
    const redirectResponse = NextResponse.redirect(successRedirectUrl);
    redirectResponse.cookies.set("gmb_connected", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour - will be refreshed on subsequent requests
      path: "/",
    });

    return redirectResponse;
  } catch (error: unknown) {
    console.error("[OAuth Callback] Unexpected error:", error);
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
