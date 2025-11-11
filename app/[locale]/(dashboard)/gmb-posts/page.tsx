export const dynamic = 'force-dynamic'; // Add this line to prevent caching

import { createClient } from '@/lib/supabase/server';
import { PostsClientPage } from '@/components/posts/PostsClientPage';
import { getPosts } from '@/server/actions/posts-management';
import { redirect } from 'next/navigation';

export default async function GMBPostsPage({
  searchParams,
}: {
  searchParams: {
    location?: string;
    postType?: string;
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
  const postType = searchParams.postType as 'whats_new' | 'event' | 'offer' | 'product' | 'all' | undefined;
  const status = searchParams.status as 'draft' | 'queued' | 'published' | 'failed' | 'all' | undefined;
  const page = searchParams.page ? parseInt(searchParams.page) : 1;
  const searchQuery = searchParams.search || '';
  const limit = 50;
  const offset = (page - 1) * limit;

  // Fetch posts and stats in parallel
  const [postsResult, locationsResult] = await Promise.all([
    getPosts({
      locationId,
      postType: postType === 'all' ? undefined : postType,
      status: status === 'all' ? undefined : status,
      searchQuery,
      sortBy: 'newest',
      limit,
      offset,
    }),
    supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .eq('is_active', true),
  ]);

  return (
    <PostsClientPage
      initialPosts={postsResult.data || []}
      totalCount={postsResult.count}
      locations={locationsResult.data || []}
      currentFilters={{
        locationId,
        postType: postType || 'all',
        status: status || 'all',
        searchQuery,
        page,
      }}
    />
  );
}
