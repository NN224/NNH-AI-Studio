import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rating = searchParams.get('rating');
    const sentiment = searchParams.get('sentiment');
    const search = searchParams.get('search');

    // Build query - select all fields including comment and review_text
    let query = supabase
      .from('gmb_reviews')
      .select(`
        id,
        review_id,
        reviewer_name,
        reviewer_profile_photo_url,
        rating,
        comment,
        review_text,
        reply_text,
        has_reply,
        review_date,
        replied_at,
        ai_sentiment,
        location_id,
        external_review_id,
        gmb_account_id,
        created_at,
        updated_at,
        gmb_locations!inner (
          id,
          location_name,
          name,
          address,
          user_id
        )
      `)
      .eq('gmb_locations.user_id', user.id);

    // Apply filters
    if (rating) {
      query = query.eq('rating', parseInt(rating));
    }

    if (sentiment) {
      query = query.eq('ai_sentiment', sentiment);
    }

    // Order and limit - increased to 500 to show all reviews
    query = query.order('review_date', { ascending: false, nullsFirst: false }).limit(500);

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data properly - use comment field which is the actual review text
    // Note: gmb_locations is an array from the join, so we access the first element
    let reviewsWithLocation = (reviews || []).map(r => {
      const location = Array.isArray(r.gmb_locations) ? r.gmb_locations[0] : r.gmb_locations;
      return {
        ...r,
        location_name: location?.location_name || location?.name || 'Unknown Location',
        // Use 'comment' field which is the actual review text, fallback to review_text
        review_text: r.comment || r.review_text || '',
        reviewer_name: r.reviewer_name || 'Anonymous'
      };
    });

    // Client-side search filter (since Supabase text search might be complex)
    if (search) {
      const searchLower = search.toLowerCase();
      reviewsWithLocation = reviewsWithLocation.filter(r => 
        r.review_text?.toLowerCase().includes(searchLower) ||
        r.reviewer_name?.toLowerCase().includes(searchLower) ||
        r.location_name?.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({ reviews: reviewsWithLocation });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
