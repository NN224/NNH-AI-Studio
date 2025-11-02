import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
    const { data: accounts } = await supabase
      .from('gmb_accounts')
      .select('access_token, refresh_token, token_expires_at')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ error: 'No active GMB account' }, { status: 404 });
    }

    const account = accounts[0];
    let accessToken = account.access_token;

    // Refresh token if expired
    if (account.token_expires_at && new Date(account.token_expires_at) < new Date()) {
      if (!account.refresh_token) {
        return NextResponse.json({ error: 'Token expired and no refresh token' }, { status: 401 });
      }

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
      });

      const refreshData = await refreshResponse.json();
      if (!refreshResponse.ok) {
        return NextResponse.json({ error: 'Token refresh failed', details: refreshData }, { status: 401 });
      }

      accessToken = refreshData.access_token;
    }

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

