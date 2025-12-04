/**
 * ============================================================================
 * Process Queue Cron Endpoint
 * ============================================================================
 *
 * This cron endpoint processes pending sync jobs from the queue using the
 * event-driven micro-jobs architecture. It runs every minute and processes
 * up to 10 jobs in parallel.
 *
 * Flow:
 * 1. Fetch pending jobs from sync_queue (with job_type in metadata)
 * 2. Mark jobs as "processing" atomically
 * 3. Process jobs in parallel using Promise.allSettled
 * 4. Return summary of results
 *
 * @security Protected with withCronAuth - requires CRON_SECRET
 */

import { withCronAuth } from "@/lib/security/cron-auth";
import {
  getPendingJobsForWorker,
  updateJobStatus,
} from "@/server/actions/sync-queue";
import { processSyncJob } from "@/server/workers/sync-worker";
import { syncLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

// Vercel function configuration
export const maxDuration = 60; // 60 seconds max
export const dynamic = "force-dynamic";

// Maximum jobs to process per cron run
const MAX_JOBS_PER_RUN = 10;

/**
 * Main handler for processing the queue
 */
async function handleProcessQueue(_request: Request): Promise<Response> {
  const startTime = Date.now();

  try {
    syncLogger.info("Process queue cron started");

    // Step 1: Fetch pending jobs
    const pendingJobs = await getPendingJobsForWorker(MAX_JOBS_PER_RUN);

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs to process",
        processed: 0,
        duration_ms: Date.now() - startTime,
      });
    }

    syncLogger.info("Found pending jobs", { count: pendingJobs.length });

    // Step 2: Mark all jobs as "processing" atomically
    // This prevents other cron instances from picking up the same jobs
    const markingPromises = pendingJobs.map((job) =>
      updateJobStatus(job.id, "processing"),
    );
    await Promise.all(markingPromises);

    // Step 3: Process jobs in parallel using Promise.allSettled
    // This ensures all jobs are attempted even if some fail
    const processingPromises = pendingJobs.map((job) => processSyncJob(job));
    const results = await Promise.allSettled(processingPromises);

    // Step 4: Compile results
    const summary = {
      total: results.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      jobDetails: [] as Array<{
        jobId: string;
        jobType: string;
        status: "success" | "failed";
        error?: string;
        itemsProcessed?: number;
      }>,
    };

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const job = pendingJobs[i];

      if (result.status === "fulfilled" && result.value.success) {
        summary.successful++;
        summary.jobDetails.push({
          jobId: job.id,
          jobType: job.metadata.job_type,
          status: "success",
          itemsProcessed: result.value.itemsProcessed,
        });
      } else {
        summary.failed++;
        const errorMessage =
          result.status === "rejected"
            ? result.reason?.message || "Unknown error"
            : result.value?.error || "Job failed";

        summary.errors.push(`${job.id}: ${errorMessage}`);
        summary.jobDetails.push({
          jobId: job.id,
          jobType: job.metadata.job_type,
          status: "failed",
          error: errorMessage,
        });
      }
    }

    const durationMs = Date.now() - startTime;

    syncLogger.info("Process queue cron completed", {
      ...summary,
      duration_ms: durationMs,
    });

    return NextResponse.json({
      success: true,
      message: `Processed ${summary.total} jobs`,
      processed: summary.total,
      successful: summary.successful,
      failed: summary.failed,
      duration_ms: durationMs,
      errors: summary.errors.length > 0 ? summary.errors : undefined,
      details: summary.jobDetails,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    syncLogger.error(
      "Process queue cron failed",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        duration_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

// Export GET with cron authentication wrapper
export const GET = withCronAuth(handleProcessQueue);
