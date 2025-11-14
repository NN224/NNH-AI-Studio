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
    const chainName = searchParams.get('chainName');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');

    if (!chainName) {
      return NextResponse.json(
        { error: 'chainName parameter is required' },
        { status: 400 }
      );
    }

    const { data: account } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!account) {
      return NextResponse.json({ error: 'No active GMB account found' }, { status: 404 });
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    const url = new URL(`${GBP_LOC_BASE}/chains:search`);
    url.searchParams.set('chainName', chainName);
    url.searchParams.set('pageSize', Math.min(pageSize, 500).toString()); // Max 500 per API docs

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: 'Failed to search chains', details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Chains Search API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

