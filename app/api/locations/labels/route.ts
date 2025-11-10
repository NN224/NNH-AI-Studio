import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Fetch all labels for the current user
export async function GET() {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: labels, error } = await supabase
      .from('location_labels')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) {
      console.error('[GET /api/locations/labels] Error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch labels' },
        { status: 500 }
      );
    }

    return NextResponse.json({ labels: labels || [] });
  } catch (error: any) {
    console.error('[GET /api/locations/labels] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new label
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
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Label name is required' },
        { status: 400 }
      );
    }

    if (name.length > 50) {
      return NextResponse.json(
        { error: 'Label name must be 50 characters or less' },
        { status: 400 }
      );
    }

    // Check if label with same name already exists for this user
    const { data: existing } = await supabase
      .from('location_labels')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name.trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'A label with this name already exists' },
        { status: 409 }
      );
    }

    const { data: label, error } = await supabase
      .from('location_labels')
      .insert({
        user_id: user.id,
        name: name.trim(),
        color: color || '#3b82f6',
      })
      .select()
      .single();

    if (error) {
      console.error('[POST /api/locations/labels] Error:', error);
      return NextResponse.json(
        { error: 'Failed to create label' },
        { status: 500 }
      );
    }

    return NextResponse.json({ label }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/locations/labels] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a label
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const labelId = searchParams.get('id');

    if (!labelId) {
      return NextResponse.json(
        { error: 'Label ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('location_labels')
      .delete()
      .eq('id', labelId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[DELETE /api/locations/labels] Error:', error);
      return NextResponse.json(
        { error: 'Failed to delete label' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DELETE /api/locations/labels] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
