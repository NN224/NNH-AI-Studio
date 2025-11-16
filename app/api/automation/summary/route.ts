import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface LocationRecord {
  id: string;
  location_name?: string | null;
}

interface ApiAutomationSettings {
  id: string;
  user_id: string;
  location_id: string;
  is_enabled: boolean;
  auto_reply_enabled: boolean;
  auto_reply_min_rating: number | null;
  reply_tone: string | null;
  smart_posting_enabled: boolean;
  post_frequency: number | null;
  post_days: unknown;
  post_times: unknown;
  content_preferences: Record<string, unknown> | null;
  competitor_monitoring_enabled: boolean;
  insights_reports_enabled: boolean;
  report_frequency: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiAutomationLog {
  id: string;
  location_id: string | null;
  action_type: string | null;
  status: string | null;
  details: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
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

    const locationsQuery = supabase
      .from('gmb_locations')
      .select('id, location_name')
      .eq('user_id', user.id)
      .order('location_name', { ascending: true });

    if (locationId) {
      locationsQuery.eq('id', locationId);
    }

    const { data: locationsData, error: locationsError } = await locationsQuery;

    if (locationsError) {
      console.error('[Automation Summary API] Failed to load locations', locationsError);
      return NextResponse.json(
        { error: 'Failed to load automation locations' },
        { status: 500 }
      );
    }

    const locationMap = new Map<string, LocationRecord>();
    const locationIds: string[] = [];
    (locationsData || []).forEach((loc) => {
      locationMap.set(loc.id, loc);
      locationIds.push(loc.id);
    });

    if (locationId && locationIds.length === 0) {
      return NextResponse.json({ settings: [], logs: [] });
    }

    const settingsQuery = supabase
      .from('autopilot_settings')
      .select(
        `
        id,
        user_id,
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
        updated_at
      `
      )
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (locationIds.length > 0) {
      settingsQuery.in('location_id', locationIds);
    }

    const { data: settingsData, error: settingsError } = await settingsQuery;

    if (settingsError) {
      // If table doesn't exist yet in some environments, degrade gracefully
      if ((settingsError as any).code === 'PGRST205') {
        // Return empty settings instead of failing
        return NextResponse.json({ settings: [], logs: [] });
      }
      console.error('[Automation Summary API] Failed to load settings', settingsError);
      return NextResponse.json(
        { error: 'Failed to load automation settings' },
        { status: 500 }
      );
    }

    let logsData: ApiAutomationLog[] | null = [];
    if (locationIds.length > 0) {
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
          created_at
        `
        )
        .in('location_id', locationIds)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data, error: logsError } = await logsQuery;

      if (logsError) {
        console.error('[Automation Summary API] Failed to load logs', logsError);
        return NextResponse.json(
          { error: 'Failed to load automation logs' },
          { status: 500 }
        );
      }

      logsData = data;
    }

    const settings = (settingsData || []).map((item) => {
      const typed = item as ApiAutomationSettings;
      const locationDetails = locationMap.get(typed.location_id);

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
        locationName: locationDetails?.location_name ?? 'Unassigned location',
      };
    });

    const logs = (logsData || []).map((item) => {
      const typed = item as ApiAutomationLog;
      const locationDetails = typed.location_id ? locationMap.get(typed.location_id) : undefined;

      return {
        id: typed.id,
        locationId: typed.location_id,
        actionType: typed.action_type,
        status: typed.status,
        details: typed.details,
        errorMessage: typed.error_message,
        createdAt: typed.created_at,
        locationName: locationDetails?.location_name ?? 'Unknown location',
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

