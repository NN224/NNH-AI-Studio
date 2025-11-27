import { resolveTokenValue, encryptToken } from "@/lib/security/encryption";
import { createAdminClient } from "@/lib/supabase/server";

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
  supabase: any, // Client is kept for compatibility but not used for secrets
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
    .select("token_expires_at")
    .eq("id", accountId)
    .single();

  if (secretError || !secrets || accountError || !account) {
    console.error("[GMB Helpers] Credentials not found for:", accountId);
    throw new Error("Account credentials not found");
  }

  // 2. Decrypt tokens
  const accessToken = resolveTokenValue(secrets.access_token);
  const refreshToken = resolveTokenValue(secrets.refresh_token);

  if (!accessToken || !refreshToken) {
    throw new Error("Failed to decrypt tokens");
  }

  // 3. Check expiration
  const now = Date.now();
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : 0;

  // Buffer: Refresh 5 minutes early
  if (now >= expiresAt - 300000) {
    console.log("Token expired, refreshing...");
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

    return tokens.access_token;
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
