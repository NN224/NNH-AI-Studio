import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/notifications
 * Returns user notifications
 */
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

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(user.id);
    if (!success) {
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retry_after: rateLimitHeaders['X-RateLimit-Reset']
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    // Try to get notifications from activity_logs table (if it exists)
    let notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: string;
      read: boolean;
      metadata: any;
    }> = [];
    try {
      const { data, error: notificationsError } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!notificationsError && data) {
        notifications = data.map(log => ({
          id: log.id,
          type: log.activity_type,
          title: getNotificationTitle(log.activity_type),
          message: log.activity_message,
          timestamp: log.created_at,
          read: false, // Default to unread
          metadata: log.metadata || {}
        }));
      }
    } catch (error) {
      console.log('activity_logs table not available, using fallback notifications');
    }

    // Fallback: Generate some sample notifications if no activity logs
    if (notifications.length === 0) {
      notifications = [
        {
          id: 'welcome',
          type: 'system',
          title: 'Welcome to NNH AI Studio',
          message: 'Your dashboard is ready! Start by connecting your Google My Business account.',
          timestamp: new Date().toISOString(),
          read: false,
          metadata: {}
        }
      ];
    }

    // Build response
    const response = {
      notifications,
      pagination: {
        limit,
        offset,
        total: notifications.length,
        hasMore: false // Since we're using fallback data
      },
      lastUpdated: new Date().toISOString()
    };

    // Set cache headers
    const headers = new Headers({
      'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      ...Object.fromEntries(
        Object.entries(rateLimitHeaders).map(([k, v]) => [k, String(v)])
      ),
    });

    return NextResponse.json(response, { 
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('Notifications API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to fetch notifications'
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get notification title based on activity type
 */
function getNotificationTitle(activityType: string): string {
  const titles: Record<string, string> = {
    'system': 'System Notification',
    'review_reply': 'Review Reply',
    'question_answer': 'Question Answered',
    'sync_complete': 'Sync Complete',
    'sync_error': 'Sync Error',
    'auto_reply': 'Auto Reply Sent',
    'settings_update': 'Settings Updated',
    'location_update': 'Location Updated',
    'default': 'Notification'
  };

  return titles[activityType] || titles['default'];
}