import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getPendingSyncJobs,
  updateSyncQueueStatus,
} from "@/server/actions/sync-queue";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for queue processing

/**
 * POST /api/gmb/queue/process
 * Process pending sync jobs from the queue
 * Called by Vercel Cron every hour
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pending jobs
    const pendingJobs = await getPendingSyncJobs(5); // Process 5 jobs at a time

    if (pendingJobs.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending jobs",
        processed: 0,
      });
    }

    console.warn(`[Queue Processor] Processing ${pendingJobs.length} jobs`);

    const results = await Promise.allSettled(
      pendingJobs.map(async (job) => {
        try {
          // Mark as processing
          await updateSyncQueueStatus(job.id, "processing");

          // Trigger sync API
          const syncResponse = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:5050"}/api/gmb/sync`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cronSecret}`,
              },
              body: JSON.stringify({
                accountId: job.account_id,
                syncType: job.sync_type,
                queueId: job.id,
              }),
            },
          );

          if (!syncResponse.ok) {
            const error = await syncResponse.text();
            throw new Error(`Sync failed: ${error}`);
          }

          // Mark as completed
          await updateSyncQueueStatus(job.id, "completed");

          return { jobId: job.id, status: "success" };
        } catch (error) {
          console.error(`[Queue Processor] Job ${job.id} failed:`, error);

          // Mark as failed
          await updateSyncQueueStatus(
            job.id,
            "failed",
            error instanceof Error ? error.message : "Unknown error",
          );

          return {
            jobId: job.id,
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      }),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "success",
    ).length;
    const failed = results.filter(
      (r) => r.status === "fulfilled" && r.value.status === "failed",
    ).length;

    return NextResponse.json({
      success: true,
      processed: pendingJobs.length,
      successful,
      failed,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { status: "error" },
      ),
    });
  } catch (error) {
    console.error("[Queue Processor] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
