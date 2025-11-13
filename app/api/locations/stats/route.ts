import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Get location statistics
export async function GET(request: NextRequest) {
  try {
    console.log('[GET /api/locations/stats] Request received');
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[GET /api/locations/stats] Auth error:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[GET /api/locations/stats] User authenticated:', user.id);

    // Get active account IDs
    const { data: accounts, error: accountsError } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (accountsError) {
      console.error('[GET /api/locations/stats] Error fetching accounts:', accountsError);
    }

    const accountIds = accounts?.map(acc => acc.id) || [];
    console.log('[GET /api/locations/stats] Active account IDs:', accountIds);

    if (accountIds.length === 0) {
      console.log('[GET /api/locations/stats] No active accounts found, returning zeros');
      return NextResponse.json({
        totalLocations: 0,
        avgRating: 0,
        totalReviews: 0,
        avgHealthScore: 0,
        locationsByCategory: {},
        locationsByStatus: {},
      });
    }

    // Get locations with all necessary fields for calculations
    const { data: locations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id, rating, review_count, category, status, metadata, phone, website, address, business_hours')
      .eq('user_id', user.id)
      .in('gmb_account_id', accountIds)
      .eq('is_active', true);

    if (locationsError) {
      console.error('[GET /api/locations/stats] Error fetching locations:', locationsError);
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    console.log('[GET /api/locations/stats] Locations found:', locations?.length || 0);
    console.log('[GET /api/locations/stats] Sample location data:', locations?.[0]);

    const totalLocations = locations?.length || 0;
    const locationIds = locations?.map(loc => loc.id) || [];

    if (locationIds.length === 0) {
      return NextResponse.json({
        totalLocations: 0,
        avgRating: 0,
        totalReviews: 0,
        avgHealthScore: 0,
        locationsByCategory: {},
        locationsByStatus: {},
      });
    }

    // Get all reviews for all locations to calculate accurate ratings and response rates
    const { data: allReviews, error: reviewsError } = await supabase
      .from('gmb_reviews')
      .select('location_id, rating, review_reply, reply_text, has_reply')
      .in('location_id', locationIds)
      .eq('user_id', user.id);

    if (reviewsError) {
      console.error('[GET /api/locations/stats] Error fetching reviews:', reviewsError);
    }

    // Group reviews by location
    const reviewsByLocation: Record<string, any[]> = {};
    (allReviews || []).forEach(review => {
      if (!reviewsByLocation[review.location_id]) {
        reviewsByLocation[review.location_id] = [];
      }
      reviewsByLocation[review.location_id].push(review);
    });

    // Calculate average rating
    // Strategy: Use location.rating if > 0, otherwise calculate from reviews
    let totalRating = 0;
    let locationsWithValidRating = 0;

    locations?.forEach(loc => {
      let locationRating = 0;
      
      // Check if location has a valid rating in database
      if (loc.rating && parseFloat(loc.rating.toString()) > 0) {
        locationRating = parseFloat(loc.rating.toString());
      } else {
        // Calculate from reviews if database rating is missing or 0
        const locationReviews = reviewsByLocation[loc.id] || [];
        if (locationReviews.length > 0) {
          const sum = locationReviews.reduce((s, r) => s + (r.rating || 0), 0);
          locationRating = sum / locationReviews.length;
        }
      }

      if (locationRating > 0) {
        totalRating += locationRating;
        locationsWithValidRating++;
      }
    });

    const avgRating = locationsWithValidRating > 0
      ? totalRating / locationsWithValidRating
      : 0;

    // Calculate total reviews
    const totalReviews = locations?.reduce((sum, loc) => {
      const locationReviews = reviewsByLocation[loc.id] || [];
      // Use review_count from location if available, otherwise use actual reviews count
      return sum + (loc.review_count && loc.review_count > 0 ? loc.review_count : locationReviews.length);
    }, 0) || 0;

    // Get additional data for health score calculation
    const [postsResult, attributesResult] = await Promise.all([
      supabase
        .from('gmb_posts')
        .select('location_id, created_at')
        .in('location_id', locationIds)
        .eq('user_id', user.id),
      supabase
        .from('gmb_attributes')
        .select('location_id')
        .in('location_id', locationIds)
        .eq('user_id', user.id)
    ]);

    const allPosts = postsResult.data || [];
    const allAttributes = attributesResult.data || [];

    // Group posts and attributes by location
    const postsByLocation: Record<string, any[]> = {};
    allPosts.forEach(post => {
      if (!postsByLocation[post.location_id]) {
        postsByLocation[post.location_id] = [];
      }
      postsByLocation[post.location_id].push(post);
    });

    const attributesByLocation: Record<string, any[]> = {};
    allAttributes.forEach(attr => {
      if (!attributesByLocation[attr.location_id]) {
        attributesByLocation[attr.location_id] = [];
      }
      attributesByLocation[attr.location_id].push(attr);
    });

    // Calculate health score for each location (using same logic as single location API)
    let totalHealthScore = 0;
    locations?.forEach(loc => {
      const locationReviews = reviewsByLocation[loc.id] || [];
      const locationPosts = postsByLocation[loc.id] || [];
      const locationAttributes = attributesByLocation[loc.id] || [];
      
      // Calculate health score using same logic as single location API
      const metadata = loc.metadata || {};
      let completenessScore = 0;

      // Basic info (40 points)
      if (loc.phone) completenessScore += 8;
      if (loc.website) completenessScore += 8;
      if (loc.address) completenessScore += 8;
      if (loc.category) completenessScore += 8;
      if (loc.business_hours && Object.keys(loc.business_hours).length > 0) completenessScore += 8;

      // Profile details (30 points)
      if (metadata.profile?.description) completenessScore += 10;
      if (metadata.regularHours?.periods?.length > 0) completenessScore += 10;
      if (metadata.serviceItems?.length > 0) completenessScore += 10;

      // Media (20 points)
      const photosCount = metadata.mediaCount || 0;
      if (photosCount >= 10) completenessScore += 20;
      else if (photosCount >= 5) completenessScore += 15;
      else if (photosCount > 0) completenessScore += 10;

      // Attributes (10 points)
      if (locationAttributes.length >= 5) completenessScore += 10;
      else if (locationAttributes.length >= 3) completenessScore += 7;
      else if (locationAttributes.length > 0) completenessScore += 5;

      const normalizedCompleteness = Math.min(100, completenessScore);

      // Review Response Rate (40% weight)
      const totalLocationReviews = locationReviews.length;
      const respondedReviews = locationReviews.filter(r => {
        const hasReply = (r.review_reply && r.review_reply.trim() !== '') ||
                         (r.reply_text && r.reply_text.trim() !== '') ||
                         (r.has_reply === true);
        return hasReply;
      }).length;
      const responseRate = totalLocationReviews > 0 ? (respondedReviews / totalLocationReviews) * 100 : 0;

      // Recent Activity (20% weight)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentPostsCount = locationPosts.filter(post => {
        const postDate = new Date(post.created_at);
        return postDate >= thirtyDaysAgo;
      }).length;

      let activityScore = 0;
      if (recentPostsCount >= 4) activityScore = 100;
      else if (recentPostsCount >= 2) activityScore = 75;
      else if (recentPostsCount >= 1) activityScore = 50;
      else activityScore = 25;

      // Calculate weighted health score
      const healthScore = Math.round(
        (normalizedCompleteness * 0.4) + 
        (responseRate * 0.4) + 
        (activityScore * 0.2)
      );

      totalHealthScore += Math.min(100, Math.max(0, healthScore));
    });

    const avgHealthScore = totalLocations > 0
      ? Math.round(totalHealthScore / totalLocations)
      : 0;

    console.log('[GET /api/locations/stats] Calculated stats:', {
      totalLocations,
      avgRating: Math.round(avgRating * 10) / 10,
      totalReviews,
      avgHealthScore,
      locationsWithValidRating,
      reviewsCount: allReviews?.length || 0,
    });

    // Group by category and status
    const locationsByCategory: Record<string, number> = {};
    const locationsByStatus: Record<string, number> = {};
    locations?.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      locationsByCategory[category] = (locationsByCategory[category] || 0) + 1;

      const statusKey = (loc.status || 'unknown').toString();
      locationsByStatus[statusKey] = (locationsByStatus[statusKey] || 0) + 1;
    });

    const response = {
      totalLocations,
      avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal place
      totalReviews,
      avgHealthScore: Math.round(avgHealthScore),
      locationsByCategory,
      locationsByStatus,
    };

    console.log('[GET /api/locations/stats] Returning response:', response);

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[GET /api/locations/stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
