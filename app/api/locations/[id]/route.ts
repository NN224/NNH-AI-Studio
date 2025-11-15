import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateBody } from '@/middleware/validate-request';
import { locationUpdateSchema } from '@/lib/validations/schemas';
import { getValidAccessToken } from '@/lib/gmb/helpers';
import { logAction } from '@/lib/monitoring/audit';

export const dynamic = 'force-dynamic';

const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

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

    const bodyResult = await validateBody(request, locationUpdateSchema);
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const payload = bodyResult.data;

    const updateData: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      updateData.location_name = payload.name;
    }
    if (payload.address !== undefined) {
      updateData.address = payload.address;
    }
    if (payload.phone !== undefined) {
      updateData.phone = payload.phone;
    }
    if (payload.website !== undefined) {
      updateData.website = payload.website;
    }
    if (payload.category !== undefined) {
      updateData.category = payload.category;
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
      await logAction('location_update', 'gmb_location', locationId, {
        status: 'failed',
        reason: error.message,
      });
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

    await logAction('location_update', 'gmb_location', locationId, {
      status: 'success',
      changed_fields: Object.keys(updateData),
    });

    return NextResponse.json({
      data,
      message: 'Location updated successfully',
    });
  } catch (error: any) {
    console.error('[PUT /api/locations/:id] Unexpected error:', error);
    await logAction('location_update', 'gmb_location', params.locationId || null, {
      status: 'failed',
      reason: error.message,
    });
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
      await logAction('location_delete', 'gmb_location', locationId, {
        status: 'failed',
        reason: error.message,
      });
      return NextResponse.json(
        { error: 'Failed to delete location' },
        { status: 500 }
      );
    }

    await logAction('location_delete', 'gmb_location', locationId, {
      status: 'success',
    });

    return NextResponse.json({
      success: true,
      message: 'Location deleted successfully',
    });
  } catch (error: any) {
    console.error('[DELETE /api/locations/:id] Unexpected error:', error);
    await logAction('location_delete', 'gmb_location', params.locationId || null, {
      status: 'failed',
      reason: error.message,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

