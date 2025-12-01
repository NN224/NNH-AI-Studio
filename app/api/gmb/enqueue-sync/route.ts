import { gmbLogger } from "@/lib/utils/logger";
import { createClient } from "@/lib/supabase/server";
import { addToSyncQueue } from "@/server/actions/sync-queue";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Enqueue Sync API
 *
 * Adds a sync job to the queue with throttling protection.
 * If a job is already processing for this account, returns 429 or joins existing job.
 */
export async function POST(request: NextRequest) {
  let accountId: string | undefined;
  let userId: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }
    userId = user.id;

    const body = await request.json();
    const { accountId: requestAccountId, syncType = "full" } = body;
    accountId = requestAccountId;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 },
      );
    }

    // ✅ THROTTLING CHECK: Prevent duplicate sync jobs
    // Check if there's already a processing/pending job for this account
    const { data: existingJobs, error: checkError } = await supabase
      .from("sync_queue")
      .select("id, status, created_at")
      .eq("gmb_account_id", accountId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (checkError) {
      gmbLogger.error(
        "Error checking existing jobs",
        checkError instanceof Error
          ? checkError
          : new Error(String(checkError)),
        { accountId, userId },
      );
      // Continue anyway - better to allow sync than block it
    }

    if (existingJobs && existingJobs.length > 0) {
      const existingJob = existingJobs[0];
      gmbLogger.warn("Sync job already queued for account", {
        accountId,
        status: existingJob.status,
        jobId: existingJob.id,
      });

      // Return 429 with info about existing job
      return NextResponse.json(
        {
          error: "sync_in_progress",
          message: "A sync is already in progress for this account",
          existingJobId: existingJob.id,
          status: existingJob.status,
        },
        { status: 429 },
      );
    }

    // No existing job - create new one
    const priority = syncType === "full" ? 7 : 5;
    const result = await addToSyncQueue(accountId, syncType, priority, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to enqueue sync" },
        { status: 500 },
      );
    }

    gmbLogger.info("Queued sync job", {
      accountId,
      queueId: result.queueId,
      syncType,
      userId,
    });

    return NextResponse.json({
      success: true,
      queueId: result.queueId,
      message: "Sync job queued successfully",
    });
  } catch (error) {
    gmbLogger.error(
      "Unexpected error while enqueueing sync",
      error instanceof Error ? error : new Error(String(error)),
      { accountId, userId },
    );
    return NextResponse.json(
      {
        error: "internal_error",
        message:
          error instanceof Error ? error.message : "Failed to enqueue sync",
      },
      { status: 500 },
    );
  }
}
