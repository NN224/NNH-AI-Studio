import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    const adminClient = createAdminClient();

    // Check recent cron job executions by looking at sync_queue
    const { data: recentJobs, error: jobsError } = await adminClient
      .from('sync_queue')
      .select('id, status, sync_type, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      return Response.json({
        success: false,
        error: `Failed to query sync queue: ${jobsError.message}`,
      });
    }

    // Check if there are any jobs in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentJobsLastHour = recentJobs?.filter(job =>
      new Date(job.created_at) > oneHourAgo
    ) || [];

    // Check for stuck jobs (processing for more than 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const stuckJobs = recentJobs?.filter(job =>
      job.status === 'processing' && new Date(job.updated_at) < thirtyMinutesAgo
    ) || [];

    return Response.json({
      success: true,
      details: {
        worker_status: recentJobsLastHour.length > 0 ? 'active' : 'idle',
        jobs_last_hour: recentJobsLastHour.length,
        stuck_jobs: stuckJobs.length,
        recent_jobs: recentJobs?.map(job => ({
          id: job.id,
          status: job.status,
          sync_type: job.sync_type,
          created_at: job.created_at,
          updated_at: job.updated_at,
        })) || [],
        cron_configuration: {
          queue_processing: 'Every 15 minutes',
          scheduled_sync: 'Hourly',
          cleanup: 'Daily at 2 AM',
        },
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
