'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function refreshDashboard() {
  revalidatePath('/dashboard');
  return { success: true, message: 'Dashboard refreshed!' };
}

export async function syncLocation(locationId: string) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // TODO: Implement actual GMB sync logic
    // For now, just revalidate
    revalidatePath('/dashboard');
    return { success: true, message: 'Location synced!' };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, error: 'Failed to sync location' };
  }
}

export async function generateWeeklyTasks(locationId: string) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Fetch location and reviews data
    const { data: location } = await supabase
      .from('gmb_locations')
      .select('*')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();
    
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
    
    // TODO: Call Claude API to generate tasks based on data
    // For now, return placeholder based on data
    
    const pendingReviews = reviews?.filter(r => !r.review_reply || r.review_reply.trim() === '').length || 0;
    
    const tasks = [];
    if (pendingReviews > 0) {
      tasks.push({
        title: 'Reply to pending reviews',
        description: `You have ${pendingReviews} high-priority reviews waiting`,
        priority: 'HIGH' as const,
        estimatedTime: '30 min'
      });
    }
    
    if ((location.rating || 0) < 4.0) {
      tasks.push({
        title: 'Improve location rating',
        description: 'Focus on customer satisfaction to boost your rating',
        priority: 'MEDIUM' as const,
        estimatedTime: '1 hour'
      });
    }
    
    return {
      success: true,
      tasks: tasks.length > 0 ? tasks : [
        {
          title: 'Keep up the great work!',
          description: 'Your location is performing well',
          priority: 'LOW' as const,
          estimatedTime: '0 min'
        }
      ]
    };
  } catch (error) {
    console.error('Generate tasks error:', error);
    return { success: false, error: 'Failed to generate tasks' };
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
      return { reviews: [], locations: [], questions: [] };
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
      reviews: reviews || [],
      locations: locations || [],
      questions: questions || []
    };
  } catch (error) {
    console.error('Filter error:', error);
    return { reviews: [], locations: [], questions: [] };
  }
}

