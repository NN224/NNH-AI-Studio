import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({
        success: false,
        error: 'Unauthorized - No user session',
      }, { status: 401 });
    }

    // Fetch last 20 sync logs
    const { data: syncLogs, error: logsError } = await supabase
      .from('gmb_sync_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (logsError) {
      return Response.json({
        success: false,
        error: `Sync logs error: ${logsError.message}`,
        details: { logsError },
      });
    }

    const total = syncLogs?.length || 0;
    const successful = syncLogs?.filter(log => log.status === 'success' || log.status === 'completed').length || 0;
    const failed = syncLogs?.filter(log => log.status === 'failed' || log.status === 'error').length || 0;

    return Response.json({
      success: true,
      details: {
        total_logs: total,
        successful_syncs: successful,
        failed_syncs: failed,
        logs: syncLogs?.map(log => ({
          id: log.id,
          phase: log.phase,
          status: log.status,
          message: log.message,
          error_details: log.error_details,
          created_at: log.created_at,
        })) || [],
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
