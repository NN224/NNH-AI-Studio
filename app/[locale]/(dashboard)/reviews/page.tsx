import { createClient } from '@/lib/supabase/server';
import { ReviewsClientPage } from '@/components/reviews/ReviewsClientPage';
import { getReviews, getReviewStats } from '@/server/actions/reviews-management';
import { redirect } from 'next/navigation';

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: {
    location?: string;
    rating?: string;
    status?: string;
    page?: string;
    search?: string;
  };
}) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Parse search params
  const locationId = searchParams.location;
  const rating = searchParams.rating ? parseInt(searchParams.rating) : undefined;
  const status = searchParams.status as 'pending' | 'replied' | 'responded' | 'flagged' | 'archived' | undefined;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const searchQuery = searchParams.search || '';
  const limit = 50;
  const offset = (page - 1) * limit;

  // Fetch reviews and stats in parallel
  const [reviewsResult, statsResult, locationsResult] = await Promise.all([
    getReviews({
      locationId,
      rating,
      status,
      searchQuery,
      sortBy: 'newest',
      limit,
      offset,
    }),
    getReviewStats(locationId),
    supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  return (
    <ReviewsClientPage
      initialReviews={reviewsResult.data || []}
      stats={statsResult.data}
      totalCount={reviewsResult.count}
      locations={locationsResult.data || []}
      currentFilters={{
        locationId,
        rating,
        status,
        searchQuery,
        page,
      }}
    />
  );
}
