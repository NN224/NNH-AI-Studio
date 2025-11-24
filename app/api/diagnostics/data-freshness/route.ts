import { createClient } from '@/lib/supabase/server';

/**
 * Data Freshness Check
 * Verifies how recent the synced data is
 */
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

    const now = Date.now();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const freshnessChecks = {
      locations: {
        total: 0,
        last_sync: null as string | null,
        synced_in_last_hour: 0,
        synced_in_last_day: 0,
        synced_in_last_week: 0,
        never_synced: 0,
        stale_locations: [] as string[],
      },
      reviews: {
        total: 0,
        last_created: null as string | null,
        created_in_last_hour: 0,
        created_in_last_day: 0,
        created_in_last_week: 0,
        oldest_unanswered: null as string | null,
      },
      questions: {
        total: 0,
        last_created: null as string | null,
        created_in_last_hour: 0,
        created_in_last_day: 0,
        created_in_last_week: 0,
        unanswered_count: 0,
        oldest_unanswered: null as string | null,
      },
      sync_queue: {
        pending_jobs: 0,
        oldest_pending: null as string | null,
        stuck_jobs: 0,
        last_completed: null as string | null,
      },
    };

    // Check locations freshness
    const { data: locations } = await supabase
      .from('gmb_locations')
      .select('id, location_name, last_synced_at, updated_at')
      .eq('user_id', user.id);

    if (locations) {
      freshnessChecks.locations.total = locations.length;

      locations.forEach(loc => {
        const lastSync = loc.last_synced_at ? new Date(loc.last_synced_at) : null;

        if (!lastSync) {
          freshnessChecks.locations.never_synced++;
          freshnessChecks.locations.stale_locations.push(loc.location_name || loc.id);
        } else {
          if (lastSync > oneHourAgo) freshnessChecks.locations.synced_in_last_hour++;
          if (lastSync > oneDayAgo) freshnessChecks.locations.synced_in_last_day++;
          if (lastSync > oneWeekAgo) freshnessChecks.locations.synced_in_last_week++;

          if (lastSync < oneWeekAgo) {
            freshnessChecks.locations.stale_locations.push(loc.location_name || loc.id);
          }
        }
      });

      const sortedLocations = locations
        .filter(l => l.last_synced_at)
        .sort((a, b) => new Date(b.last_synced_at!).getTime() - new Date(a.last_synced_at!).getTime());

      if (sortedLocations.length > 0) {
        freshnessChecks.locations.last_sync = sortedLocations[0].last_synced_at;
      }
    }

    // Check reviews freshness
    const { data: reviews } = await supabase
      .from('gmb_reviews')
      .select('id, created_at, reply_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (reviews) {
      freshnessChecks.reviews.total = reviews.length;

      if (reviews.length > 0) {
        freshnessChecks.reviews.last_created = reviews[0].created_at;
      }

      reviews.forEach(review => {
        const createdAt = new Date(review.created_at);
        if (createdAt > oneHourAgo) freshnessChecks.reviews.created_in_last_hour++;
        if (createdAt > oneDayAgo) freshnessChecks.reviews.created_in_last_day++;
        if (createdAt > oneWeekAgo) freshnessChecks.reviews.created_in_last_week++;
      });

      const unanswered = reviews.filter(r => !r.reply_text);
      if (unanswered.length > 0) {
        const oldest = unanswered[unanswered.length - 1];
        freshnessChecks.reviews.oldest_unanswered = oldest.created_at;
      }
    }

    // Check questions freshness
    const { data: questions } = await supabase
      .from('gmb_questions')
      .select('id, created_at, answer_text')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (questions) {
      freshnessChecks.questions.total = questions.length;

      if (questions.length > 0) {
        freshnessChecks.questions.last_created = questions[0].created_at;
      }

      questions.forEach(question => {
        const createdAt = new Date(question.created_at);
        if (createdAt > oneHourAgo) freshnessChecks.questions.created_in_last_hour++;
        if (createdAt > oneDayAgo) freshnessChecks.questions.created_in_last_day++;
        if (createdAt > oneWeekAgo) freshnessChecks.questions.created_in_last_week++;
      });

      const unanswered = questions.filter(q => !q.answer_text);
      freshnessChecks.questions.unanswered_count = unanswered.length;

      if (unanswered.length > 0) {
        const oldest = unanswered[unanswered.length - 1];
        freshnessChecks.questions.oldest_unanswered = oldest.created_at;
      }
    }

    // Check sync queue
    const { data: queueJobs } = await supabase
      .from('sync_queue')
      .select('id, status, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (queueJobs) {
      const pending = queueJobs.filter(j => j.status === 'pending');
      freshnessChecks.sync_queue.pending_jobs = pending.length;

      if (pending.length > 0) {
        const oldest = pending[pending.length - 1];
        freshnessChecks.sync_queue.oldest_pending = oldest.created_at;
      }

      // Stuck jobs: processing for more than 30 minutes
      const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000);
      const stuck = queueJobs.filter(
        j => j.status === 'processing' &&
        j.updated_at &&
        new Date(j.updated_at) < thirtyMinutesAgo
      );
      freshnessChecks.sync_queue.stuck_jobs = stuck.length;

      const completed = queueJobs.filter(j => j.status === 'completed');
      if (completed.length > 0) {
        freshnessChecks.sync_queue.last_completed = completed[0].updated_at;
      }
    }

    // Determine overall freshness status
    const hasRecentSync = freshnessChecks.locations.synced_in_last_day > 0;
    const hasRecentData =
      freshnessChecks.reviews.created_in_last_day > 0 ||
      freshnessChecks.questions.created_in_last_day > 0;
    const hasStaleLocations = freshnessChecks.locations.stale_locations.length > 0;
    const hasStuckJobs = freshnessChecks.sync_queue.stuck_jobs > 0;

    let freshnessStatus = 'healthy';
    if (hasStuckJobs) freshnessStatus = 'stuck_jobs';
    else if (hasStaleLocations) freshnessStatus = 'stale_data';
    else if (!hasRecentSync && !hasRecentData) freshnessStatus = 'no_recent_activity';

    return Response.json({
      success: freshnessStatus === 'healthy',
      details: {
        freshness_status: freshnessStatus,
        summary: {
          has_recent_sync: hasRecentSync,
          has_recent_data: hasRecentData,
          stale_locations_count: freshnessChecks.locations.stale_locations.length,
          stuck_jobs_count: freshnessChecks.sync_queue.stuck_jobs,
        },
        ...freshnessChecks,
        checked_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
