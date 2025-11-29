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

    const body = await request.json();
    const { accountId, syncType = "full" } = body;

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
      console.error("[Enqueue Sync] Error checking existing jobs:", checkError);
      // Continue anyway - better to allow sync than block it
    }

    if (existingJobs && existingJobs.length > 0) {
      const existingJob = existingJobs[0];
      console.warn(
        `[Enqueue Sync] Job already ${existingJob.status} for account ${accountId}`,
      );

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

    console.warn(
      `[Enqueue Sync] Successfully queued sync for account ${accountId}`,
    );

    return NextResponse.json({
      success: true,
      queueId: result.queueId,
      message: "Sync job queued successfully",
    });
  } catch (error) {
    console.error("[Enqueue Sync] Unexpected error:", error);
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
