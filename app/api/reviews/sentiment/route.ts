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
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (!locations || locations.length === 0) {
      return NextResponse.json({
        positive: 0,
        neutral: 0,
        negative: 0,
        topics: []
      });
    }

    const locationIds = locations.map(l => l.id);

    // Fetch all reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('gmb_reviews')
      .select('rating, review_text, comment, ai_sentiment')
      .eq('user_id', user.id)
      .in('location_id', locationIds);

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    const allReviews = reviews || [];
    const totalReviews = allReviews.length;

    if (totalReviews === 0) {
      return NextResponse.json({
        positive: 0,
        neutral: 0,
        negative: 0,
        topics: []
      });
    }

    // Calculate sentiment distribution
    let positive = 0;
    let neutral = 0;
    let negative = 0;

    allReviews.forEach(review => {
      // Use ai_sentiment if available, otherwise infer from rating
      if (review.ai_sentiment) {
        if (review.ai_sentiment === 'positive') positive++;
        else if (review.ai_sentiment === 'negative') negative++;
        else neutral++;
      } else {
        // Infer from rating
        if (review.rating >= 4) positive++;
        else if (review.rating <= 2) negative++;
        else neutral++;
      }
    });

    const positivePercent = totalReviews > 0 ? Math.round((positive / totalReviews) * 100) : 0;
    const neutralPercent = totalReviews > 0 ? Math.round((neutral / totalReviews) * 100) : 0;
    const negativePercent = totalReviews > 0 ? Math.round((negative / totalReviews) * 100) : 0;

    // Extract hot topics (keywords) from review text
    const topics = extractHotTopics(allReviews);

    return NextResponse.json({
      positive: positivePercent,
      neutral: neutralPercent,
      negative: negativePercent,
      topics
    });

  } catch (error) {
    console.error('Sentiment API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function extractHotTopics(reviews: any[]): Array<{ topic: string; count: number }> {
  // Common keywords to look for
  const commonKeywords = [
    'service', 'quality', 'price', 'staff', 'clean', 'food', 'atmosphere',
    'location', 'wait', 'time', 'friendly', 'professional', 'recommend',
    'excellent', 'great', 'good', 'bad', 'poor', 'slow', 'fast', 'delicious',
    'ambiance', 'parking', 'wifi', 'music', 'decor', 'comfortable'
  ];

  const topicCounts: Record<string, number> = {};

  reviews.forEach(review => {
    const text = (review.review_text || review.comment || '').toLowerCase();
    
    commonKeywords.forEach(keyword => {
      if (text.includes(keyword)) {
        topicCounts[keyword] = (topicCounts[keyword] || 0) + 1;
      }
    });
  });

  // Convert to array and sort by count
  const topics = Object.entries(topicCounts)
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 topics

  return topics;
}

