/**
 * ============================================================================
 * GMB Sync Status API Route
 * ============================================================================
 *
 * PURPOSE:
 * Check the status of a sync job by job_id.
 * Returns current status, progress, and results when complete.
 *
 * ============================================================================
 */

import { checkKeyRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { ApiError, errorResponse } from "@/utils/api-error";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Permissive rate limit for polling endpoint: 100 requests per 60s
const SYNC_STATUS_RATE_LIMIT = 100;
const SYNC_STATUS_WINDOW_MS = 60000;

interface SyncJobStatus {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  account_id: string; // Fixed: was gmb_account_id
  user_id: string;
  sync_type: string;
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  scheduled_at: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // -------------------------------------------------------------------------
    // AUTHENTICATION
    // -------------------------------------------------------------------------
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return errorResponse(new ApiError("Authentication required", 401));
    }

    // -------------------------------------------------------------------------
    // RATE LIMITING (permissive for polling)
    // -------------------------------------------------------------------------
    const rateLimitKey = `api:gmb-sync-status:${user.id}`;
    const rateLimitResult = await checkKeyRateLimit(
      rateLimitKey,
      SYNC_STATUS_RATE_LIMIT,
      SYNC_STATUS_WINDOW_MS,
    );

    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: rateLimitResult.reset,
        },
        {
          status: 429,
          headers: rateLimitResult.headers,
        },
      );
    }

    // -------------------------------------------------------------------------
    // PARSE QUERY PARAMS
    // -------------------------------------------------------------------------
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || searchParams.get("job_id");
    const accountId =
      searchParams.get("accountId") || searchParams.get("account_id");

    if (!jobId && !accountId) {
      return errorResponse(new ApiError("jobId or accountId is required", 400));
    }

    // -------------------------------------------------------------------------
    // FETCH JOB STATUS
    // -------------------------------------------------------------------------
    let jobs = null;
    let queryError = null;

    if (jobId) {
      const result = await supabase
        .from("sync_queue")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", jobId);
      jobs = result.data;
      queryError = result.error;
    } else if (accountId) {
      // First try to find an active (pending/processing) job
      const activeResult = await supabase
        .from("sync_queue")
        .select("*")
        .eq("user_id", user.id)
        .eq("account_id", accountId)
        .in("status", ["pending", "processing"])
        .order("created_at", { ascending: false })
        .limit(1);

      if (activeResult.data && activeResult.data.length > 0) {
        jobs = activeResult.data;
        queryError = activeResult.error;
      } else {
        // Fallback to most recent job of any status
        const recentResult = await supabase
          .from("sync_queue")
          .select("*")
          .eq("user_id", user.id)
          .eq("account_id", accountId)
          .order("created_at", { ascending: false })
          .limit(1);
        jobs = recentResult.data;
        queryError = recentResult.error;
      }
    }

    if (queryError) {
      gmbLogger.error(
        "Failed to query sync status",
        queryError instanceof Error
          ? queryError
          : new Error(String(queryError)),
        { userId: user.id, jobId, accountId },
      );
      return errorResponse(new ApiError("Failed to fetch job status", 500));
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "not_found",
          message: jobId
            ? "Job not found"
            : "No sync jobs found for this account",
        },
        { status: 404 },
      );
    }

    const job = jobs[0] as SyncJobStatus;

    // Calculate progress percentage based on status
    let progress = 0;
    switch (job.status) {
      case "pending":
        progress = 0;
        break;
      case "processing": // Fixed: was "running"
        progress = 50;
        break;
      case "completed":
        progress = 100;
        break;
      case "failed":
        progress = 100;
        break;
    }

    // -------------------------------------------------------------------------
    // RETURN STATUS
    // -------------------------------------------------------------------------
    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        account_id: job.account_id, // Fixed: was job.gmb_account_id
        sync_type: job.sync_type,
        priority: job.priority,
        progress,
        attempts: job.attempts,
        max_attempts: job.max_attempts,
        error: job.error_message,
        created_at: job.created_at,
        started_at: job.started_at,
        completed_at: job.completed_at,
        scheduled_at: job.scheduled_at,
      },
      is_complete: job.status === "completed" || job.status === "failed",
      is_success: job.status === "completed",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    gmbLogger.error(
      "Sync status endpoint failed",
      error instanceof Error ? error : new Error(String(error)),
    );

    return NextResponse.json(
      {
        ok: false,
        error: "internal_error",
        message,
      },
      { status: 500 },
    );
  }
}
