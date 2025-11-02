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
    return null;
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
    const locationId = searchParams.get('locationId') || undefined;

    const accessToken = await getValidAccessToken(supabase);
    
    if (!accessToken) {
      return successResponse({ 
        attributeMetadata: [],
        message: 'No GMB account connected' 
      });
    }

    // Strategy 1: If we have a locationId, use it to get attributes from that location
    if (locationId) {
      const { data: location, error: locationError } = await supabase
        .from('gmb_locations')
        .select('location_id')
        .eq('id', locationId)
        .eq('user_id', user.id)
        .single();

      if (locationError || !location) {
        return errorResponse('NOT_FOUND', 'Location not found', 404);
      }

      const url = new URL(`${GBP_LOC_BASE}/${location.location_id}/attributes`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Extract attribute metadata from location attributes
        // The response contains attributes array, we need to convert it to attributeMetadata format
        const attributes = data.attributes || [];
        return successResponse({
          attributeMetadata: attributes.map((attr: any) => ({
            name: attr.name,
            valueType: attr.valueType,
            displayName: attr.displayName,
            // Include other metadata fields as needed
          })),
        });
      }
    }

    // Strategy 2: Try to find any location and use it as reference to get available attributes
    // Note: Google API doesn't have a general endpoint for attribute metadata,
    // so we use an actual location as reference
    const { data: locations } = await supabase
      .from('gmb_locations')
      .select('location_id, category')
      .eq('user_id', user.id)
      .limit(1);

    if (locations && locations.length > 0) {
      const sampleLocation = locations[0];
      const url = new URL(`${GBP_LOC_BASE}/${sampleLocation.location_id}/attributes`);
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const attributes = data.attributes || [];
        return successResponse({
          attributeMetadata: attributes.map((attr: any) => ({
            name: attr.name,
            valueType: attr.valueType,
            displayName: attr.displayName,
            groupName: attr.groupName,
            // Include other metadata as available
          })),
        });
      }

      // If fetch failed, log the error
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Unknown error' };
      }
      
      console.error('[Attributes API] Failed to fetch attributes from location:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: url.toString()
      });
      
      return errorResponse(
        'API_ERROR',
        errorData.error?.message || errorData.message || 'Failed to fetch attributes from Google',
        response.status,
        errorData
      );
    }

    // If no locations found, return empty attributes
    return successResponse({ 
      attributeMetadata: [],
      message: 'Unable to fetch attributes. Please ensure you have connected locations.' 
    });
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
