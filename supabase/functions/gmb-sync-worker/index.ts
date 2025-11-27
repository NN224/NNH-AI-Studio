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
 * - Every 5 minutes (cron expression: asterisk-slash-five asterisk asterisk asterisk asterisk)
 * - Or every 2 minutes for faster processing (cron expression: asterisk-slash-two asterisk asterisk asterisk asterisk)
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
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Internal-Run, X-Internal-Worker, X-Trigger-Secret",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Worker timeouts
  WORKER_TIMEOUT_MS: 55000, // Total worker execution time (55s)
  JOB_TIMEOUT_MS: 45000, // Max time per job (45s)
  TIMEOUT_MARGIN_MS: 5000, // Stop processing 5s before worker timeout

  // Job processing
  MAX_JOBS_PER_RUN: 10, // Max jobs to process per worker invocation

  // Retry configuration
  DEFAULT_MAX_ATTEMPTS: 3,
  RETRY_DELAY_BASE_MS: 60000, // 1 minute base delay for retries

  // Stale job detection
  STALE_JOB_THRESHOLD_MS: 10 * 60 * 1000, // 10 minutes

  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: 5, // Stop after N consecutive failures
};

// ============================================================================
// Types
// ============================================================================

interface SyncJob {
  id: string;
  user_id: string;
  account_id: string;
  sync_type: "full" | "incremental";
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

/**
 * Safely extract error message from any error object
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message);
  }
  return "Unknown error";
}

/**
 * Safely truncate error message for database storage
 */
function truncateError(error: unknown, maxLength = 500): string {
  const message = getErrorMessage(error);
  return message.slice(0, maxLength);
}

function getAdminClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a worker run record for tracking this invocation
 */
async function createWorkerRun(admin: SupabaseClient): Promise<string> {
  const { data, error } = await admin
    .from("sync_worker_runs")
    .insert({
      status: "running",
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Failed to create worker run: ${getErrorMessage(error)}`);
  }

  return data.id;
}

/**
 * Update worker run with final stats
 */
async function updateWorkerRun(
  admin: SupabaseClient,
  run_id: string,
  stats: Partial<WorkerRunStats> & { status: string; notes?: string },
) {
  const { error } = await admin
    .from("sync_worker_runs")
    .update({
      finished_at: new Date().toISOString(),
      status: stats.status,
      jobs_picked: stats.jobs_picked ?? 0,
      jobs_processed: stats.jobs_processed ?? 0,
      jobs_succeeded: stats.jobs_succeeded ?? 0,
      jobs_failed: stats.jobs_failed ?? 0,
      notes: stats.notes,
      metadata: stats.results ? { results: stats.results } : null,
    })
    .eq("id", run_id);

  if (error) {
    console.error(
      `Failed to update worker run ${run_id}:`,
      getErrorMessage(error),
    );
  }
}

/**
 * Reset jobs back to pending state (used when worker times out before processing)
 */
async function resetJobsToPending(
  admin: SupabaseClient,
  jobIds: string[],
): Promise<void> {
  if (jobIds.length === 0) return;

  const { error } = await admin
    .from("sync_queue")
    .update({
      status: "pending",
      started_at: null,
      attempts: admin.sql`attempts - 1`, // Decrement since pick_sync_jobs incremented it
    })
    .in("id", jobIds);

  if (error) {
    console.error(`Failed to reset jobs to pending:`, getErrorMessage(error));
  } else {
    console.log(`♻️ Reset ${jobIds.length} unprocessed jobs to pending`);
  }
}

/**
 * Pick pending jobs from queue using FOR UPDATE SKIP LOCKED
 * This prevents race conditions when multiple workers run simultaneously
 */
async function pickJobsForProcessing(
  admin: SupabaseClient,
  limit: number,
): Promise<SyncJob[]> {
  try {
    // First, mark stale jobs as failed
    const { error: staleError } = await admin.rpc("mark_stale_sync_jobs");
    if (staleError) {
      console.error(
        "⚠️ Failed to mark stale jobs:",
        getErrorMessage(staleError),
      );
      // Continue anyway - not critical
    }
  } catch (err) {
    console.error("⚠️ Exception marking stale jobs:", getErrorMessage(err));
    // Continue anyway
  }

  // Pick jobs using RPC function with FOR UPDATE SKIP LOCKED
  const { data, error } = await admin.rpc("pick_sync_jobs", {
    job_limit: limit,
  });

  if (error) {
    console.error("❌ Error picking jobs:", getErrorMessage(error));
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
  triggerSecret: string,
): Promise<JobResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.JOB_TIMEOUT_MS);

    // Call gmb-process Edge Function (THE ACTUAL PROCESSOR)
    // This function does the real work: calls Google API and saves to DB
    // Using X-Internal-Run header for internal authentication
    const response = await fetch(`${supabaseUrl}/functions/v1/gmb-process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Run": triggerSecret,
      },
      body: JSON.stringify({
        accountId: job.account_id,
        userId: job.user_id,
        syncType: job.sync_type,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const duration_ms = Date.now() - startTime;

    if (!response.ok) {
      let errorText = "HTTP error";
      try {
        errorText = await response.text();
      } catch {
        errorText = `HTTP ${response.status} ${response.statusText}`;
      }

      return {
        job_id: job.id,
        account_id: job.account_id,
        success: false,
        error: truncateError(errorText),
        duration_ms,
      };
    }

    return {
      job_id: job.id,
      account_id: job.account_id,
      success: true,
      duration_ms,
    };
  } catch (error: unknown) {
    const duration_ms = Date.now() - startTime;
    const errorName = error instanceof Error ? error.name : "Error";

    return {
      job_id: job.id,
      account_id: job.account_id,
      success: false,
      error: errorName === "AbortError" ? "Job timeout" : truncateError(error),
      duration_ms,
    };
  }
}

/**
 * Update sync_status when job starts (sets last_sync_started_at)
 */
async function recordSyncStart(
  admin: SupabaseClient,
  job: SyncJob,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    await admin.from("sync_status").upsert(
      {
        account_id: job.account_id,
        last_sync_started_at: now,
        last_sync_status: "running",
      },
      {
        onConflict: "account_id",
        ignoreDuplicates: false,
      },
    );
  } catch (error) {
    console.error(
      `Failed to record sync start for ${job.account_id}:`,
      getErrorMessage(error),
    );
    // Non-critical, continue
  }
}

/**
 * Update job status in sync_queue after processing
 * Now with comprehensive error handling and database-level increments
 */
async function updateJobStatus(
  admin: SupabaseClient,
  job: SyncJob,
  result: JobResult,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    if (result.success) {
      // Mark job as succeeded
      const { error: updateError } = await admin
        .from("sync_queue")
        .update({
          status: "succeeded",
          completed_at: now,
          error_message: null,
        })
        .eq("id", job.id);

      if (updateError) {
        throw new Error(
          `Failed to update job status: ${getErrorMessage(updateError)}`,
        );
      }

      // Update sync_status using Postgres function (atomic, no race condition)
      const { error: statusError } = await admin.rpc(
        "update_sync_status_success",
        {
          p_account_id: job.account_id,
          p_sync_type: job.sync_type,
          p_completed_at: now,
        },
      );

      if (statusError) {
        console.error(
          `Failed to update sync_status: ${getErrorMessage(statusError)}`,
        );
        // Non-critical for job completion
      }
    } else {
      // Job failed - check if we should retry
      const should_retry = job.attempts < job.max_attempts;

      if (should_retry) {
        // Calculate exponential backoff delay
        // job.attempts has already been incremented by pick_sync_jobs
        // So: attempts=1 → 1st retry → delay=2min, attempts=2 → 2nd retry → delay=4min, etc.
        const retryNumber = job.attempts - 1; // 0-based for cleaner exponential
        const delay_ms = CONFIG.RETRY_DELAY_BASE_MS * Math.pow(2, retryNumber);
        const scheduled_at = new Date(Date.now() + delay_ms).toISOString();

        console.log(
          `🔄 Scheduling retry ${job.attempts}/${job.max_attempts} for job ${job.id} in ${delay_ms}ms`,
        );

        // Reset to pending for retry
        const { error: retryError } = await admin
          .from("sync_queue")
          .update({
            status: "pending",
            scheduled_at,
            error_message: result.error || "Unknown error",
            started_at: null, // Reset so it can be picked again
            completed_at: null,
          })
          .eq("id", job.id);

        if (retryError) {
          throw new Error(
            `Failed to schedule retry: ${getErrorMessage(retryError)}`,
          );
        }
      } else {
        // Max attempts reached, mark as permanently failed
        console.error(
          `❌ Job ${job.id} failed permanently after ${job.attempts} attempts`,
        );

        const { error: failError } = await admin
          .from("sync_queue")
          .update({
            status: "failed",
            completed_at: now,
            error_message: result.error || "Unknown error",
          })
          .eq("id", job.id);

        if (failError) {
          throw new Error(
            `Failed to mark job as failed: ${getErrorMessage(failError)}`,
          );
        }

        // Update sync_status using Postgres function (atomic, no race condition)
        const { error: statusError } = await admin.rpc(
          "update_sync_status_failure",
          {
            p_account_id: job.account_id,
            p_error: result.error || "Unknown error",
            p_completed_at: now,
          },
        );

        if (statusError) {
          console.error(
            `Failed to update sync_status: ${getErrorMessage(statusError)}`,
          );
          // Non-critical for job completion
        }
      }
    }
  } catch (error) {
    // Critical error updating job status
    console.error(
      `🚨 CRITICAL: Failed to update job ${job.id} status:`,
      getErrorMessage(error),
    );
    // Don't re-throw - we want to continue processing other jobs
    // This job will be marked as stale eventually and retried
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
    results: [],
  };

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");

  if (!SUPABASE_URL || !TRIGGER_SECRET) {
    const error = new Error("Missing SUPABASE_URL or TRIGGER_SECRET in worker");
    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: "failed",
      notes: getErrorMessage(error),
    });
    throw error;
  }

  try {
    // Pick jobs
    const jobs = await pickJobsForProcessing(admin, CONFIG.MAX_JOBS_PER_RUN);
    stats.jobs_picked = jobs.length;

    if (jobs.length === 0) {
      console.log("ℹ️ No pending jobs found");
      await updateWorkerRun(admin, run_id, {
        ...stats,
        status: "completed",
        notes: "No pending jobs",
      });
      return stats;
    }

    console.log(`📋 Picked ${jobs.length} jobs for processing`);

    // Track consecutive failures for circuit breaker
    let consecutiveFailures = 0;
    const unprocessedJobIds: string[] = [];

    // Process jobs sequentially (to avoid rate limits)
    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];

      // Check if we're approaching timeout BEFORE starting job
      const elapsed = Date.now() - startTime;
      const remainingTime =
        CONFIG.WORKER_TIMEOUT_MS - CONFIG.TIMEOUT_MARGIN_MS - elapsed;

      if (remainingTime < CONFIG.JOB_TIMEOUT_MS) {
        console.warn(
          `⏱️ Insufficient time remaining (${remainingTime}ms), stopping early`,
        );
        // Collect remaining unprocessed jobs
        for (let j = i; j < jobs.length; j++) {
          unprocessedJobIds.push(jobs[j].id);
        }
        break;
      }

      console.log(
        `🔄 Processing job ${i + 1}/${jobs.length}: ${job.id} (account: ${job.account_id}, type: ${job.sync_type}, attempt: ${job.attempts}/${job.max_attempts})`,
      );

      // Record sync start in sync_status
      await recordSyncStart(admin, job);

      // Process the job
      const result = await processJob(job, SUPABASE_URL, TRIGGER_SECRET);
      stats.results.push(result);
      stats.jobs_processed++;

      if (result.success) {
        stats.jobs_succeeded++;
        consecutiveFailures = 0; // Reset circuit breaker
        console.log(`✅ Job ${job.id} succeeded (${result.duration_ms}ms)`);
      } else {
        stats.jobs_failed++;
        consecutiveFailures++;
        console.error(
          `❌ Job ${job.id} failed: ${result.error} (${result.duration_ms}ms)`,
        );

        // Circuit breaker: stop if too many consecutive failures
        if (consecutiveFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
          console.error(
            `🔴 Circuit breaker triggered after ${consecutiveFailures} consecutive failures`,
          );
          // Collect remaining unprocessed jobs
          for (let j = i + 1; j < jobs.length; j++) {
            unprocessedJobIds.push(jobs[j].id);
          }
          // Update current job status before breaking
          await updateJobStatus(admin, job, result);
          break;
        }
      }

      // Update job status
      await updateJobStatus(admin, job, result);
    }

    // Reset any unprocessed jobs back to pending
    if (unprocessedJobIds.length > 0) {
      await resetJobsToPending(admin, unprocessedJobIds);
    }

    // Update worker run with success
    const notes =
      unprocessedJobIds.length > 0
        ? `Processed ${stats.jobs_processed}/${stats.jobs_picked} jobs (${unprocessedJobIds.length} reset to pending)`
        : `Processed ${stats.jobs_processed}/${stats.jobs_picked} jobs`;

    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: "completed",
      notes,
    });

    console.log(
      `✅ Worker completed: ${stats.jobs_succeeded} succeeded, ${stats.jobs_failed} failed, ${unprocessedJobIds.length} reset`,
    );
  } catch (error: unknown) {
    console.error("❌ Worker error:", getErrorMessage(error));

    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: "failed",
      notes: truncateError(error),
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // Verify authorization (either trigger secret or service role key)
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET") || "replace-me-now";
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const triggerSecret =
      req.headers.get("X-Trigger-Secret") ||
      req.headers.get("X-Internal-Worker");
    const authHeader = req.headers.get("Authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    const isValidTrigger = triggerSecret && triggerSecret === TRIGGER_SECRET;
    const isValidServiceRole = bearerToken && bearerToken === SERVICE_ROLE_KEY;

    if (!isValidTrigger && !isValidServiceRole) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
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
        jobs_failed: stats.jobs_failed,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: unknown) {
    console.error("❌ Worker handler error:", getErrorMessage(error));

    return new Response(
      JSON.stringify({
        success: false,
        error: truncateError(error),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
