import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/utils/api-response';

export const dynamic = 'force-dynamic';

const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Refresh Google access token
async function refreshAccessToken(refreshToken: string): Promise<{
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

// Get valid access token
async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (error || !account) {
    throw new Error('No active account found');
  }

  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  if (!expiresAt || now >= expiresAt) {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
    }

    const tokens = await refreshAccessToken(account.refresh_token);
    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + tokens.expires_in);

    await supabase
      .from('gmb_accounts')
      .update({
        access_token: tokens.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        ...(tokens.refresh_token && { refresh_token: tokens.refresh_token }),
      })
      .eq('id', account.id);

    return tokens.access_token;
  }

  return account.access_token;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const parent = searchParams.get('parent') || undefined;
    const categoryName = searchParams.get('categoryName') || undefined;
    const regionCode = searchParams.get('regionCode') || undefined;
    const languageCode = searchParams.get('languageCode') || 'en';
    const pageSize = parseInt(searchParams.get('pageSize') || '200');
    const pageToken = searchParams.get('pageToken') || undefined;
    const showAll = searchParams.get('showAll') === 'true';

    if (!parent && !categoryName && !showAll) {
      return errorResponse(
        'MISSING_FIELDS',
        'Either parent, categoryName, or showAll=true is required',
        400
      );
    }

    const accessToken = await getValidAccessToken(supabase);

    const url = new URL(`${GBP_LOC_BASE}/attributes`);
    if (parent) {
      url.searchParams.set('parent', parent);
      // When using parent, languageCode cannot be set
      // Only set regionCode if provided
      if (regionCode) url.searchParams.set('regionCode', regionCode);
    } else {
      // For categoryName or showAll, we can use languageCode
      if (categoryName) url.searchParams.set('categoryName', categoryName);
      if (regionCode) url.searchParams.set('regionCode', regionCode);
      url.searchParams.set('languageCode', languageCode);
    }
    url.searchParams.set('pageSize', pageSize.toString());
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    if (showAll) url.searchParams.set('showAll', 'true');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Attributes API] Failed to fetch:', errorData);
      return errorResponse(
        'API_ERROR',
        'Failed to fetch attributes from Google',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return successResponse(data);
  } catch (error: any) {
    console.error('[Attributes API] Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch attributes', 500);
  }
}

