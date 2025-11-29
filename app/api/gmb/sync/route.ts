/**
 * ============================================================================
 * GMB Sync API Route (LIGHTWEIGHT TRIGGER)
 * ============================================================================
 *
 * PURPOSE:
 * Lightweight trigger endpoint that immediately returns 202 Accepted with a jobId.
 * Does NOT execute sync logic - only enqueues to background worker.
 *
 * ARCHITECTURE:
 * 1. This endpoint validates auth and enqueues job
 * 2. Returns 202 Accepted immediately with job_id
 * 3. Background worker (Edge Function) processes the job asynchronously
 *
 * The actual sync logic runs in Supabase Edge Functions:
 * - supabase/functions/gmb-sync (enqueue)
 * - supabase/functions/gmb-sync-worker (orchestrator)
 * - supabase/functions/gmb-process (processor)
 *
 * For job status, use: /api/gmb/sync-status?jobId=xxx
 *
 * ============================================================================
 */

import { checkKeyRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { ApiError, errorResponse } from "@/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Valid sync types
const VALID_SYNC_TYPES = [
  "full",
  "incremental",
  "locations",
  "reviews",
  "questions",
  "media",
  "performance",
  "keywords",
] as const;

type SyncType = (typeof VALID_SYNC_TYPES)[number];

// Rate limiting: 10 syncs per hour per user/account
const SYNC_LIMIT_PER_HOUR = 10;
const SYNC_WINDOW_MS = 60 * 60 * 1000;

interface SyncRequest {
  accountId?: string;
  account_id?: string;
  syncType?: string;
  sync_type?: string;
  priority?: number;
}

interface EnqueueResult {
  job_id: string;
  status: string;
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // AUTHENTICATION - Support both user auth and cron/internal auth
    // -------------------------------------------------------------------------
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const triggerSecret = process.env.TRIGGER_SECRET;
    const internalHeader =
      request.headers.get("X-Internal-Run") ||
      request.headers.get("X-Trigger-Secret") ||
      request.headers.get("X-Internal-Worker");

    const isCronRequest = cronSecret && authHeader === `Bearer ${cronSecret}`;
    const isInternalRequest = triggerSecret && internalHeader === triggerSecret;

    let userId: string | null = null;

    if (!isCronRequest && !isInternalRequest) {
      // Standard user authentication
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error("[GMB Sync] Authentication failed:", authError);
        return errorResponse(new ApiError("Authentication required", 401));
      }
      userId = user.id;
    }

    // -------------------------------------------------------------------------
    // PARSE REQUEST
    // -------------------------------------------------------------------------
    let body: SyncRequest = {};
    try {
      body = await request.json();
    } catch {
      return errorResponse(new ApiError("Invalid JSON payload", 400));
    }

    const accountId = body.accountId || body.account_id;
    const syncType = (
      (body.syncType || body.sync_type || "full") as string
    ).toLowerCase();
    const priority = body.priority ?? 0;

    if (!accountId) {
      return errorResponse(new ApiError("accountId is required", 400));
    }

    if (!VALID_SYNC_TYPES.includes(syncType as SyncType)) {
      return errorResponse(
        new ApiError(
          `syncType must be one of: ${VALID_SYNC_TYPES.join(", ")}`,
          400,
        ),
      );
    }

    // -------------------------------------------------------------------------
    // VERIFY ACCOUNT OWNERSHIP (TENANT ISOLATION)
    // -------------------------------------------------------------------------
    // SECURITY: For user requests, ALWAYS verify account belongs to authenticated user
    // For cron/internal requests, we trust the accountId but still validate it exists
    let accountQuery = supabase
      .from("gmb_accounts")
      .select("id, user_id, is_active, account_name")
      .eq("id", accountId);

    // CRITICAL: Always filter by user_id for user-initiated requests
    // This prevents users from syncing accounts they don't own
    if (userId) {
      accountQuery = accountQuery.eq("user_id", userId);
    }

    const { data: account, error: accountError } = await accountQuery.single();

    if (accountError || !account) {
      console.error("[GMB Sync] Account not found:", accountError);
      return errorResponse(
        new ApiError("Account not found or access denied", 404),
      );
    }

    if (!account.is_active) {
      return errorResponse(
        new ApiError(
          "Account is inactive. Please reconnect your Google account.",
          400,
        ),
      );
    }

    // Use account's user_id for cron/internal requests
    const effectiveUserId = userId || account.user_id;

    // -------------------------------------------------------------------------
    // RATE LIMITING (skip for cron/internal)
    // -------------------------------------------------------------------------
    if (!isCronRequest && !isInternalRequest) {
      const syncRateKey = `sync:${effectiveUserId}:${accountId}`;
      const rateResult = await checkKeyRateLimit(
        syncRateKey,
        SYNC_LIMIT_PER_HOUR,
        SYNC_WINDOW_MS,
        "ratelimit:sync",
      );

      if (!rateResult.success) {
        const retryAfter = Math.max(
          0,
          rateResult.reset - Math.floor(Date.now() / 1000),
        );
        return NextResponse.json(
          {
            ok: false,
            error: "rate_limit_exceeded",
            message: `Sync rate limit exceeded. Maximum ${SYNC_LIMIT_PER_HOUR} syncs per hour.`,
            retry_after_seconds: retryAfter,
          },
          {
            status: 429,
            headers: {
              "Retry-After": retryAfter.toString(),
              ...rateResult.headers,
            },
          },
        );
      }
    }

    // -------------------------------------------------------------------------
    // ENQUEUE JOB (NO WAITING)
    // -------------------------------------------------------------------------
    const { data: jobResult, error: enqueueError } = await supabase.rpc(
      "enqueue_sync_job",
      {
        p_account_id: accountId,
        p_user_id: effectiveUserId,
        p_sync_type: syncType,
        p_priority: priority,
      },
    );

    if (enqueueError) {
      console.error("[GMB Sync] Failed to enqueue job:", enqueueError);

      // Check for duplicate job error
      if (
        enqueueError.message?.includes("already queued") ||
        enqueueError.message?.includes("duplicate")
      ) {
        return NextResponse.json(
          {
            ok: false,
            error: "sync_already_queued",
            message:
              "A sync job is already queued or running for this account.",
          },
          { status: 409 },
        );
      }

      return errorResponse(new ApiError("Failed to queue sync job", 500));
    }

    const jobId = (jobResult as EnqueueResult)?.job_id || jobResult;

    const tookMs = Date.now() - startTime;

    console.warn(
      `[GMB Sync] Job enqueued: ${jobId} for account ${accountId} (${syncType}) in ${tookMs}ms`,
    );

    // -------------------------------------------------------------------------
    // RETURN 202 ACCEPTED IMMEDIATELY
    // -------------------------------------------------------------------------
    return NextResponse.json(
      {
        ok: true,
        status: "queued",
        job_id: jobId,
        account_id: accountId,
        account_name: account.account_name,
        sync_type: syncType,
        priority,
        message:
          "Sync job queued successfully. Check /api/gmb/sync-status for progress.",
        status_url: `/api/gmb/sync-status?jobId=${jobId}`,
        took_ms: tookMs,
      },
      {
        status: 202,
        headers: {
          "X-Job-Id": String(jobId),
          "X-Sync-Type": syncType,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GMB Sync] Exception:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message,
        took_ms: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

/**
 * GET handler for API documentation
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/gmb/sync",
    method: "POST",
    description:
      "Lightweight sync trigger that returns 202 Accepted immediately",
    architecture:
      "Async job queue - actual sync runs in Supabase Edge Functions",
    required_fields: ["accountId"],
    optional_fields: ["syncType", "priority"],
    valid_sync_types: VALID_SYNC_TYPES,
    status_endpoint: "/api/gmb/sync-status?jobId=xxx",
    response_codes: {
      202: "Job queued successfully",
      400: "Invalid request",
      401: "Authentication required",
      404: "Account not found",
      409: "Sync already in progress",
      429: "Rate limit exceeded",
      500: "Internal error",
    },
  });
}
