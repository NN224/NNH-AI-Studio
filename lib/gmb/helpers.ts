// lib/gmb/helpers.ts
// Shared GMB helper functions for token management and resource building

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Refresh Google OAuth access token
 * @param refreshToken - The refresh token from gmb_accounts table
 * @returns New access token, expires_in, and optionally a new refresh_token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Missing Google OAuth configuration');
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error || 'Unknown error'}`);
  }

  return data;
}

/**
 * Get a valid access token for a GMB account, refreshing if necessary.
 * Assumes gmb_accounts schema contains: access_token, refresh_token, token_expires_at.
 */
export async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', accountId)
    .maybeSingle();

  if (error || !account) {
    throw new Error('Account not found');
  }

  const now = Date.now();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;

  const needsRefresh = !account.access_token || !expiresAt || now >= expiresAt;

  if (!needsRefresh) {
    return account.access_token;
  }

  if (!account.refresh_token) {
    throw new Error('No refresh token available');
  }

  const tokens = await refreshAccessToken(account.refresh_token);
  const newExpiresAt = new Date(now);
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 0));

  const updatePayload: Record<string, any> = {
    access_token: tokens.access_token,
    token_expires_at: newExpiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (tokens.refresh_token) {
    updatePayload.refresh_token = tokens.refresh_token;
  }

  await supabase
    .from('gmb_accounts')
    .update(updatePayload)
    .eq('id', accountId);

  return tokens.access_token;
}

/**
 * Build GMB location resource name in format: accounts/{accountId}/locations/{locationId}
 */
export function buildLocationResourceName(accountId: string, locationId: string): string {
  const cleanAccountId = accountId.replace(/^accounts\//, "");
  const cleanLocationId = locationId.replace(/^(accounts\/[^/]+\/)?locations\//, "");
  return `accounts/${cleanAccountId}/locations/${cleanLocationId}`;
}

export const GMB_CONSTANTS = {
  BUSINESS_INFORMATION_BASE: 'https://mybusinessbusinessinformation.googleapis.com/v1',
  GBP_LOC_BASE: 'https://mybusinessbusinessinformation.googleapis.com/v1',
  QANDA_BASE: 'https://mybusinessqanda.googleapis.com/v1',
  GMB_V4_BASE: 'https://mybusiness.googleapis.com/v4',
  GOOGLE_TOKEN_URL,
};
