import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// POST - Update multiple locations at once
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { locationIds, updates } = body;

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { error: 'Location IDs array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'Updates object is required' },
        { status: 400 }
      );
    }

    // Only allow updating specific fields
    const allowedFields = ['is_active', 'category', 'phone', 'website'];
    const sanitizedUpdates: any = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update locations
    const { error: updateError, count } = await supabase
      .from('gmb_locations')
      .update(sanitizedUpdates)
      .in('id', locationIds)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[POST /api/locations/bulk-update] Error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update locations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: count || 0,
      requested: locationIds.length,
    });
  } catch (error: any) {
    console.error('[POST /api/locations/bulk-update] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
