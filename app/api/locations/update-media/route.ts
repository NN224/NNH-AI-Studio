import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id, logo_url, cover_photo_url } = body as {
      id?: string;
      logo_url?: string | null;
      cover_photo_url?: string | null;
    };

    if (!id) {
      return NextResponse.json({ error: 'Missing location id' }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};
    if (typeof logo_url !== 'undefined') updates.logo_url = logo_url;
    if (typeof cover_photo_url !== 'undefined') updates.cover_photo_url = cover_photo_url;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('gmb_locations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update media fields', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    );
  }
}


