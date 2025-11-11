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

// Get valid access token
async function getValidAccessToken(
  supabase: any,
  accountId: string
): Promise<string> {
  const { data: account, error } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', accountId)
    .single();

  if (error || !account) {
    throw new Error('Account not found');
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
      .eq('id', accountId);

    return tokens.access_token;
  }

  return account.access_token;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json({ error: 'Location ID required' }, { status: 400 });
    }

    // Get location from database
    const { data: location, error: locationError } = await supabase
      .from('gmb_locations')
      .select('*, gmb_accounts(id, account_id)')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const accountId = location.gmb_account_id;
    const accountResource = `accounts/${location.gmb_accounts.account_id}`;
    const locationResource = location.location_id; // Already in format: locations/{id}

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, accountId);

    // Fetch full location details with expanded readMask (includes attributes)
    const url = new URL(`${GBP_LOC_BASE}/${locationResource}`);
    const readMask = 'name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels,relationshipData,attributes';
    url.searchParams.set('readMask', readMask);

    const response = await fetch(url.toString(), {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to fetch location details', details: errorData },
        { status: response.status }
      );
    }

    const locationData = await response.json();

    // Extract attributes from location data (attributes are included in location object via readMask)
    // Note: In Google Business Profile API v1, attributes are part of the location object, not a separate endpoint
    const attributes: any[] = locationData.attributes || [];

    // Get Google-updated information if available
    let googleUpdated: any = null;
    try {
      const googleUpdatedUrl = new URL(`${GBP_LOC_BASE}/${locationResource}:getGoogleUpdated`);
      googleUpdatedUrl.searchParams.set('readMask', readMask);
      const googleUpdatedResponse = await fetch(googleUpdatedUrl.toString(), {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      
      if (googleUpdatedResponse.ok) {
        const googleUpdatedData = await googleUpdatedResponse.json();
        googleUpdated = googleUpdatedData;
      }
    } catch (error) {
      console.warn('[Location Details API] Failed to get Google-updated info:', error);
    }

    return NextResponse.json({
      location: locationData,
      attributes,
      googleUpdated,
      gmb_account_id: location.gmb_account_id, // Include accountId for sync operations
    });
  } catch (error: any) {
    console.error('[Location Details API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID required' },
        { status: 400 }
      );
    }

    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (typeof payload.name === 'string') {
      updateData.location_name = payload.name.trim();
    }
    if (typeof payload.address === 'string') {
      updateData.address = payload.address.trim();
    }
    if (payload.phone === null || typeof payload.phone === 'string') {
      updateData.phone =
        payload.phone === null ? null : payload.phone.trim();
    }
    if (payload.website === null || typeof payload.website === 'string') {
      updateData.website =
        payload.website === null ? null : payload.website.trim();
    }
    if (payload.category === null || typeof payload.category === 'string') {
      updateData.category =
        payload.category === null ? null : payload.category.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error:
            'No valid fields provided. Expected one of: name, address, phone, website, category.',
        },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('gmb_locations')
      .update(updateData)
      .eq('id', locationId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[PUT /api/locations/:id] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update location' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data,
      message: 'Location updated successfully',
    });
  } catch (error) {
    console.error('[PUT /api/locations/:id] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: 'Location ID required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('gmb_locations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', locationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[DELETE /api/locations/:id] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error) {
    console.error('[DELETE /api/locations/:id] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

