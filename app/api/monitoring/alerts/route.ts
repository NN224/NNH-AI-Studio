import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST endpoint to store alerts
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alerts } = body;

    if (!Array.isArray(alerts)) {
      return NextResponse.json(
        { error: 'Invalid alerts format' },
        { status: 400 }
      );
    }

    // Store alerts in database
    const { error } = await supabase
      .from('monitoring_alerts')
      .insert(
        alerts.map(alert => ({
          id: alert.id,
          type: alert.type,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          service: alert.service,
          metadata: alert.metadata,
          timestamp: alert.timestamp || new Date().toISOString(),
          acknowledged: alert.acknowledged || false,
          user_id: user.id,
        }))
      );

    if (error) {
      console.error('Failed to store alerts:', error);
      return NextResponse.json(
        { error: 'Failed to store alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve alerts
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

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get('severity');
    const acknowledged = searchParams.get('acknowledged');
    const startTime = searchParams.get('start');
    const endTime = searchParams.get('end');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query = supabase
      .from('monitoring_alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (acknowledged !== null) {
      query = query.eq('acknowledged', acknowledged === 'true');
    }

    if (startTime) {
      query = query.gte('timestamp', startTime);
    }

    if (endTime) {
      query = query.lte('timestamp', endTime);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Failed to fetch alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts' },
        { status: 500 }
      );
    }

    // Get summary statistics
    const { data: stats } = await supabase
      .from('monitoring_alerts')
      .select('severity')
      .eq('user_id', user.id)
      .eq('acknowledged', false)
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    const summary = {
      total: alerts?.length || 0,
      unacknowledged: alerts?.filter(a => !a.acknowledged).length || 0,
      critical: stats?.filter(s => s.severity === 'critical').length || 0,
      high: stats?.filter(s => s.severity === 'high').length || 0,
      medium: stats?.filter(s => s.severity === 'medium').length || 0,
      low: stats?.filter(s => s.severity === 'low').length || 0,
    };

    return NextResponse.json({ 
      alerts: alerts || [],
      summary
    });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH endpoint to acknowledge alerts
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { alertIds, acknowledged = true } = body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid alert IDs' },
        { status: 400 }
      );
    }

    // Update alerts
    const { error } = await supabase
      .from('monitoring_alerts')
      .update({ 
        acknowledged,
        acknowledged_at: acknowledged ? new Date().toISOString() : null,
        acknowledged_by: acknowledged ? user.id : null,
      })
      .in('id', alertIds)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to update alerts:', error);
      return NextResponse.json(
        { error: 'Failed to update alerts' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
