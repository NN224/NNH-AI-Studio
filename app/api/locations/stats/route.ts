import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// GET - Get location statistics
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

    // Get active account IDs
    const { data: accounts } = await supabase
      .from('gmb_accounts')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    const accountIds = accounts?.map(acc => acc.id) || [];

    if (accountIds.length === 0) {
      return NextResponse.json({
        totalLocations: 0,
        avgRating: 0,
        totalReviews: 0,
        avgHealthScore: 0,
        locationsByCategory: {},
        locationsByStatus: {},
      });
    }

    // Get locations
    const { data: locations, error: locationsError } = await supabase
      .from('gmb_locations')
      .select('id, rating, review_count, category, health_score')
      .eq('user_id', user.id)
      .in('gmb_account_id', accountIds)
      .eq('is_active', true);

    if (locationsError) {
      console.error('[GET /api/locations/stats] Error:', locationsError);
      return NextResponse.json(
        { error: 'Failed to fetch locations' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalLocations = locations?.length || 0;
    const avgRating = totalLocations > 0
      ? locations!.reduce((sum, loc) => sum + (loc.rating || 0), 0) / totalLocations
      : 0;
    const totalReviews = locations?.reduce((sum, loc) => sum + (loc.review_count || 0), 0) || 0;
    const avgHealthScore = totalLocations > 0
      ? locations!.reduce((sum, loc) => sum + (loc.health_score || 0), 0) / totalLocations
      : 0;

    // Group by category
    const locationsByCategory: Record<string, number> = {};
    locations?.forEach(loc => {
      const category = loc.category || 'Uncategorized';
      locationsByCategory[category] = (locationsByCategory[category] || 0) + 1;
    });

    return NextResponse.json({
      totalLocations,
      avgRating: parseFloat(avgRating.toFixed(2)),
      totalReviews,
      avgHealthScore: Math.round(avgHealthScore),
      locationsByCategory,
    });

  } catch (error: any) {
    console.error('[GET /api/locations/stats] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
