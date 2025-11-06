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

    // Get user's locations
    const { data: locations } = await supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!locations || locations.length === 0) {
      return NextResponse.json({ reviews: [], stats: { pending: 0, responseRate: 0, avgTime: 0 } });
    }

    const locationIds = locations.map(l => l.id);
    const locationMap = new Map(locations.map(l => [l.id, l.location_name]));

    // Fetch reviews without responses
    // Check both has_response, reply_text, and review_reply fields
    const { data: reviews, error: reviewsError } = await supabase
      .from('gmb_reviews')
      .select('*')
      .eq('user_id', user.id)
      .in('location_id', locationIds)
      .or('has_response.is.null,has_response.eq.false')
      .is('reply_text', null)
      .is('review_reply', null)
      .order('review_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(100); // Limit to 100 most recent pending reviews

    if (reviewsError) {
      console.error('Error fetching pending reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch pending reviews' }, { status: 500 });
    }

    // Sort by priority: negative reviews first, then by date
    const sortedReviews = (reviews || []).sort((a, b) => {
      // Priority: negative sentiment first
      const aIsNegative = a.ai_sentiment === 'negative' || (a.rating && a.rating <= 2);
      const bIsNegative = b.ai_sentiment === 'negative' || (b.rating && b.rating <= 2);
      
      if (aIsNegative && !bIsNegative) return -1;
      if (!aIsNegative && bIsNegative) return 1;
      
      // Then by date (newest first)
      const aDate = new Date(a.review_date || a.created_at).getTime();
      const bDate = new Date(b.review_date || b.created_at).getTime();
      return bDate - aDate;
    });

    // Add location names
    const reviewsWithLocation = sortedReviews.map(review => ({
      ...review,
      location_name: locationMap.get(review.location_id) || 'Unknown Location'
    }));

    // Calculate stats
    const { data: allReviews } = await supabase
      .from('gmb_reviews')
      .select('reply_text, review_reply, has_response, review_date, reply_date, responded_at')
      .eq('user_id', user.id)
      .in('location_id', locationIds);

    const totalReviews = allReviews?.length || 0;
    const respondedReviews = allReviews?.filter(r => 
      r.reply_text || r.review_reply || r.has_response
    ).length || 0;
    
    const responseRate = totalReviews > 0 
      ? Math.round((respondedReviews / totalReviews) * 100) 
      : 0;

    // Calculate average response time (in hours)
    const responseTimes: number[] = [];
    allReviews?.forEach(review => {
      if (review.review_date && (review.reply_date || review.responded_at)) {
        const reviewDate = new Date(review.review_date);
        const responseDate = new Date(review.reply_date || review.responded_at!);
        const hours = (responseDate.getTime() - reviewDate.getTime()) / (1000 * 60 * 60);
        if (hours > 0 && hours < 720) { // Only count reasonable times (less than 30 days)
          responseTimes.push(hours);
        }
      }
    });

    const avgTime = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    return NextResponse.json({
      reviews: reviewsWithLocation,
      stats: {
        pending: reviewsWithLocation.length,
        responseRate,
        avgTime
      }
    });

  } catch (error) {
    console.error('Pending reviews API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

