import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Optimized dashboard stats API that uses database views and functions
 * Avoids N+1 queries by using pre-aggregated data
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
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    // Use the dashboard stats view for optimized queries
    const { data: dashboardStats, error: statsError } = await supabase
      .from('v_dashboard_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Dashboard stats error:', statsError);
    }

    // Use materialized view for location stats if available
    const { data: locationStats, error: locationStatsError } = await supabase
      .from('mv_location_stats')
      .select('*')
      .eq('user_id', user.id);

    if (locationStatsError) {
      console.error('Location stats error:', locationStatsError);
    }

    // Get health score distribution (skip if view doesn't exist)
    let healthScores = null;
    try {
      const { data, error: healthError } = await supabase
        .from('v_health_score_distribution')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (healthError && healthError.code !== 'PGRST116' && healthError.code !== 'PGRST205') {
        console.error('Health score error:', healthError);
      } else {
        healthScores = data;
      }
    } catch (error) {
      // View doesn't exist, skip it
      console.log('Health score view not available, skipping...');
    }

    // Get recent activity using a single optimized query
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const [
      { data: recentReviews, error: recentReviewsError },
      { data: recentQuestions, error: recentQuestionsError },
      { data: trendData, error: trendError }
    ] = await Promise.all([
      // Recent reviews with location info
      supabase
        .from('gmb_reviews')
        .select(`
          id,
          rating,
          review_text,
          reviewer_name,
          review_date,
          has_reply,
          location:gmb_locations!inner(id, location_name)
        `)
        .eq('user_id', user.id)
        .gte('review_date', thirtyDaysAgo)
        .order('review_date', { ascending: false })
        .limit(5),
      
      // Recent questions with location info
      supabase
        .from('gmb_questions')
        .select(`
          id,
          question_text,
          author_name,
          created_at,
          answer_status,
          location:gmb_locations!inner(id, location_name)
        `)
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(5),
      
      // Trend data using window functions
      supabase.rpc('get_dashboard_trends', {
        p_user_id: user.id,
        p_days: 30
      })
    ]);

    // Handle errors gracefully
    if (recentReviewsError) console.error('Recent reviews error:', recentReviewsError);
    if (recentQuestionsError) console.error('Recent questions error:', recentQuestionsError);
    if (trendError) console.error('Trend data error:', trendError);

    // Calculate derived metrics
    const stats = dashboardStats || {
      total_locations: 0,
      avg_rating: 0,
      total_reviews: 0,
      response_rate: 0,
      pending_reviews: 0,
      recent_reviews: 0,
      pending_questions: 0,
      recent_questions: 0,
    };

    // Aggregate location-level stats if available
    const aggregatedLocationStats = locationStats?.reduce((acc, loc) => {
      acc.totalReviews += loc.total_reviews || 0;
      acc.pendingReviews += loc.pending_reviews || 0;
      acc.totalQuestions += loc.total_questions || 0;
      acc.unansweredQuestions += loc.unanswered_questions || 0;
      return acc;
    }, {
      totalReviews: 0,
      pendingReviews: 0,
      totalQuestions: 0,
      unansweredQuestions: 0,
    }) || stats;

    // Build response
    const response = {
      // Core metrics
      totalLocations: stats.total_locations,
      averageRating: Math.round(stats.avg_rating * 10) / 10,
      totalReviews: aggregatedLocationStats.totalReviews || stats.total_reviews,
      responseRate: Math.round(stats.response_rate * 10) / 10,
      
      // Pending items
      pendingReviews: aggregatedLocationStats.pendingReviews || stats.pending_reviews,
      pendingQuestions: aggregatedLocationStats.unansweredQuestions || stats.pending_questions,
      
      // Health metrics
      healthScore: healthScores?.avg_health_score ? Math.round(healthScores.avg_health_score) : 0,
      healthDistribution: {
        excellent: healthScores?.excellent_count || 0,
        good: healthScores?.good_count || 0,
        fair: healthScores?.fair_count || 0,
        needsAttention: healthScores?.needs_attention_count || 0,
      },
      
      // Recent activity
      recentActivity: {
        reviews: (recentReviews || []).map(r => ({
          id: r.id,
          rating: r.rating,
          text: r.review_text?.substring(0, 100),
          reviewer: r.reviewer_name,
          date: r.review_date,
          hasReply: r.has_reply,
          locationName: r.location?.[0]?.location_name || 'Unknown',
        })),
        questions: (recentQuestions || []).map(q => ({
          id: q.id,
          text: q.question_text?.substring(0, 100),
          author: q.author_name,
          date: q.created_at,
          status: q.answer_status,
          locationName: q.location?.[0]?.location_name || 'Unknown',
        })),
      },
      
      // Trends
      trends: trendData || {
        reviews: { current: 0, previous: 0, change: 0 },
        questions: { current: 0, previous: 0, change: 0 },
        rating: { current: 0, previous: 0, change: 0 },
        responseRate: { current: 0, previous: 0, change: 0 },
      },
      
      // Metadata
      lastUpdated: new Date().toISOString(),
      cacheExpiry: 300, // 5 minutes
    };

    // Set cache headers
    const headers = new Headers({
      'Cache-Control': 'private, max-age=60, stale-while-revalidate=240',
      'X-Stats-Source': locationStats ? 'materialized-view' : 'live-query',
      ...Object.fromEntries(
        Object.entries(rateLimitHeaders).map(([k, v]) => [k, String(v)])
      ),
    });

    return NextResponse.json(response, { 
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Dashboard stats API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch dashboard statistics'
      },
      { status: 500 }
    );
  }
}

/**
 * POST endpoint to refresh materialized views
 * Should be called periodically (e.g., via cron job)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // This endpoint should ideally be protected with an API key
    // or limited to admin users only
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Refresh materialized view
    const { error } = await supabase.rpc('refresh_location_stats');
    
    if (error) {
      console.error('Failed to refresh stats:', error);
      return NextResponse.json(
        { error: 'Failed to refresh statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Statistics refreshed successfully',
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Stats refresh error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}