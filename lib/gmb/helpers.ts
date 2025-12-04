import { encryptToken, resolveTokenValue } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing Google OAuth configuration");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error || "Unknown error"}`);
  }

  return data;
}

export async function getValidAccessToken(
  _supabase: unknown, // Client is kept for compatibility but not used for secrets
  accountId: string,
): Promise<string> {
  // Always use Admin Client to access the secure gmb_secrets table
  const adminClient = createAdminClient();

  // 1. Fetch encrypted tokens from gmb_secrets
  const { data: secrets, error: secretError } = await adminClient
    .from("gmb_secrets")
    .select("access_token, refresh_token")
    .eq("account_id", accountId)
    .single();

  // Also fetch expiry from main account table
  const { data: account, error: accountError } = await adminClient
    .from("gmb_accounts")
    .select("token_expires_at, user_id") // ✅ Added user_id for error handling
    .eq("id", accountId)
    .single();

  if (secretError || !secrets || accountError || !account) {
    gmbLogger.error(
      "Credentials not found",
      new Error("Account credentials not found"),
      {
        accountId,
      },
    );
    throw new Error("Account credentials not found");
  }

  // 2. Decrypt tokens
  const accessToken = resolveTokenValue(secrets.access_token);
  const refreshToken = resolveTokenValue(secrets.refresh_token); // ✅ Can now be NULL

  if (!accessToken) {
    throw new Error("Failed to decrypt access token");
  }

  // ✅ NEW: Handle missing refresh_token case
  if (!refreshToken) {
    // Check if access token is expired
    const now = Date.now();
    const expiresAt = account.token_expires_at
      ? new Date(account.token_expires_at).getTime()
      : 0;

    // Buffer: Check if expired or expiring within 5 minutes
    if (now >= expiresAt - 300000) {
      // Access token expired and no refresh_token available
      gmbLogger.error(
        "Access token expired with no refresh_token available - re-authentication required",
        new Error("Re-authentication required"),
        {
          accountId,
          userId: account.user_id,
          expiresAt: account.token_expires_at,
          hoursExpired: Math.round((now - expiresAt) / (1000 * 60 * 60)),
        },
      );

      // Deactivate account to force re-authentication
      await adminClient
        .from("gmb_accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      throw new Error(
        "Your Google account connection has expired. Please reconnect your account in Settings. " +
          "اتصال حساب Google الخاص بك منتهي الصلاحية. يُرجى إعادة توصيل حسابك في الإعدادات.",
      );
    }

    // Access token still valid, return it (but log warning)
    gmbLogger.warn("No refresh_token available but access_token still valid", {
      accountId,
      userId: account.user_id,
      hoursUntilExpiry: Math.round((expiresAt - now) / (1000 * 60 * 60)),
    });

    return accessToken;
  }

  // 3. Check expiration (existing logic continues with refresh_token)
  const now = Date.now();
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Buffer: Refresh 5 minutes early
  if (now >= expiresAt - 300000) {
    gmbLogger.debug("Token expired, refreshing...", {
      accountId,
      userId: account.user_id,
    });

    try {
      const tokens = await refreshAccessToken(refreshToken);

      // Update DB with new encrypted tokens
      const newExpiresAt = new Date(now + tokens.expires_in * 1000);

      // Update gmb_accounts (expiry)
      await adminClient
        .from("gmb_accounts")
        .update({
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      // Update gmb_secrets (tokens)
      await adminClient
        .from("gmb_secrets")
        .update({
          access_token: encryptToken(tokens.access_token),
          ...(tokens.refresh_token && {
            refresh_token: encryptToken(tokens.refresh_token),
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", accountId);

      gmbLogger.info("Token refreshed successfully", {
        accountId,
        userId: account.user_id,
        newExpiry: newExpiresAt.toISOString(),
      });

      return tokens.access_token;
    } catch (refreshError) {
      // ✅ NEW: Handle refresh failure gracefully
      gmbLogger.error(
        "Token refresh failed",
        refreshError instanceof Error
          ? refreshError
          : new Error(String(refreshError)),
        {
          accountId,
          userId: account.user_id,
          errorMessage:
            refreshError instanceof Error
              ? refreshError.message
              : String(refreshError),
        },
      );

      // Deactivate account
      await adminClient
        .from("gmb_accounts")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId);

      throw new Error(
        "Failed to refresh your access token. Please reconnect your Google account in Settings. " +
          "فشل تحديث رمز الوصول. يُرجى إعادة توصيل حساب Google الخاص بك في الإعدادات.",
      );
    }
  }

  return accessToken;
}

export function buildLocationResourceName(
  accountId: string,
  locationId: string,
): string {
  const cleanAccountId = accountId.replace(/^accounts\//, "");
  const cleanLocationId = locationId.replace(
    /^(accounts\/[^/]+\/)?locations\//,
    "",
  );
  return `accounts/${cleanAccountId}/locations/${cleanLocationId}`;
}

export const GMB_CONSTANTS = {
  BUSINESS_INFORMATION_BASE:
    "https://mybusinessbusinessinformation.googleapis.com/v1",
  GBP_LOC_BASE: "https://mybusinessbusinessinformation.googleapis.com/v1",
  QANDA_BASE: "https://mybusinessqanda.googleapis.com/v1",
  GMB_V4_BASE: "https://mybusiness.googleapis.com/v4",
  PERFORMANCE_BASE: "https://businessprofileperformance.googleapis.com/v1",
  GOOGLE_TOKEN_URL,
};
