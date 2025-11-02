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
async function getValidAccessToken(supabase: any): Promise<string | null> {
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
    console.warn('[Attributes API] No active GMB account found for user:', user.id);
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
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const categoryName = searchParams.get('categoryName') || undefined;
    const regionCode = searchParams.get('country') || undefined;
    const languageCode = searchParams.get('languageCode') || 'en';
    const pageSize = parseInt(searchParams.get('pageSize') || '200');
    const pageToken = searchParams.get('pageToken') || undefined;

    // regionCode is used instead of country in body
    if (!categoryName && !regionCode) {
      return errorResponse(
        'MISSING_FIELDS',
        'Either categoryName or country is required',
        400
      );
    }

    const accessToken = await getValidAccessToken(supabase);
    
    // If no access token (no GMB account), return empty attributes
    if (!accessToken) {
      return successResponse({ 
        attributeMetadata: [],
        message: 'No GMB account connected' 
      });
    }

    const url = `${GBP_LOC_BASE}/attributes:batchGet`;

    const body: any = {
      languageCode,
      pageSize,
    };
    if (categoryName) body.categoryName = categoryName;
    if (regionCode) body.regionCode = regionCode;
    if (pageToken) body.pageToken = pageToken;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        // If not JSON, use text as error message
        errorData = { message: errorText || 'Unknown error' };
      }
      
      // Log more details for debugging
      console.error('[Attributes API] Failed to fetch:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: url,
        body: body
      });
      
      return errorResponse(
        'API_ERROR',
        errorData.error?.message || errorData.message || 'Failed to fetch attributes from Google',
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return successResponse(data);
  } catch (error: any) {
    console.error('[Attributes API] Error:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      error: error
    });
    return errorResponse(
      'INTERNAL_ERROR', 
      error?.message || 'Failed to fetch attributes', 
      500
    );
  }
}
