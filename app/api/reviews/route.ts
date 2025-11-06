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

    // Build query
    let query = supabase
      .from('gmb_reviews')
      .select(`
        *,
        gmb_locations!inner (
          id,
          location_name,
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

    // Order and limit
    query = query.order('review_date', { ascending: false, nullsFirst: false }).limit(100);

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Add location_name to each review and filter by search if provided
    let reviewsWithLocation = (reviews || []).map(r => ({
      ...r,
      location_name: r.gmb_locations?.location_name
    }));

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
