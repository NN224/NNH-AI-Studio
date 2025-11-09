import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, location, pageSize = 10 } = body;

    if (!query && !location) {
      return NextResponse.json(
        { error: 'Either query or location is required' },
        { status: 400 }
      );
    }

    const { data: account, error: accountError } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      console.error('[Google Locations Search API] Failed to load account:', accountError);
      return NextResponse.json(
        { error: 'Failed to load Google account', details: accountError.message },
        { status: 500 }
      );
    }

    if (!account) {
      return NextResponse.json(
        { error: 'No active Google account connected' },
        { status: 400 }
      );
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    const url = new URL(`${GBP_LOC_BASE}/googleLocations:search`);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        location,
        pageSize: Math.min(pageSize, 10), // Max 10 per API docs
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to search Google locations', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Google Locations Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

