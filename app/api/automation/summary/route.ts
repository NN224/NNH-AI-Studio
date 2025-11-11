import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ApiAutomationSettings {
  id: string;
  location_id: string;
  is_enabled: boolean;
  auto_reply_enabled: boolean;
  auto_reply_min_rating: number | null;
  reply_tone: string | null;
  smart_posting_enabled: boolean;
  post_frequency: number | null;
  post_days: any;
  post_times: any;
  content_preferences: Record<string, unknown> | null;
  competitor_monitoring_enabled: boolean;
  insights_reports_enabled: boolean;
  report_frequency: string | null;
  created_at: string;
  updated_at: string;
  gmb_locations?: {
    id: string;
    location_name?: string | null;
    location_alias?: string | null;
  } | null;
}

interface ApiAutomationLog {
  id: string;
  location_id: string | null;
  action_type: string | null;
  status: string | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  gmb_locations?: {
    id: string;
    location_name?: string | null;
    location_alias?: string | null;
  } | null;
}

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

    const locationId = request.nextUrl.searchParams.get('locationId');

    const settingsQuery = supabase
      .from('autopilot_settings')
      .select(
        `
        id,
        location_id,
        is_enabled,
        auto_reply_enabled,
        auto_reply_min_rating,
        reply_tone,
        smart_posting_enabled,
        post_frequency,
        post_days,
        post_times,
        content_preferences,
        competitor_monitoring_enabled,
        insights_reports_enabled,
        report_frequency,
        created_at,
        updated_at,
        gmb_locations!inner(
          id,
          location_name,
          location_alias,
          user_id
        )
      `
      )
      .order('updated_at', { ascending: false })
      .eq('gmb_locations.user_id', user.id);

    if (locationId) {
      settingsQuery.eq('location_id', locationId);
    }

    const { data: settingsData, error: settingsError } = await settingsQuery;

    if (settingsError) {
      console.error('[Automation Summary API] Failed to load settings', settingsError);
      return NextResponse.json(
        { error: 'Failed to load automation settings' },
        { status: 500 }
      );
    }

    const logsQuery = supabase
      .from('autopilot_logs')
      .select(
        `
        id,
        location_id,
        action_type,
        status,
        details,
        error_message,
        created_at,
        gmb_locations!inner(
          id,
          location_name,
          location_alias,
          user_id
        )
      `
      )
      .order('created_at', { ascending: false })
      .eq('gmb_locations.user_id', user.id)
      .limit(100);

    if (locationId) {
      logsQuery.eq('location_id', locationId);
    }

    const { data: logsData, error: logsError } = await logsQuery;

    if (logsError) {
      console.error('[Automation Summary API] Failed to load logs', logsError);
      return NextResponse.json(
        { error: 'Failed to load automation logs' },
        { status: 500 }
      );
    }

    const settings = (settingsData || []).map((item) => {
      const typed = item as unknown as ApiAutomationSettings & {
        gmb_locations?: ApiAutomationSettings['gmb_locations'] | Array<ApiAutomationSettings['gmb_locations']>;
      };

      const locationDetails = Array.isArray(typed.gmb_locations)
        ? typed.gmb_locations[0]
        : typed.gmb_locations;

      return {
        id: typed.id,
        locationId: typed.location_id,
        isEnabled: Boolean(typed.is_enabled),
        autoReplyEnabled: Boolean(typed.auto_reply_enabled),
        autoReplyMinRating: typed.auto_reply_min_rating,
        replyTone: typed.reply_tone,
        smartPostingEnabled: Boolean(typed.smart_posting_enabled),
        postFrequency: typed.post_frequency,
        postDays: typed.post_days,
        postTimes: typed.post_times,
        contentPreferences: typed.content_preferences,
        competitorMonitoringEnabled: Boolean(typed.competitor_monitoring_enabled),
        insightsReportsEnabled: Boolean(typed.insights_reports_enabled),
        reportFrequency: typed.report_frequency,
        createdAt: typed.created_at,
        updatedAt: typed.updated_at,
        locationName:
          locationDetails?.location_name ??
          locationDetails?.location_alias ??
          'Unknown location',
      };
    });

    const logs = (logsData || []).map((item) => {
      const typed = item as unknown as ApiAutomationLog & {
        gmb_locations?: ApiAutomationLog['gmb_locations'] | Array<ApiAutomationLog['gmb_locations']>;
      };

      const locationDetails = Array.isArray(typed.gmb_locations)
        ? typed.gmb_locations[0]
        : typed.gmb_locations;

      return {
        id: typed.id,
        locationId: typed.location_id,
        actionType: typed.action_type,
        status: typed.status,
        details: typed.details,
        errorMessage: typed.error_message,
        createdAt: typed.created_at,
        locationName:
          locationDetails?.location_name ??
          locationDetails?.location_alias ??
          'Unknown location',
      };
    });

    return NextResponse.json({
      settings,
      logs,
    });
  } catch (error) {
    console.error('[Automation Summary API] Unexpected error', error);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}

