import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * ============================================================================
 * GMB Sync Worker
 * ============================================================================
 *
 * PURPOSE:
 * This Edge Function processes sync jobs from the sync_queue table. It:
 * - Picks pending jobs using FOR UPDATE SKIP LOCKED (prevents race conditions)
 * - Processes each job by calling the existing gmb-sync Edge Function
 * - Updates job status (succeeded/failed) and sync_status table
 * - Handles retries with exponential backoff
 * - Respects timeout limits (55s total worker runtime)
 * - Tracks execution in sync_worker_runs for diagnostics
 *
 * ARCHITECTURE:
 * - Called by: Cron scheduler (every 2-5 minutes)
 * - Security: Requires X-Trigger-Secret header
 * - Processing: Sequential (one job at a time to avoid rate limits)
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (admin access)
 * - TRIGGER_SECRET: Secret for authenticating trigger calls
 *
 * CRON SCHEDULE (recommended):
 * - Every 5 minutes: */5 * * * *
 * - Or every 2 minutes for faster processing: */2 * * * *
 *
 * المنطق (Logic in Arabic):
 * العامل (Worker) يقوم بمعالجة المهام من الطابور بشكل متسلسل.
 * يستخدم FOR UPDATE SKIP LOCKED لتجنب التضارب عند تشغيل عدة workers.
 * كل مهمة لها حد أقصى من المحاولات (3 محاولات افتراضياً).
 * ============================================================================
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://www.nnh.ae",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Worker, X-Trigger-Secret",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'"
};

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Worker timeouts
  WORKER_TIMEOUT_MS: 55000, // Total worker execution time (55s)
  JOB_TIMEOUT_MS: 45000,     // Max time per job (45s)

  // Job processing
  MAX_JOBS_PER_RUN: 10,      // Max jobs to process per worker invocation

  // Retry configuration
  DEFAULT_MAX_ATTEMPTS: 3,
  RETRY_DELAY_BASE_MS: 60000, // 1 minute base delay for retries

  // Stale job detection
  STALE_JOB_THRESHOLD_MS: 10 * 60 * 1000 // 10 minutes
};

// ============================================================================
// Types
// ============================================================================

interface SyncJob {
  id: string;
  account_id: string;
  sync_type: 'full' | 'incremental';
  attempts: number;
  max_attempts: number;
  created_at: string;
}

interface JobResult {
  job_id: string;
  account_id: string;
  success: boolean;
  error?: string;
  duration_ms: number;
}

interface WorkerRunStats {
  run_id: string;
  jobs_picked: number;
  jobs_processed: number;
  jobs_succeeded: number;
  jobs_failed: number;
  results: JobResult[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAdminClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Create a worker run record for tracking this invocation
 */
async function createWorkerRun(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from("sync_worker_runs")
    .insert({
      status: 'running',
      started_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create worker run: ${error?.message}`);
  }

  return data.id;
}

/**
 * Update worker run with final stats
 */
async function updateWorkerRun(
  admin: SupabaseClient,
  run_id: string,
  stats: Partial<WorkerRunStats> & { status: string; notes?: string }
) {
  const { error } = await admin
    .from("sync_worker_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: stats.status,
      jobs_picked: stats.jobs_picked,
      jobs_processed: stats.jobs_processed,
      jobs_succeeded: stats.jobs_succeeded,
      jobs_failed: stats.jobs_failed,
      notes: stats.notes,
      metadata: stats.results ? { results: stats.results } : null
    })
    .eq("id", run_id);

  if (error) {
    console.error(`Failed to update worker run ${run_id}:`, error);
  }
}

/**
 * Pick pending jobs from queue using FOR UPDATE SKIP LOCKED
 * This prevents race conditions when multiple workers run simultaneously
 */
async function pickJobsForProcessing(
  admin: SupabaseClient,
  limit: number
): Promise<SyncJob[]> {
  // First, mark stale jobs as failed
  await admin.rpc('mark_stale_sync_jobs');

  // Pick jobs using raw SQL for FOR UPDATE SKIP LOCKED
  const { data, error } = await admin.rpc('pick_sync_jobs', {
    job_limit: limit
  });

  if (error) {
    console.error("Error picking jobs:", error);
    return [];
  }

  return data || [];
}

/**
 * Process a single sync job by calling gmb-sync Edge Function
 */
async function processJob(
  job: SyncJob,
  supabaseUrl: string,
  serviceKey: string
): Promise<JobResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.JOB_TIMEOUT_MS);

    // Call the existing gmb-sync Edge Function
    // Alternative: You could extract gmb-sync logic into a shared module and call directly
    const response = await fetch(`${supabaseUrl}/functions/v1/gmb-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${serviceKey}` // Using service key for backend processing
      },
      body: JSON.stringify({
        accountId: job.account_id,
        syncType: job.sync_type
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    const duration_ms = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      return {
        job_id: job.id,
        account_id: job.account_id,
        success: false,
        error: errorText.slice(0, 500), // Truncate to fit in DB
        duration_ms
      };
    }

    return {
      job_id: job.id,
      account_id: job.account_id,
      success: true,
      duration_ms
    };

  } catch (error: any) {
    const duration_ms = Date.now() - startTime;

    return {
      job_id: job.id,
      account_id: job.account_id,
      success: false,
      error: error.name === 'AbortError'
        ? 'Job timeout'
        : error.message?.slice(0, 500),
      duration_ms
    };
  }
}

/**
 * Update job status in sync_queue after processing
 */
async function updateJobStatus(
  admin: SupabaseClient,
  job: SyncJob,
  result: JobResult
) {
  const now = new Date().toISOString();

  if (result.success) {
    // Mark as succeeded
    await admin
      .from("sync_queue")
      .update({
        status: 'succeeded',
        completed_at: now,
        last_error: null
      })
      .eq("id", job.id);

    // Update sync_status for the account
    const syncTypeField = job.sync_type === 'full'
      ? 'last_successful_full_sync_at'
      : 'last_successful_incremental_sync_at';

    // First, try to get existing record
    const { data: existing } = await admin
      .from("sync_status")
      .select("id, total_syncs, successful_syncs, failed_syncs")
      .eq("account_id", job.account_id)
      .maybeSingle();

    if (existing) {
      // Update existing record
      await admin
        .from("sync_status")
        .update({
          last_sync_completed_at: now,
          last_sync_status: 'succeeded',
          last_sync_error: null,
          [syncTypeField]: now,
          total_syncs: (existing.total_syncs || 0) + 1,
          successful_syncs: (existing.successful_syncs || 0) + 1
        })
        .eq("account_id", job.account_id);
    } else {
      // Insert new record
      await admin
        .from("sync_status")
        .insert({
          account_id: job.account_id,
          last_sync_completed_at: now,
          last_sync_status: 'succeeded',
          last_sync_error: null,
          [syncTypeField]: now,
          total_syncs: 1,
          successful_syncs: 1,
          failed_syncs: 0
        });
    }

  } else {
    // Check if we should retry
    const should_retry = job.attempts < job.max_attempts;

    if (should_retry) {
      // Calculate exponential backoff delay
      const delay_ms = CONFIG.RETRY_DELAY_BASE_MS * Math.pow(2, job.attempts);
      const scheduled_at = new Date(Date.now() + delay_ms).toISOString();

      // Reset to pending for retry
      await admin
        .from("sync_queue")
        .update({
          status: 'pending',
          scheduled_at,
          last_error: result.error,
          started_at: null, // Reset so it can be picked again
          completed_at: null
        })
        .eq("id", job.id);

    } else {
      // Max attempts reached, mark as failed
      await admin
        .from("sync_queue")
        .update({
          status: 'failed',
          completed_at: now,
          last_error: result.error
        })
        .eq("id", job.id);

      // Update sync_status
      const { data: existing } = await admin
        .from("sync_status")
        .select("id, total_syncs, successful_syncs, failed_syncs")
        .eq("account_id", job.account_id)
        .maybeSingle();

      if (existing) {
        // Update existing record
        await admin
          .from("sync_status")
          .update({
            last_sync_completed_at: now,
            last_sync_status: 'failed',
            last_sync_error: result.error,
            total_syncs: (existing.total_syncs || 0) + 1,
            failed_syncs: (existing.failed_syncs || 0) + 1
          })
          .eq("account_id", job.account_id);
      } else {
        // Insert new record
        await admin
          .from("sync_status")
          .insert({
            account_id: job.account_id,
            last_sync_completed_at: now,
            last_sync_status: 'failed',
            last_sync_error: result.error,
            total_syncs: 1,
            successful_syncs: 0,
            failed_syncs: 1
          });
      }
    }
  }
}

/**
 * Main worker logic
 */
async function runWorker(admin: SupabaseClient): Promise<WorkerRunStats> {
  const run_id = await createWorkerRun(admin);
  const startTime = Date.now();

  const stats: WorkerRunStats = {
    run_id,
    jobs_picked: 0,
    jobs_processed: 0,
    jobs_succeeded: 0,
    jobs_failed: 0,
    results: []
  };

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Pick jobs
    const jobs = await pickJobsForProcessing(admin, CONFIG.MAX_JOBS_PER_RUN);
    stats.jobs_picked = jobs.length;

    if (jobs.length === 0) {
      console.log("ℹ️ No pending jobs found");
      await updateWorkerRun(admin, run_id, {
        ...stats,
        status: 'completed',
        notes: 'No pending jobs'
      });
      return stats;
    }

    console.log(`📋 Picked ${jobs.length} jobs for processing`);

    // Process jobs sequentially (to avoid rate limits)
    for (const job of jobs) {
      // Check if we're approaching timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > CONFIG.WORKER_TIMEOUT_MS) {
        console.warn(`⏱️ Worker timeout approaching, stopping early`);
        break;
      }

      console.log(`🔄 Processing job ${job.id} (account: ${job.account_id}, type: ${job.sync_type}, attempt: ${job.attempts + 1}/${job.max_attempts})`);

      // Process the job
      const result = await processJob(job, SUPABASE_URL, SERVICE_KEY);
      stats.results.push(result);
      stats.jobs_processed++;

      if (result.success) {
        stats.jobs_succeeded++;
        console.log(`✅ Job ${job.id} succeeded (${result.duration_ms}ms)`);
      } else {
        stats.jobs_failed++;
        console.error(`❌ Job ${job.id} failed: ${result.error} (${result.duration_ms}ms)`);
      }

      // Update job status
      await updateJobStatus(admin, job, result);
    }

    // Update worker run with success
    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: 'completed',
      notes: `Processed ${stats.jobs_processed}/${stats.jobs_picked} jobs`
    });

    console.log(`✅ Worker completed: ${stats.jobs_succeeded} succeeded, ${stats.jobs_failed} failed`);

  } catch (error: any) {
    console.error("❌ Worker error:", error);

    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: 'failed',
      notes: error.message
    });

    throw error;
  }

  return stats;
}

// ============================================================================
// Main Handler
// ============================================================================

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    // Verify trigger secret
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET") || "replace-me-now";
    const provided = req.headers.get("X-Trigger-Secret") || req.headers.get("X-Internal-Worker");

    if (!provided || provided !== TRIGGER_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Get admin client
    const admin = getAdminClient();

    // Run worker
    const stats = await runWorker(admin);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: stats.run_id,
        jobs_picked: stats.jobs_picked,
        jobs_processed: stats.jobs_processed,
        jobs_succeeded: stats.jobs_succeeded,
        jobs_failed: stats.jobs_failed
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ Worker handler error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
