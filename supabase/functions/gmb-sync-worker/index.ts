import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * ============================================================================
 * GMB Sync Worker - PRODUCTION VERSION
 * ============================================================================
 *
 * SCHEMA CONTRACT (sync_worker_runs table):
 * - id: UUID (PK)
 * - status: 'pending' | 'running' | 'completed' | 'failed'
 * - jobs_picked: INTEGER
 * - jobs_succeeded: INTEGER
 * - jobs_failed: INTEGER
 * - notes: TEXT
 * - metadata: JSONB
 * - started_at: TIMESTAMPTZ
 * - completed_at: TIMESTAMPTZ  <-- NOT finished_at
 * - created_at: TIMESTAMPTZ
 *
 * ⚠️ NO jobs_processed column exists in DB - do not try to update it
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
  WORKER_TIMEOUT_MS: 55000,
  JOB_TIMEOUT_MS: 45000,
  TIMEOUT_MARGIN_MS: 5000,
  MAX_JOBS_PER_RUN: 10,
  DEFAULT_MAX_ATTEMPTS: 3,
  RETRY_DELAY_BASE_MS: 60000,
  STALE_JOB_THRESHOLD_MS: 10 * 60 * 1000,
  CIRCUIT_BREAKER_THRESHOLD: 5,
};

// ============================================================================
// Types - Matched to DB Schema
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

/** Internal stats - jobs_processed is for internal tracking only, NOT saved to DB */
interface WorkerRunStats {
  run_id: string;
  jobs_picked: number;
  jobs_succeeded: number;
  jobs_failed: number;
  results: JobResult[];
}

// ============================================================================
// Helper Functions
// ============================================================================

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error)
    return String(error.message);
  return "Unknown error";
}

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
 *
 * DB COLUMNS (sync_worker_runs):
 * - completed_at (NOT finished_at)
 * - jobs_picked, jobs_succeeded, jobs_failed
 * - NO jobs_processed column
 */
async function updateWorkerRun(
  admin: SupabaseClient,
  run_id: string,
  stats: Partial<WorkerRunStats> & { status: string; notes?: string },
): Promise<void> {
  const updatePayload = {
    completed_at: new Date().toISOString(),
    status: stats.status,
    jobs_picked: stats.jobs_picked ?? 0,
    jobs_succeeded: stats.jobs_succeeded ?? 0,
    jobs_failed: stats.jobs_failed ?? 0,
    notes: stats.notes ?? null,
    metadata: stats.results ? { results: stats.results } : {},
  };

  const { error } = await admin
    .from("sync_worker_runs")
    .update(updatePayload)
    .eq("id", run_id);

  if (error) {
    console.error(
      `[Worker] Failed to update run ${run_id}:`,
      getErrorMessage(error),
    );
  }
}

/**
 * Reset jobs back to pending state
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
      attempts: admin.sql`attempts - 1`,
    })
    .in("id", jobIds);

  if (error) {
    console.error(`Failed to reset jobs to pending:`, getErrorMessage(error));
  } else {
    console.log(`♻️ Reset ${jobIds.length} unprocessed jobs to pending`);
  }
}

/**
 * Pick pending jobs from queue
 */
async function pickJobsForProcessing(
  admin: SupabaseClient,
  limit: number,
): Promise<SyncJob[]> {
  try {
    // First, mark stale jobs as failed
    await admin.rpc("mark_stale_sync_jobs");
  } catch (err) {
    console.error("⚠️ Exception marking stale jobs:", getErrorMessage(err));
  }

  // Pick jobs using RPC function
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
 * Process a single sync job by calling gmb-process Edge Function
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

async function recordSyncStart(
  admin: SupabaseClient,
  job: SyncJob,
): Promise<void> {
  try {
    await admin.from("sync_status").upsert(
      {
        account_id: job.account_id,
        last_sync_started_at: new Date().toISOString(),
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
  }
}

async function updateJobStatus(
  admin: SupabaseClient,
  job: SyncJob,
  result: JobResult,
): Promise<void> {
  const now = new Date().toISOString();

  try {
    if (result.success) {
      // Mark job as succeeded
      await admin
        .from("sync_queue")
        .update({
          status: "completed", // Fixed: matches DB constraint
          completed_at: now,
          error_message: null,
        })
        .eq("id", job.id);

      await admin.rpc("update_sync_status_success", {
        p_account_id: job.account_id,
        p_sync_type: job.sync_type,
        p_completed_at: now,
      });
    } else {
      // Job failed
      const should_retry = job.attempts < job.max_attempts;

      if (should_retry) {
        const retryNumber = job.attempts - 1;
        const delay_ms = CONFIG.RETRY_DELAY_BASE_MS * Math.pow(2, retryNumber);
        const scheduled_at = new Date(Date.now() + delay_ms).toISOString();

        console.log(`🔄 Scheduling retry for job ${job.id}`);

        await admin
          .from("sync_queue")
          .update({
            status: "pending",
            scheduled_at,
            error_message: result.error || "Unknown error",
            started_at: null,
            completed_at: null,
          })
          .eq("id", job.id);
      } else {
        console.error(`❌ Job ${job.id} failed permanently`);

        await admin
          .from("sync_queue")
          .update({
            status: "failed",
            completed_at: now,
            error_message: result.error || "Unknown error",
          })
          .eq("id", job.id);

        await admin.rpc("update_sync_status_failure", {
          p_account_id: job.account_id,
          p_error: result.error || "Unknown error",
          p_completed_at: now,
        });
      }
    }
  } catch (error) {
    console.error(
      `🚨 CRITICAL: Failed to update job ${job.id} status:`,
      getErrorMessage(error),
    );
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

    let consecutiveFailures = 0;
    const unprocessedJobIds: string[] = [];

    for (let i = 0; i < jobs.length; i++) {
      const job = jobs[i];
      const elapsed = Date.now() - startTime;
      const remainingTime =
        CONFIG.WORKER_TIMEOUT_MS - CONFIG.TIMEOUT_MARGIN_MS - elapsed;

      if (remainingTime < CONFIG.JOB_TIMEOUT_MS) {
        console.warn(`⏱️ Insufficient time remaining, stopping early`);
        for (let j = i; j < jobs.length; j++) {
          unprocessedJobIds.push(jobs[j].id);
        }
        break;
      }

      console.log(`🔄 Processing job ${job.id}`);
      await recordSyncStart(admin, job);

      const result = await processJob(job, SUPABASE_URL, TRIGGER_SECRET);
      stats.results.push(result);

      if (result.success) {
        stats.jobs_succeeded++;
        consecutiveFailures = 0;
      } else {
        stats.jobs_failed++;
        consecutiveFailures++;

        if (consecutiveFailures >= CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
          console.error(`🔴 Circuit breaker triggered`);
          for (let j = i + 1; j < jobs.length; j++) {
            unprocessedJobIds.push(jobs[j].id);
          }
          await updateJobStatus(admin, job, result);
          break;
        }
      }

      await updateJobStatus(admin, job, result);
    }

    if (unprocessedJobIds.length > 0) {
      await resetJobsToPending(admin, unprocessedJobIds);
    }

    const jobsProcessed = stats.results.length;
    const notes =
      unprocessedJobIds.length > 0
        ? `Processed ${jobsProcessed}/${stats.jobs_picked} jobs (${unprocessedJobIds.length} reset)`
        : `Processed ${jobsProcessed}/${stats.jobs_picked} jobs`;

    await updateWorkerRun(admin, run_id, {
      ...stats,
      status: "completed",
      notes,
    });
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
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");
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

    const admin = getAdminClient();
    const stats = await runWorker(admin);

    return new Response(
      JSON.stringify({
        success: true,
        run_id: stats.run_id,
        jobs_picked: stats.jobs_picked,
        jobs_succeeded: stats.jobs_succeeded,
        jobs_failed: stats.jobs_failed,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: unknown) {
    return new Response(
      JSON.stringify({
        success: false,
        error: truncateError(error),
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
