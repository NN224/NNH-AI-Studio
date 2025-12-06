import { checkKeyRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { enqueueSyncJob } from "@/server/actions/sync-queue";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Stricter rate limit for sync initiation: 10 requests per 10 minutes
const ENQUEUE_SYNC_RATE_LIMIT = 10;
const ENQUEUE_SYNC_WINDOW_MS = 600000; // 10 minutes

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

    // Rate limiting for sync initiation
    const rateLimitKey = `api:gmb-enqueue-sync:${user.id}`;
    const rateLimitResult = await checkKeyRateLimit(
      rateLimitKey,
      ENQUEUE_SYNC_RATE_LIMIT,
      ENQUEUE_SYNC_WINDOW_MS,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: "Too many sync requests. Please wait before trying again.",
          retryAfter: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: rateLimitResult.headers,
        },
      );
    }

    const body = await request.json();
    const { accountId: requestAccountId, syncType = "full" } = body;
    accountId = requestAccountId;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 },
      );
    }

    // Check if GMB account exists and is active
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, is_active")
      .eq("id", accountId)
      .single();

    if (accountError || !account) {
      gmbLogger.error(
        "GMB account not found or error checking account",
        accountError instanceof Error
          ? accountError
          : new Error(String(accountError)),
        { accountId, userId },
      );
      return NextResponse.json(
        {
          error: "gmb_account_not_found",
          message: "GMB account not found. Please reconnect your account.",
        },
        { status: 400 },
      );
    }

    if (!account.is_active) {
      gmbLogger.warn("GMB account is not active", { accountId, userId });
      return NextResponse.json(
        {
          error: "gmb_account_inactive",
          message: "GMB account is not active. Please reconnect your account.",
        },
        { status: 400 },
      );
    }

    // THROTTLING CHECK: Prevent duplicate sync jobs
    // Check if there's already a processing/pending job for this account
    const { data: existingJobs, error: checkError } = await supabase
      .from("sync_queue")
      .select("id, status, created_at")
      .eq("account_id", accountId)
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
    // First, get the Google account ID needed for the sync
    const { data: gmbAccount, error: gmbError } = await supabase
      .from("gmb_accounts")
      .select("account_id")
      .eq("id", accountId)
      .single();

    if (gmbError || !gmbAccount) {
      gmbLogger.error(
        "Failed to fetch GMB account for sync",
        gmbError instanceof Error ? gmbError : new Error(String(gmbError)),
        { accountId, userId },
      );
      return NextResponse.json(
        { error: "Failed to fetch account details" },
        { status: 500 },
      );
    }

    const priority = syncType === "full" ? 7 : 5;

    // Use enqueueSyncJob instead of addToSyncQueue to include proper metadata
    const result = await enqueueSyncJob(
      "discovery_locations",
      {
        userId: user.id,
        accountId,
        googleAccountId: gmbAccount.account_id,
      },
      priority,
    );

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
