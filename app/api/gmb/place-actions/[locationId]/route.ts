import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

const PLACE_ACTIONS_BASE = 'https://mybusinessplaceactions.googleapis.com/v1';

// GET - Fetch place action links for a location
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } }
) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { locationId } = params;

    // Get location from database
    const { data: location, error: locationError } = await supabase
      .from('gmb_locations')
      .select('location_id, gmb_account_id, user_id')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const locationResource = location.location_id;
    const accountId = location.gmb_account_id;

    if (!locationResource) {
      return NextResponse.json({ error: 'Location resource not found' }, { status: 400 });
    }

    // Get access token
    const accessToken = await getValidAccessToken(supabase, accountId);

    // Fetch place action links from Google
    const url = new URL(`${PLACE_ACTIONS_BASE}/${locationResource}/placeActionLinks`);
    
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Place Actions API] Error:', errorData);
      
      // 404 is normal - location may not have place action links
      if (response.status === 404) {
        return NextResponse.json({ 
          placeActionLinks: [],
          message: 'No place action links found for this location'
        });
      }
      
      return NextResponse.json(
        { 
          error: errorData.error?.message || 'Failed to fetch place action links',
          details: errorData
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({
      placeActionLinks: data.placeActionLinks || [],
      success: true
    });
  } catch (error: any) {
    console.error('[Place Actions API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch place action links' },
      { status: 500 }
    );
  }
}

