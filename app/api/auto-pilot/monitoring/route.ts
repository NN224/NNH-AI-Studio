import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auto-pilot/monitoring
 * Returns auto-reply monitoring statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get today's replies (reviews with replies sent today)
    const { data: todayReplies } = await supabase
      .from('gmb_reviews')
      .select('id, rating, replied_at, updated_at, has_reply, reply_text')
      .eq('user_id', user.id)
      .eq('has_reply', true)
      .not('reply_text', 'is', null)
      .or(`replied_at.gte.${startOfToday.toISOString()},and(replied_at.is.null,updated_at.gte.${startOfToday.toISOString()})`);

    // Get this week's replies
    const { data: weekReplies } = await supabase
      .from('gmb_reviews')
      .select('id, rating, replied_at, updated_at, has_reply, reply_text')
      .eq('user_id', user.id)
      .eq('has_reply', true)
      .not('reply_text', 'is', null)
      .or(`replied_at.gte.${startOfWeek.toISOString()},and(replied_at.is.null,updated_at.gte.${startOfWeek.toISOString()})`);

    // Get this month's replies
    const { data: monthReplies } = await supabase
      .from('gmb_reviews')
      .select('id, rating, replied_at, updated_at, has_reply, reply_text')
      .eq('user_id', user.id)
      .eq('has_reply', true)
      .not('reply_text', 'is', null)
      .or(`replied_at.gte.${startOfMonth.toISOString()},and(replied_at.is.null,updated_at.gte.${startOfMonth.toISOString()})`);

    // Calculate today's stats
    const todayTotal = todayReplies?.length || 0;
    const todaySuccess = todayTotal; // Assume all replies are successful (we can enhance this later with error tracking)
    const todayFailed = 0; // We'll track this when we add error logging

    // Calculate average response time (simplified - using time between review creation and reply)
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    if (todayReplies) {
      // Get review creation times
      const reviewIds = todayReplies.map(r => r.id);
      const { data: reviews } = await supabase
        .from('gmb_reviews')
        .select('id, created_at, replied_at, updated_at')
        .in('id', reviewIds);

      reviews?.forEach((review) => {
        const replyTime = review.replied_at 
          ? new Date(review.replied_at).getTime()
          : new Date(review.updated_at).getTime();
        const reviewTime = new Date(review.created_at).getTime();
        const responseTime = (replyTime - reviewTime) / 1000; // in seconds
        if (responseTime > 0 && responseTime < 86400) { // Less than 24 hours
          totalResponseTime += responseTime;
          responseTimeCount++;
        }
      });
    }

    const avgResponseTime = responseTimeCount > 0 
      ? totalResponseTime / responseTimeCount 
      : 0;

    // Calculate weekly and monthly stats
    const weekTotal = weekReplies?.length || 0;
    const weekSuccess = weekTotal;
    const weekFailed = 0;

    const monthTotal = monthReplies?.length || 0;
    const monthSuccess = monthTotal;
    const monthFailed = 0;

    // Get daily stats for last 7 days
    const dailyStats: Array<{ date: string; success: number; failed: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const { count: dayCount } = await supabase
        .from('gmb_reviews')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('has_reply', true)
        .not('reply_text', 'is', null)
        .or(`replied_at.gte.${dayStart.toISOString()},and(replied_at.is.null,updated_at.gte.${dayStart.toISOString()})`)
        .lt('replied_at', dayEnd.toISOString());

      dailyStats.push({
        date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        success: dayCount || 0,
        failed: 0,
      });
    }

    // Get recent replies (last 10)
    const { data: recentReplies } = await supabase
      .from('gmb_reviews')
      .select('id, rating, created_at, replied_at, updated_at, has_reply, reply_text')
      .eq('user_id', user.id)
      .eq('has_reply', true)
      .not('reply_text', 'is', null)
      .order('replied_at', { ascending: false, nullsFirst: false })
      .order('updated_at', { ascending: false })
      .limit(10);

    const formattedRecentReplies = (recentReplies || []).map((reply) => {
      const replyTime = reply.replied_at 
        ? new Date(reply.replied_at).getTime()
        : new Date(reply.updated_at).getTime();
      const reviewTime = new Date(reply.created_at).getTime();
      const responseTime = (replyTime - reviewTime) / 1000; // in seconds

      return {
        id: reply.id,
        reviewId: reply.id,
        rating: reply.rating || 5,
        success: true, // Assume success for now
        responseTime: responseTime > 0 ? responseTime : 0,
        createdAt: reply.replied_at || reply.updated_at || reply.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        today: {
          total: todayTotal,
          success: todaySuccess,
          failed: todayFailed,
          avgResponseTime,
        },
        thisWeek: {
          total: weekTotal,
          success: weekSuccess,
          failed: weekFailed,
        },
        thisMonth: {
          total: monthTotal,
          success: monthSuccess,
          failed: monthFailed,
        },
        recentReplies: formattedRecentReplies,
        dailyStats,
      },
    });
  } catch (error) {
    console.error('[Auto-Reply Monitoring] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch monitoring stats' 
      },
      { status: 500 }
    );
  }
}

