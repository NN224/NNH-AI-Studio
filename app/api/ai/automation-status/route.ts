/**
 * Automation Status API Route
 * Returns AI autopilot status and metrics
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AutomationStatus } from '@/lib/types/ai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total autopilot settings
    const { count: totalAutomations } = await supabase
      .from('autopilot_settings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Get active autopilot settings
    const { count: activeAutomations } = await supabase
      .from('autopilot_settings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_enabled', true);

    // Get recent autopilot logs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentLogs } = await supabase
      .from('autopilot_logs')
      .select('id, action_type, status, created_at, details')
      .eq('user_id', user.id)
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate success rate
    const successfulLogs = recentLogs?.filter((log) => log.status === 'success').length || 0;
    const totalLogs = recentLogs?.length || 0;
    const successRate = totalLogs > 0 ? successfulLogs / totalLogs : 0;

    // Calculate time saved (estimate: 5 minutes per automation)
    const timeSavedMinutes = successfulLogs * 5;
    const timeSavedHours = timeSavedMinutes / 60;

    // Get upcoming scheduled actions
    // For now, we'll create mock upcoming actions based on active settings
    const { data: activeSettings } = await supabase
      .from('autopilot_settings')
      .select('*, gmb_locations(location_name)')
      .eq('user_id', user.id)
      .eq('is_enabled', true)
      .limit(5);

    const upcomingActions = (activeSettings || []).map((setting: any, index: number) => {
      const nextRun = new Date();
      nextRun.setHours(nextRun.getHours() + index + 1);

      return {
        id: setting.id,
        type: setting.smart_posting_enabled ? 'smart_post' : 'auto_reply',
        scheduledAt: nextRun,
        locationName: setting.gmb_locations?.location_name || 'Unknown Location',
        description: setting.smart_posting_enabled
          ? 'Generate and publish smart post'
          : 'Auto-reply to pending reviews',
      };
    });

    // Format recent logs
    const formattedLogs = (recentLogs || []).map((log) => ({
      id: log.id,
      action_type: log.action_type,
      action_description: getActionDescription(log.action_type, log.details),
      status: log.status,
      created_at: log.created_at,
      metadata: log.details,
    }));

    const status: AutomationStatus = {
      totalAutomations: totalAutomations || 0,
      activeAutomations: activeAutomations || 0,
      successRate,
      timeSavedHours,
      upcomingActions,
      recentLogs: formattedLogs,
    };

    return NextResponse.json(status);
  } catch (error) {
    console.error('Automation Status API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Get human-readable action description
 */
function getActionDescription(actionType: string, details: any): string {
  switch (actionType) {
    case 'auto_reply':
      return `Auto-replied to ${details?.review_rating || 'a'} star review`;
    case 'smart_post':
      return `Published smart post: ${details?.post_type || 'Update'}`;
    case 'review_analysis':
      return 'Analyzed reviews for sentiment';
    case 'competitor_check':
      return 'Checked competitor activity';
    default:
      return `Performed ${actionType} action`;
  }
}

