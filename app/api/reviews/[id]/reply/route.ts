import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: reviewId } = params;
    const body = await request.json();
    const { reply_text } = body;

    if (!reply_text || typeof reply_text !== 'string' || reply_text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Reply text is required' },
        { status: 400 }
      );
    }

    // Verify review belongs to user
    const { data: review, error: reviewError } = await supabase
      .from('gmb_reviews')
      .select('*, gmb_locations!inner(user_id)')
      .eq('id', reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.gmb_locations?.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update review with reply
    const { error: updateError } = await supabase
      .from('gmb_reviews')
      .update({
        reply_text: reply_text.trim(),
        review_reply: reply_text.trim(), // Keep both for backwards compatibility
        reply_date: new Date().toISOString(),
        has_reply: true,
        has_response: true,
        response_text: reply_text.trim(),
        responded_at: new Date().toISOString(),
        status: 'responded',
        updated_at: new Date().toISOString()
      })
      .eq('id', reviewId);

    if (updateError) {
      console.error('Error updating review:', updateError);
      return NextResponse.json(
        { error: 'Failed to save reply', details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reply saved successfully'
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

