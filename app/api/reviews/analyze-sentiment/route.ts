import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mlSentimentService } from '@/lib/services/ml-sentiment-service';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * API endpoint to analyze sentiment for existing reviews
 * Can be called as a batch job to update historical data
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    // Get parameters
    const body = await request.json();
    const { 
      locationId,    // Optional: analyze reviews for specific location
      batchSize = 50, // Number of reviews to process at once
      onlyUnanalyzed = true, // Only process reviews without ML sentiment
    } = body;

    // Build query
    let query = supabase
      .from('gmb_reviews')
      .select(`
        id,
        review_text,
        comment,
        rating,
        location_id,
        gmb_locations!inner (
          user_id,
          location_name
        )
      `)
      .eq('gmb_locations.user_id', user.id);

    // Filter by location if specified
    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    // Filter unanalyzed reviews
    if (onlyUnanalyzed) {
      query = query.is('ai_sentiment_score', null);
    }

    // Limit batch size
    query = query.limit(batchSize);

    const { data: reviews, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reviews', details: error.message },
        { status: 500 }
      );
    }

    if (!reviews || reviews.length === 0) {
      return NextResponse.json({
        message: 'No reviews to analyze',
        analyzed: 0,
      });
    }

    // Prepare reviews for ML analysis
    const reviewsForAnalysis = reviews.map(review => ({
      id: review.id,
      text: review.review_text || review.comment || '',
      rating: review.rating,
    }));

    // Analyze sentiment in batches
    const mlResults = await mlSentimentService.analyzeBatch(reviewsForAnalysis);

    // Update reviews with ML results
    const updatePromises = Array.from(mlResults.entries()).map(async ([reviewId, result]) => {
      const { error: updateError } = await supabase
        .from('gmb_reviews')
        .update({
          ai_sentiment: result.sentiment,
          ai_sentiment_score: result.score,
          ai_sentiment_analysis: result,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reviewId);

      if (updateError) {
        console.error(`Failed to update review ${reviewId}:`, updateError);
        return false;
      }
      return true;
    });

    const updateResults = await Promise.all(updatePromises);
    const successCount = updateResults.filter(r => r).length;

    // Refresh materialized view if significant updates
    if (successCount > 10) {
      await supabase.rpc('refresh_sentiment_summary').catch(err => {
        console.error('Failed to refresh sentiment summary:', err);
      });
    }

    // Return results
    return NextResponse.json({
      message: 'Sentiment analysis completed',
      analyzed: successCount,
      failed: reviewsForAnalysis.length - successCount,
      total: reviewsForAnalysis.length,
      hasMore: reviews.length === batchSize, // Indicates if there are more reviews to process
    }, {
      headers: rateLimitHeaders as HeadersInit,
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check sentiment analysis status
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get counts of analyzed vs unanalyzed reviews
    const [
      { count: totalReviews },
      { count: analyzedReviews },
    ] = await Promise.all([
      supabase
        .from('gmb_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('gmb_locations.user_id', user.id),
      supabase
        .from('gmb_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('gmb_locations.user_id', user.id)
        .not('ai_sentiment_score', 'is', null),
    ]);

    const unanalyzedCount = (totalReviews || 0) - (analyzedReviews || 0);
    const percentComplete = totalReviews ? Math.round((analyzedReviews || 0) / totalReviews * 100) : 0;

    return NextResponse.json({
      totalReviews: totalReviews || 0,
      analyzedReviews: analyzedReviews || 0,
      unanalyzedReviews: unanalyzedCount,
      percentComplete,
      isComplete: unanalyzedCount === 0,
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
