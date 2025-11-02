import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Test endpoint for Google My Business Q&A API
 * 
 * Usage:
 *   GET /api/gmb/test-qa?action=list&locationId=xxx
 *   GET /api/gmb/test-qa?action=list&locationResource=locations/xxx
 *   GET /api/gmb/test-qa?action=get&locationResource=locations/xxx&questionId=xxx
 */
const QANDA_API_BASE = 'https://mybusinessqanda.googleapis.com/v1';

async function getValidAccessToken(supabase: any): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: accounts } = await supabase
    .from('gmb_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .limit(1);

  if (!accounts || accounts.length === 0) {
    return null;
  }

  const account = accounts[0];
  const now = new Date();
  const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : null;

  if (!expiresAt || now >= expiresAt) {
    if (!account.refresh_token) {
      throw new Error('No refresh token available');
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
      throw new Error(`Token refresh failed: ${refreshData.error || 'Unknown error'}`);
    }

    const newExpiresAt = new Date();
    newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshData.expires_in);

    await supabase
      .from('gmb_accounts')
      .update({
        access_token: refreshData.access_token,
        token_expires_at: newExpiresAt.toISOString(),
        ...(refreshData.refresh_token && { refresh_token: refreshData.refresh_token }),
      })
      .eq('id', accounts[0].id);

    return refreshData.access_token;
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
    const action = searchParams.get('action') || 'list';
    const locationId = searchParams.get('locationId');
    const locationResource = searchParams.get('locationResource');
    const questionId = searchParams.get('questionId');

    const accessToken = await getValidAccessToken(supabase);
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No active GMB account' }, { status: 404 });
    }

    let testLocationResource = locationResource;

    // Get location resource if locationId provided
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

    const results: any[] = [];

    // Test 1: List questions
    if (action === 'list' || action === 'all') {
      const listUrl = `${QANDA_API_BASE}/${testLocationResource}/questions`;
      
      try {
        const response = await fetch(listUrl, {
          method: 'GET',
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
          test: 'List Questions',
          url: listUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          data: response.ok ? responseData : null,
          error: !response.ok ? responseData : null,
        });
      } catch (error: any) {
        results.push({
          test: 'List Questions',
          url: listUrl,
          error: error.message,
        });
      }
    }

    // Test 2: Get specific question (if questionId provided)
    if ((action === 'get' || action === 'all') && questionId) {
      const getUrl = `${QANDA_API_BASE}/${testLocationResource}/questions/${questionId}`;
      
      try {
        const response = await fetch(getUrl, {
          method: 'GET',
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
          test: 'Get Question',
          url: getUrl,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          data: response.ok ? responseData : null,
          error: !response.ok ? responseData : null,
        });
      } catch (error: any) {
        results.push({
          test: 'Get Question',
          url: getUrl,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      locationResource: testLocationResource,
      action,
      accessTokenPrefix: accessToken.substring(0, 30) + '...',
      tests: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}

