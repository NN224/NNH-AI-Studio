import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuestionsClientPage } from '@/components/questions/QuestionsClientPage';
import { getQuestions, getQuestionStats } from '@/server/actions/questions-management';

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: {
    location?: string;
    status?: string;
    priority?: string;
    search?: string;
    page?: string;
    sortBy?: string;
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
  const status = searchParams.status as 'unanswered' | 'answered' | 'all' | undefined;
  const priority = searchParams.priority;
  const searchQuery = searchParams.search || '';
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const sortBy = (searchParams.sortBy as 'newest' | 'oldest' | 'most_upvoted' | 'urgent') || 'newest';
  const limit = 50;
  const offset = (page - 1) * limit;

  // Fetch questions and stats in parallel
  const [questionsResult, statsResult, locationsResult] = await Promise.all([
    getQuestions({
      locationId,
      status,
      priority,
      searchQuery,
      sortBy,
      limit,
      offset,
    }),
    getQuestionStats(locationId),
    supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  return (
    <QuestionsClientPage
      initialQuestions={questionsResult.data || []}
      stats={statsResult.data}
      totalCount={questionsResult.count}
      locations={locationsResult.data || []}
      currentFilters={{
        locationId,
        status,
        priority,
        searchQuery,
        page,
        sortBy,
      }}
    />
  );
}
