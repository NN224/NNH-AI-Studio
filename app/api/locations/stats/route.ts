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

    // Get locations - health_score is stored in metadata JSONB column
    const { data: locations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id, rating, review_count, category, metadata')
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

    // Calculate statistics
    const totalLocations = locations?.length || 0;
    
    // Calculate average rating - only from locations with valid ratings (> 0)
    const locationsWithRating = locations?.filter(loc => loc.rating && loc.rating > 0) || [];
    const avgRating = locationsWithRating.length > 0
      ? locationsWithRating.reduce((sum, loc) => sum + (loc.rating || 0), 0) / locationsWithRating.length
      : 0;
    
    const totalReviews = locations?.reduce((sum, loc) => sum + (loc.review_count || 0), 0) || 0;
    
    // Extract health_score from metadata (can be health_score or healthScore)
    const avgHealthScore = totalLocations > 0
      ? locations!.reduce((sum, loc) => {
          const metadata = loc.metadata || {};
          const healthScore = metadata.health_score ?? metadata.healthScore ?? 0;
          return sum + (typeof healthScore === 'number' ? healthScore : 0);
        }, 0) / totalLocations
      : 0;

    console.log('[GET /api/locations/stats] Calculated stats:', {
      totalLocations,
      avgRating,
      totalReviews,
      avgHealthScore,
      locationsWithRatingCount: locationsWithRating.length,
    });

    // Group by category
    const locationsByCategory: Record<string, number> = {};
    locations?.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      locationsByCategory[category] = (locationsByCategory[category] || 0) + 1;
    });

    const response = {
      totalLocations,
      avgRating: parseFloat(avgRating.toFixed(2)),
      totalReviews,
      avgHealthScore: Math.round(avgHealthScore),
      locationsByCategory,
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
