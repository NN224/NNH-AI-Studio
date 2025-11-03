// lib/posts/posts-crud.ts
// CRUD operations for GMB posts

interface PostContent {
  id: string;
  user_id: string;
  location_id: string;
  title: string | null;
  content: string;
  mediaUrl: string | null;
  callToAction: string | null;
  callToActionUrl: string | null;
  post_type: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
}

/**
 * Fetch post content from database for publishing
 * @param supabase - Supabase client instance
 * @param postId - The post ID to fetch
 * @returns Post content data or null if not found
 */
export async function fetchPostContent(
  supabase: any,
  postId: string
): Promise<PostContent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: post, error } = await supabase
    .from('gmb_posts')
    .select('id, user_id, location_id, title, content, media_url, call_to_action, call_to_action_url, post_type, status, scheduled_at, published_at, created_at')
    .eq('id', postId)
    .eq('user_id', user.id)
    .single();

  if (error || !post) {
    return null;
  }

  // Map database column names to camelCase for easier use
  return {
    id: post.id,
    user_id: post.user_id,
    location_id: post.location_id,
    title: post.title,
    content: post.content,
    mediaUrl: post.media_url,
    callToAction: post.call_to_action,
    callToActionUrl: post.call_to_action_url,
    post_type: post.post_type,
    status: post.status,
    scheduled_at: post.scheduled_at,
    published_at: post.published_at,
    created_at: post.created_at,
  };
}

/**
 * Create a new GMB post in the database
 * @param supabase - Supabase client instance
 * @param postData - Post data to insert
 * @returns Created post or null if failed
 */
export async function createPost(
  supabase: any,
  postData: {
    location_id: string;
    title?: string;
    content: string;
    media_url?: string;
    call_to_action?: string;
    call_to_action_url?: string;
    post_type?: string;
    status?: string;
    scheduled_at?: string;
  }
): Promise<PostContent | null> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: post, error } = await supabase
    .from('gmb_posts')
    .insert({
      user_id: user.id,
      ...postData,
      status: postData.status || 'draft',
    })
    .select()
    .single();

  if (error || !post) {
    console.error('[Posts CRUD] Error creating post:', error);
    return null;
  }

  return {
    id: post.id,
    user_id: post.user_id,
    location_id: post.location_id,
    title: post.title,
    content: post.content,
    mediaUrl: post.media_url,
    callToAction: post.call_to_action,
    callToActionUrl: post.call_to_action_url,
    post_type: post.post_type,
    status: post.status,
    scheduled_at: post.scheduled_at,
    published_at: post.published_at,
    created_at: post.created_at,
  };
}

/**
 * Update post status (e.g., mark as published)
 * @param supabase - Supabase client instance
 * @param postId - The post ID to update
 * @param status - New status
 * @param publishedAt - Optional published timestamp
 * @returns Success boolean
 */
export async function updatePostStatus(
  supabase: any,
  postId: string,
  status: string,
  publishedAt?: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  const updateData: any = { status };
  if (publishedAt) {
    updateData.published_at = publishedAt;
  }

  const { error } = await supabase
    .from('gmb_posts')
    .update(updateData)
    .eq('id', postId)
    .eq('user_id', user.id);

  return !error;
}
