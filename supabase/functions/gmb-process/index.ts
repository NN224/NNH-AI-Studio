/**
 * ============================================================================
 * GMB Process Edge Function (SYNC EXECUTOR)
 * ============================================================================
 *
 * PURPOSE:
 * Executes the actual GMB sync by calling the internal Next.js API endpoint.
 * This function is called by gmb-sync-worker after picking jobs from the queue.
 *
 * ARCHITECTURE:
 * 1. gmb-sync-worker picks job from sync_queue
 * 2. gmb-sync-worker calls THIS function with job details
 * 3. THIS function calls /api/gmb/sync-v2 (internal endpoint)
 * 4. sync-v2 executes performTransactionalSync with database transactions
 * 5. Results are returned to worker for status update
 *
 * DATA INTEGRITY:
 * - All database operations use transactions via sync_gmb_data_transactional RPC
 * - Partial failures are rolled back automatically
 * - Job status is updated in sync_queue table
 *
 * ============================================================================
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_URL =
  Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_URL") || "";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": APP_URL || "*",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Internal-Run, X-Trigger-Secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "X-Content-Type-Options": "nosniff",
};

// Timeout for sync operations (50 seconds to stay under Edge Function limits)
const SYNC_TIMEOUT_MS = 50000;

interface SyncRequest {
  accountId?: string;
  account_id?: string;
  userId?: string;
  user_id?: string;
  syncType?: string;
  sync_type?: string;
  jobId?: string;
  job_id?: string;
}

interface SyncResult {
  ok: boolean;
  success?: boolean;
  locations_synced?: number;
  reviews_synced?: number;
  questions_synced?: number;
  posts_synced?: number;
  media_synced?: number;
  insights_synced?: number;
  sync_id?: string;
  error?: string;
  message?: string;
  took_ms?: number;
}

/**
 * Update job status in sync_queue table
 */
async function updateJobStatus(
  jobId: string,
  status: "running" | "completed" | "failed",
  error?: string,
): Promise<void> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY || !jobId) return;

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status,
      ...(status === "running" ? { started_at: now } : {}),
      ...(status === "completed" || status === "failed"
        ? { completed_at: now }
        : {}),
      ...(error ? { error_message: error.slice(0, 500) } : {}),
    };

    await supabase.from("sync_queue").update(updateData).eq("id", jobId);
  } catch (err) {
    console.error("[GMB Process] Failed to update job status:", err);
  }
}

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

  const startTime = Date.now();

  try {
    // -------------------------------------------------------------------------
    // 1. VERIFY INTERNAL SECRET
    // -------------------------------------------------------------------------
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");
    const providedSecret =
      req.headers.get("X-Internal-Run") || req.headers.get("X-Trigger-Secret");

    if (!TRIGGER_SECRET || providedSecret !== TRIGGER_SECRET) {
      console.error("[GMB Process] Unauthorized: Invalid trigger secret");
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        {
          status: 401,
          headers: corsHeaders,
        },
      );
    }

    // -------------------------------------------------------------------------
    // 2. PARSE REQUEST BODY
    // -------------------------------------------------------------------------
    const body: SyncRequest = await req.json();
    const accountId = body.accountId || body.account_id;
    const userId = body.userId || body.user_id;
    const syncType = body.syncType || body.sync_type || "full";
    const jobId = body.jobId || body.job_id;

    if (!accountId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "missing_params",
          message: "accountId is required",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    console.warn(
      `[GMB Process] Starting sync for account ${accountId} (${syncType})${jobId ? ` job=${jobId}` : ""}`,
    );

    // Update job status to running
    if (jobId) {
      await updateJobStatus(jobId, "running");
    }

    // -------------------------------------------------------------------------
    // 3. CALL INTERNAL SYNC ENDPOINT
    // -------------------------------------------------------------------------
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APP_URL) {
      throw new Error("APP_URL environment variable is not set");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SYNC_TIMEOUT_MS);

    try {
      const response = await fetch(`${APP_URL}/api/gmb/sync-v2`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Run": TRIGGER_SECRET,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          accountId,
          userId,
          includeQuestions: syncType === "full",
          includePosts: syncType === "full",
          includeMedia: syncType === "full",
          includeInsights: true,
          isInternalCall: true,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // -------------------------------------------------------------------------
      // 4. HANDLE RESPONSE
      // -------------------------------------------------------------------------
      if (!response.ok) {
        let errorText = "Unknown error";
        try {
          const errorJson = await response.json();
          errorText = errorJson.error || errorJson.message || errorText;
        } catch {
          errorText = await response.text().catch(() => "Unknown error");
        }

        console.error(
          `[GMB Process] API Error (${response.status}): ${errorText}`,
        );

        // Update job status to failed
        if (jobId) {
          await updateJobStatus(jobId, "failed", errorText);
        }

        return new Response(
          JSON.stringify({
            ok: false,
            error: "sync_failed",
            message: errorText,
            took_ms: Date.now() - startTime,
          }),
          { status: response.status, headers: corsHeaders },
        );
      }

      const result: SyncResult = await response.json();
      const tookMs = Date.now() - startTime;

      console.warn(
        `[GMB Process] Sync completed for ${accountId} in ${tookMs}ms:`,
        {
          locations: result.locations_synced,
          reviews: result.reviews_synced,
          questions: result.questions_synced,
        },
      );

      // Update job status to completed
      if (jobId) {
        await updateJobStatus(jobId, "completed");
      }

      return new Response(
        JSON.stringify({
          ...result,
          ok: true,
          took_ms: tookMs,
        }),
        { status: 200, headers: corsHeaders },
      );
    } catch (fetchError) {
      clearTimeout(timeout);

      const isTimeout =
        fetchError instanceof Error && fetchError.name === "AbortError";
      const errorMessage = isTimeout
        ? "Sync operation timed out"
        : fetchError instanceof Error
          ? fetchError.message
          : "Unknown fetch error";

      console.error(`[GMB Process] Fetch error: ${errorMessage}`);

      // Update job status to failed
      if (jobId) {
        await updateJobStatus(jobId, "failed", errorMessage);
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: isTimeout ? "timeout" : "fetch_error",
          message: errorMessage,
          took_ms: Date.now() - startTime,
        }),
        { status: isTimeout ? 504 : 500, headers: corsHeaders },
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GMB Process] Exception:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_error",
        message,
        took_ms: Date.now() - startTime,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
