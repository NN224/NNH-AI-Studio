'use server';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { refreshAccessToken as refreshGoogleAccessToken } from '@/lib/gmb/helpers';
import { resolveTokenValue, encryptToken } from '@/lib/security/encryption';
import { revalidatePath } from 'next/cache';

type LocationWithAccount = {
  id: string;
  user_id: string | null;
  account_id: string | null;
  is_active?: boolean | null;
  [key: string]: any;
};

async function fetchLocationForUser(
  supabase: SupabaseClient,
  adminClient: SupabaseClient,
  locationId: string,
  userId: string,
) {
  const { data: location, error } = await supabase
    .from('gmb_locations')
    .select('*, gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)')
    .eq('id', locationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[fetchLocationForUser] query error:', error);
  }

  if (location) {
    return location as LocationWithAccount;
  }

  const { data: adminLocation, error: adminError } = await adminClient
    .from('gmb_locations')
    .select('*, gmb_accounts!inner(id, user_id, access_token, refresh_token, token_expires_at)')
    .eq('id', locationId)
    .maybeSingle();

  if (adminError) {
    console.error('[fetchLocationForUser] admin query error:', adminError);
    return null;
  }

  if (!adminLocation) {
    return null;
  }

  const ownerId =
    (adminLocation as any).user_id ??
    (adminLocation as any).gmb_accounts?.user_id ??
    null;

  if (ownerId && ownerId !== userId) {
    console.warn('[fetchLocationForUser] owner mismatch', {
      locationId,
      ownerId,
      userId,
    });
    return null;
  }

  if (!ownerId) {
    const updatePayload = {
      user_id: userId,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error: attachError } = await adminClient
      .from('gmb_locations')
      .update(updatePayload)
      .eq('id', locationId);

    if (attachError) {
      console.error('[fetchLocationForUser] attach error:', attachError);
    } else {
      (adminLocation as any).user_id = userId;
      (adminLocation as any).is_active = true;
    }
  }

  return adminLocation as LocationWithAccount;
}

interface DisconnectLocationResult {
  success: boolean;
  error?: string;
  message?: string;
  data?: {
    disconnectedId: string;
    accountId?: string;
  };
}

/**
 * Disconnect GMB location (deprecated - use disconnectGMBAccount instead)
 * This function now properly disconnects the entire GMB account associated with the location
 * to ensure complete cleanup of credentials and data.
 */
export async function disconnectLocation(locationId: string): Promise<DisconnectLocationResult> {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  try {
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not authenticated.' };
    }

    // Get location and its associated account
    const location = await fetchLocationForUser(supabase, adminClient, locationId, user.id);
    if (!location) {
      return { success: false, error: 'Location not found or unauthorized.' };
    }

    // Get the GMB account ID from the location
    const accountId = (location as any).account_id || (location as any).gmb_accounts?.id;
    
    if (!accountId) {
      // Fallback: if no account ID, just deactivate the location
      const { error: updateError } = await supabase
        .from('gmb_locations')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', locationId)
        .eq('user_id', user.id);

      if (updateError) {
        return { success: false, error: updateError.message || 'Failed to disconnect location.' };
      }

      revalidatePath('/dashboard');
      revalidatePath('/locations');
      revalidatePath('/settings');

      return { 
        success: true, 
        message: 'Location disconnected successfully', 
        data: { disconnectedId: locationId } 
      };
    }

    // Use the comprehensive disconnectGMBAccount function
    const { disconnectGMBAccount } = await import('@/server/actions/gmb-account');
    const result = await disconnectGMBAccount(accountId, 'keep');
    
    if (result.success) {
      return { 
        success: true, 
        message: result.message || 'Location and account disconnected successfully',
        data: { disconnectedId: locationId, accountId }
      };
    }

    return { 
      success: false, 
      error: result.error || 'Failed to disconnect account'
    };
  } catch (error) {
    console.error('[disconnectLocation] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unexpected disconnect error occurred.',
    };
  }
}

export async function refreshDashboard() {
  revalidatePath('/dashboard');
  return { success: true, message: 'Dashboard refreshed successfully' };
}

export async function syncLocation(locationId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    const location = await fetchLocationForUser(supabase, adminClient, locationId, user.id);
    if (!location) {
      return { success: false, error: 'Location not found' };
    }

    const account = (location as any)?.gmb_accounts;
    if (!account) {
      return { success: false, error: 'Linked Google account not found' };
    }

    const now = Date.now();
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at).getTime() : 0;
    const bufferMs = 5 * 60 * 1000;
    const decryptedAccessToken = resolveTokenValue(account.access_token, {
      context: `dashboard.actions.access_token:${account.id}`,
    });
    const decryptedRefreshToken = resolveTokenValue(account.refresh_token, {
      context: `dashboard.actions.refresh_token:${account.id}`,
    });
    let accessToken: string | null = decryptedAccessToken;

    const needsRefresh = !accessToken || !expiresAt || expiresAt - bufferMs <= now;

    if (needsRefresh) {
      if (!decryptedRefreshToken) {
        return {
          success: false,
          error: 'Missing refresh token. Please reconnect your Google account.',
        };
      }

      try {
        const tokens = await refreshGoogleAccessToken(decryptedRefreshToken);
        accessToken = tokens.access_token;

        const newExpiresAt = new Date();
        newExpiresAt.setSeconds(newExpiresAt.getSeconds() + (tokens.expires_in || 3600));

        const updatePayload: Record<string, any> = {
          access_token: encryptToken(tokens.access_token),
          token_expires_at: newExpiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (tokens.refresh_token) {
          updatePayload.refresh_token = encryptToken(tokens.refresh_token);
        }

        const { error: tokenUpdateError } = await supabase
          .from('gmb_accounts')
          .update(updatePayload)
          .eq('id', account.id);

        if (tokenUpdateError) {
          console.error('[syncLocation] Failed to save refreshed token', tokenUpdateError);
        }
      } catch (tokenError) {
        console.error('[syncLocation] Token refresh failed:', tokenError);
        return { success: false, error: 'Failed to refresh Google access token' };
      }
    }

    const { syncReviewsFromGoogle } = await import('@/server/actions/reviews-management');
    const result = await syncReviewsFromGoogle(locationId);
    
    if (result.success) {
      revalidatePath('/dashboard');
      revalidatePath('/reviews');
      return { 
        success: true, 
        message: result.message || 'Location synced successfully' 
      };
    }

    return { success: false, error: result.error || 'Failed to sync' };
  } catch (error) {
    console.error('[syncLocation] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed' 
    };
  }
}

export async function generateWeeklyTasks(locationId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const location = await fetchLocationForUser(supabase, adminClient, locationId, user.id);
    if (!location) {
      return { success: false, error: 'Location not found' };
    }

    const { data: reviews } = await supabase
      .from('gmb_reviews')
      .select('*')
      .eq('location_id', locationId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    
    // Fetch questions data
    const { data: questions } = await supabase
      .from('gmb_questions')
      .select('*')
      .eq('location_id', locationId)
      .eq('user_id', user.id)
      .eq('answer_status', 'pending')
      .limit(20);
    
    // Generate intelligent tasks based on data analysis
    const pendingReviews = reviews?.filter(r => !r.review_reply || r.review_reply.trim() === '').length || 0;
    const unansweredQuestions = questions?.length || 0;
    const recentNegativeReviews = reviews?.filter(r => r.rating && r.rating <= 2 && !r.review_reply).length || 0;
    const avgRating = reviews?.length ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : 0;
    
    const tasks = [];
    
    // High priority tasks
    if (recentNegativeReviews > 0) {
      tasks.push({
        title: 'Respond to negative reviews',
        description: `You have ${recentNegativeReviews} recent negative reviews that need immediate attention`,
        priority: 'HIGH' as const,
        estimatedTime: '45 min'
      });
    }
    
    if (pendingReviews > 5) {
      tasks.push({
        title: 'Reply to pending reviews',
        description: `You have ${pendingReviews} reviews awaiting response. Quick replies improve customer trust.`,
        priority: 'HIGH' as const,
        estimatedTime: '30 min'
      });
    }
    
    if (unansweredQuestions > 0) {
      tasks.push({
        title: 'Answer customer questions',
        description: `You have ${unansweredQuestions} unanswered questions. Quick answers can help convert customers.`,
        priority: 'HIGH' as const,
        estimatedTime: '20 min'
      });
    }
    
    // Medium priority tasks
    if (avgRating < 4.0 && reviews && reviews.length > 5) {
      tasks.push({
        title: 'Improve location rating',
        description: `Your average rating is ${avgRating.toFixed(1)}. Focus on customer satisfaction to boost your rating above 4.0.`,
        priority: 'MEDIUM' as const,
        estimatedTime: '1 hour'
      });
    }
    
    if ((location.response_rate || 0) < 80) {
      tasks.push({
        title: 'Increase response rate',
        description: `Your response rate is ${location.response_rate?.toFixed(0) || 0}%. Aim for 80%+ to improve visibility.`,
        priority: 'MEDIUM' as const,
        estimatedTime: '30 min'
      });
    }
    
    // Low priority / positive tasks
    if (tasks.length === 0) {
      tasks.push({
        title: 'Keep up the great work!',
        description: 'Your location is performing well. Continue monitoring reviews and responding promptly.',
        priority: 'LOW' as const,
        estimatedTime: '0 min'
      });
    }
    
    return {
      success: true,
      message: 'Weekly tasks generated successfully',
      data: { tasks }
    };
  } catch (error) {
    console.error('[generateWeeklyTasks] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to generate tasks' 
    };
  }
}

export async function getDashboardDataWithFilter(
  startDate?: string,
  endDate?: string
) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: true, data: { reviews: [], locations: [], questions: [] } };
    }

    let reviewsQuery = supabase
      .from('gmb_reviews')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (startDate) {
      reviewsQuery = reviewsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      reviewsQuery = reviewsQuery.lte('created_at', endDate);
    }
    
    const { data: reviews } = await reviewsQuery;
    
    const { data: locations } = await supabase
      .from('gmb_locations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    const { data: questions } = await supabase
      .from('gmb_questions')
      .select('*')
      .eq('user_id', user.id);
    
    return {
      success: true,
      data: {
        reviews: reviews || [],
        locations: locations || [],
        questions: questions || []
      }
    };
  } catch (error) {
    console.error('[getDashboardDataWithFilter] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to get dashboard data' };
  }
}

export async function getDashboardStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  // Fetch main stats from view
  const { data: stats, error: statsError } = await supabase
    .from('v_dashboard_stats')
    .select('total_reviews, avg_rating, pending_reviews, pending_questions, replied_reviews, calculated_response_rate')
    .eq('user_id', user.id)
    .single();

  if (statsError) {
    console.error('Error fetching dashboard stats:', statsError);
    throw new Error('Could not fetch dashboard stats.');
  }

  // Fetch total locations
  const { count: totalLocations } = await supabase
    .from('gmb_locations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Fetch reviews this month
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count: reviewsThisMonth } = await supabase
    .from('gmb_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString());

  // Use response rate from view (already calculated)
  const responseRate = stats?.calculated_response_rate || 0;

  // Calculate reviews trend (last 7 days vs previous 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const { count: recentReviews } = await supabase
    .from('gmb_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', sevenDaysAgo.toISOString());

  const { count: previousReviews } = await supabase
    .from('gmb_reviews')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .lt('created_at', sevenDaysAgo.toISOString());

  const reviewsTrend = previousReviews && previousReviews > 0
    ? Math.round(((recentReviews || 0) - previousReviews) / previousReviews * 100)
    : 0;

  return {
    ...stats,
    total_locations: totalLocations || 0,
    reviews_this_month: reviewsThisMonth || 0,
    response_rate: responseRate,
    reviews_trend: reviewsTrend,
  };
}

export async function getPerformanceChartData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }
  
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Format as YYYY-MM-DD

  const { data, error } = await supabase
    .from('gmb_performance_metrics')
    .select('metric_date, metric_value')
    .eq('user_id', user.id)
    .eq('metric_type', 'VIEWS_SEARCH')
    .gte('metric_date', sevenDaysAgo)
    .order('metric_date', { ascending: true });

  if (error) {
    console.error('Error fetching performance chart data:', error);
    // Return empty array instead of throwing to avoid breaking dashboard
    return [];
  }

  // Map to expected format (date, value)
  const formattedData = (data || []).map(item => ({
    date: item.metric_date,
    value: item.metric_value || 0,
  }));

  return formattedData;
}

export async function getActivityFeed() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, activity_message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching activity feed:', error);
    // Return empty array instead of throwing to avoid breaking dashboard
    return [];
  }

  // Map activity_message to message for consistency
  return (data || []).map(item => ({
    id: item.id,
    message: item.activity_message,
    created_at: item.created_at,
  }));
}
