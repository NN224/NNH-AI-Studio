import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint to debug Google Business Information API attributes endpoint
 * Usage: GET /api/gmb/test-attributes?locationId=xxx or ?locationResource=locations/xxx
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get('locationId');
    const locationResource = searchParams.get('locationResource'); // e.g., "locations/123456"

    // Get access token
    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'No active GMB account' }, { status: 404 });
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    let testLocationResource = locationResource;

    // If locationId provided, get the location resource
    if (locationId && !locationResource) {
      const { data: location } = await supabase
        .from('gmb_locations')
        .select('location_id')
        .eq('id', locationId)
        .eq('user_id', user.id)
        .single();

      if (!location) {
        return NextResponse.json({ error: 'Location not found' }, { status: 404 });
      }

      testLocationResource = location.location_id;
    }

    if (!testLocationResource) {
      // Get first location as sample
      const { data: locations } = await supabase
        .from('gmb_locations')
        .select('location_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!locations || locations.length === 0) {
        return NextResponse.json({ error: 'No locations found' }, { status: 404 });
      }

      testLocationResource = locations[0].location_id;
    }

    // Test different possible endpoints
    const baseUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1';
    const tests = [
      {
        name: 'Location Attributes (GET)',
        url: `${baseUrl}/${testLocationResource}/attributes`,
        method: 'GET',
      },
      {
        name: 'Location Attributes with query params',
        url: `${baseUrl}/${testLocationResource}/attributes?readMask=attributes.name,attributes.valueType`,
        method: 'GET',
      },
    ];

    const results = [];

    for (const test of tests) {
      try {
        const response = await fetch(test.url, {
          method: test.method,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        const responseText = await response.text();
        let responseData: any = {};
        
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { raw: responseText };
        }

        results.push({
          test: test.name,
          url: test.url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          data: response.ok ? responseData : null,
          error: !response.ok ? responseData : null,
          headers: Object.fromEntries(response.headers.entries()),
        });
      } catch (error: any) {
        results.push({
          test: test.name,
          url: test.url,
          error: error.message,
          stack: error.stack,
        });
      }
    }

    return NextResponse.json({
      locationResource: testLocationResource,
      accessTokenPrefix: accessToken?.substring(0, 20) + '...',
      tests: results,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

