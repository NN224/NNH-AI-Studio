import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidAccessToken } from '@/lib/gmb/helpers';

export const dynamic = 'force-dynamic';

const GBP_LOC_BASE = 'https://mybusinessbusinessinformation.googleapis.com/v1';

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

    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (accountsError) {
      console.error('[Categories API] Failed to load accounts:', accountsError);
      return NextResponse.json(
        { error: 'Failed to load Google account', details: accountsError.message },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ 
        categories: [],
        message: 'No GMB account connected' 
      });
    }
    
    const account = accounts[0];

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabase, account.id);
    } catch (tokenError: any) {
      console.error('[Categories API] Failed to get access token:', tokenError);
      return NextResponse.json(
        { error: tokenError.message || 'Failed to obtain Google access token' },
        { status: 401 }
      );
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

