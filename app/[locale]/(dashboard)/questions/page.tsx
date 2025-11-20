import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { QuestionsClientPage } from '@/components/questions/QuestionsClientPage';
import { getQuestions } from '@/server/actions/questions-management';
import { getAuthUrl } from '@/lib/utils/navigation';

export default async function QuestionsPage({
  params,
  searchParams,
}: {
  params: { locale: string };
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
    const locale = params.locale || 'en';
    redirect(getAuthUrl(locale as 'en' | 'ar', 'login'));
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
  const [questionsResult, locationsResult] = await Promise.all([
    getQuestions({
      locationId,
      status,
      priority,
      searchQuery,
      sortBy,
      limit,
      offset,
    }),
    supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('dashboard:refresh'));
    console.log('[QuestionsPage] Questions data loaded, dashboard refresh triggered');
  }

  return (
    <QuestionsClientPage
      initialQuestions={questionsResult.data || []}
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
