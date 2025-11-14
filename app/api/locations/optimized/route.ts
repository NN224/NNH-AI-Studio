import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { applySafeSearchFilter } from '@/lib/utils/secure-search';

export const dynamic = 'force-dynamic';

/**
 * Optimized locations API that avoids N+1 queries
 * Uses joins and aggregations for better performance
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

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '50', 10)));
    
    const validSortFields = ['location_name', 'rating', 'review_count', 'health_score', 'created_at', 'updated_at'];
    const sortBy = validSortFields.includes(searchParams.get('sortBy') || 'location_name') 
      ? (searchParams.get('sortBy') || 'location_name')
      : 'location_name';

    // Use the materialized view for aggregated stats if available
    // Otherwise, use a single query with window functions
    let query = supabase
      .from('gmb_locations')
      .select(`
        *,
        review_stats:gmb_reviews(count),
        pending_reviews:gmb_reviews!inner(count),
        question_stats:gmb_questions(count),
        pending_questions:gmb_questions!inner(count),
        recent_reviews:gmb_reviews!inner(
          id,
          rating,
          review_text,
          reviewer_name,
          review_date,
          has_reply
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Add filters for the inner joins
    query = query
      .eq('pending_reviews.has_reply', false)
      .in('pending_questions.answer_status', ['unanswered', 'pending'])
      .gte('recent_reviews.review_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('recent_reviews.review_date', { ascending: false })
      .limit(5, { foreignTable: 'recent_reviews' });

    // Apply search filter
    if (search) {
      try {
        query = applySafeSearchFilter(query, search, ['location_name', 'address']);
      } catch (error) {
        console.warn('Invalid search input detected:', error);
      }
    }

    // Apply other filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (status && status !== 'all') {
      if (status === 'verified') {
        query = query.eq('status', 'verified');
      } else if (status === 'pending') {
        query = query.or('status.eq.pending,status.eq.suspended');
      }
    }

    // Apply sorting with nulls handling
    const sortConfig = {
      ascending: sortOrder === 'asc',
      nullsFirst: false
    };

    if (sortBy === 'rating' || sortBy === 'health_score') {
      // For numeric fields, put nulls last
      sortConfig.nullsFirst = sortOrder === 'desc';
    }

    query = query.order(sortBy, sortConfig);

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: locations, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        {
          error: 'Database error',
          message: 'Failed to fetch locations'
        },
        { status: 500 }
      );
    }

    // Transform the data to include aggregated counts
    const transformedLocations = locations?.map(location => {
      const reviewCount = location.review_stats?.[0]?.count || 0;
      const pendingReviewCount = location.pending_reviews?.length || 0;
      const questionCount = location.question_stats?.[0]?.count || 0;
      const pendingQuestionCount = location.pending_questions?.length || 0;
      const recentReviews = location.recent_reviews || [];

      // Calculate average recent rating
      const recentRatings = recentReviews.map((r: any) => r.rating).filter((r: any) => r != null);
      const avgRecentRating = recentRatings.length > 0 
        ? recentRatings.reduce((sum: any, r: any) => sum + r, 0) / recentRatings.length
        : null;

      // Clean up the location object
      const { review_stats, pending_reviews, question_stats, pending_questions, recent_reviews, ...cleanLocation } = location;

      return {
        ...cleanLocation,
        // Add computed stats
        stats: {
          totalReviews: reviewCount,
          pendingReviews: pendingReviewCount,
          totalQuestions: questionCount,
          pendingQuestions: pendingQuestionCount,
          recentReviewsCount: recentReviews.length,
          avgRecentRating: avgRecentRating,
          lastReviewDate: recentReviews[0]?.review_date || null,
        },
        // Include a few recent reviews for preview
        recentReviews: recentReviews.slice(0, 3).map((r: any) => ({
          id: r.id,
          rating: r.rating,
          text: r.review_text?.substring(0, 100) + (r.review_text?.length > 100 ? '...' : ''),
          reviewer: r.reviewer_name,
          date: r.review_date,
          hasReply: r.has_reply,
        })),
      };
    }) || [];

    const totalCount = count || 0;
    const hasMore = totalCount > to + 1;

    // Set cache headers
    const headers = new Headers({
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
      ...Object.fromEntries(
        Object.entries(rateLimitHeaders).map(([k, v]) => [k, String(v)])
      ),
    });

    return NextResponse.json(
      {
        locations: transformedLocations,
        total: totalCount,
        page,
        pageSize,
        hasMore,
        stats: {
          totalLocations: totalCount,
          categoryCounts: getCategoryCounts(transformedLocations),
        }
      },
      { 
        status: 200,
        headers
      }
    );
  } catch (error) {
    console.error('Locations API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get category counts
 */
function getCategoryCounts(locations: any[]) {
  const counts: Record<string, number> = {};
  locations.forEach(loc => {
    if (loc.category) {
      counts[loc.category] = (counts[loc.category] || 0) + 1;
    }
  });
  return counts;
}
