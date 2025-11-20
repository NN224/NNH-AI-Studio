// lib/gmb/helpers.ts
// Shared GMB helper functions for token management and resource building

import { encryptToken, resolveTokenValue } from '@/lib/security/encryption';

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
 * @throws Error if account not found or token decryption fails (requires re-authentication)
 */
export async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at, expires_at')
    .eq('id', accountId)
    .maybeSingle();

  if (error || !account) {
    throw new Error('Account not found');
  }

  // Decrypt tokens - will throw EncryptionError if decryption fails
  let accessToken: string | null;
  let refreshToken: string | null;

  try {
    accessToken = resolveTokenValue(account.access_token, { context: 'gmb_accounts.access_token' });
    refreshToken = resolveTokenValue(account.refresh_token, { context: 'gmb_accounts.refresh_token' });
  } catch (error) {
    console.error('[GMB Helpers] Token decryption failed for account:', accountId);

    // Mark account as inactive - requires reconnection
    await supabase
      .from('gmb_accounts')
      .update({
        is_active: false,
        last_error: 'Token decryption failed - reconnection required',
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId);

    throw new Error(
      'Your Google account connection has expired. Please reconnect in Settings. ' +
      'انتهت صلاحية اتصال حساب Google. يُرجى إعادة الاتصال في الإعدادات.'
    );
  }

  const now = Date.now();
  const expiresAt = account.token_expires_at
    ? new Date(account.token_expires_at).getTime()
    : account.expires_at
    ? new Date(account.expires_at).getTime()
    : 0;

  const needsRefresh = !accessToken || !expiresAt || now >= expiresAt;

  if (!needsRefresh) {
    if (!accessToken) {
      throw new Error('Access token is null after decryption');
    }
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const tokens = await refreshAccessToken(refreshToken);
  const newExpiresAt = new Date(now);
  newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 0));

  const updatePayload: Record<string, any> = {
    access_token: encryptToken(tokens.access_token),
    token_expires_at: newExpiresAt.toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (tokens.refresh_token) {
    updatePayload.refresh_token = encryptToken(tokens.refresh_token);
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
