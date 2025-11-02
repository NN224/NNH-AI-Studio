import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

// Get valid access token from any account (for public categories)
async function getValidAccessToken(supabase: any): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: accounts, error } = await supabase
    .from('gmb_accounts')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  if (error || !accounts || accounts.length === 0) {
    console.warn('[Categories API] No active GMB account found for user:', user.id);
    // Return empty categories list instead of error
    return null; // Will be handled by the caller
  }
  
  const account = accounts[0];

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const regionCode = searchParams.get('regionCode') || 'US';
    const languageCode = searchParams.get('languageCode') || 'en';
    const filter = searchParams.get('filter') || undefined;
    const pageSize = parseInt(searchParams.get('pageSize') || '100');
    const pageToken = searchParams.get('pageToken') || undefined;
    const view = searchParams.get('view') || 'FULL';

    const accessToken = await getValidAccessToken(supabase);
    
    // If no access token (no GMB account), return empty categories
    if (!accessToken) {
      return NextResponse.json({ 
        categories: [],
        message: 'No GMB account connected' 
      });
    }

    const url = new URL(`${GBP_LOC_BASE}/categories`);
    url.searchParams.set('regionCode', regionCode);
    url.searchParams.set('languageCode', languageCode);
    url.searchParams.set('view', view);
    url.searchParams.set('pageSize', pageSize.toString());
    if (filter) url.searchParams.set('filter', filter);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch categories', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Categories API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

