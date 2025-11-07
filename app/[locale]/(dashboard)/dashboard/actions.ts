'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function disconnectLocation(locationId: string) {
  const supabase = await createClient();
  
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    // Verify location belongs to user
    const { data: location, error: fetchError } = await supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('id', locationId)
      .eq('user_id', user.id)
      .single();
    
    if (fetchError || !location) {
      return { success: false, error: 'Location not found or access denied' };
    }

    // Set location to inactive (soft delete)
    const { error: updateError } = await supabase
      .from('gmb_locations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', locationId)
      .eq('user_id', user.id);

    if (updateError) {
      return { 
        success: false, 
        error: updateError.message || 'Failed to disconnect location' 
      };
    }

    revalidatePath('/dashboard');
    revalidatePath('/locations');
    
    return { 
      success: true, 
      message: `${location.location_name} has been disconnected successfully` 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to disconnect location' 
    };
  }
}

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

    // Import and call the actual sync function from reviews-management
    const { syncReviewsFromGoogle } = await import('@/server/actions/reviews-management');
    const result = await syncReviewsFromGoogle(locationId);
    
    if (result.success) {
      revalidatePath('/dashboard');
      revalidatePath('/reviews');
      return { 
        success: true, 
        message: result.message || 'Location synced successfully!' 
      };
    } else {
      return { 
        success: false, 
        error: result.error || 'Failed to sync location' 
      };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to sync location' 
    };
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
      tasks
    };
  } catch (error) {
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
    return { reviews: [], locations: [], questions: [] };
  }
}

