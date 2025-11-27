import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * ============================================================================
 * GMB Sync Edge Function (PRODUCTION VERSION)
 * ============================================================================
 *
 * PURPOSE:
 * Enqueues GMB sync jobs to PGMQ queue and returns immediately.
 * Does NOT wait for sync to complete - prevents 504 timeouts.
 *
 * FLOW:
 * 1. Validate request (user auth or internal secret)
 * 2. Enqueue job to PGMQ
 * 3. Return 200 OK with job_id immediately
 * 4. Worker processes the job asynchronously
 *
 * ============================================================================
 */

// Get environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL =
  Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_URL") || "*";

// Dynamic CORS based on environment
const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": APP_URL,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Run",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'",
};

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

  const startTime = Date.now();

  try {
    // ---------------------------------------------------------------------
    // AUTHENTICATION
    // ---------------------------------------------------------------------
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("[GMB Sync] Unauthorized: Missing Authorization header");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unauthorized",
          message: "Missing authentication",
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    // Create Supabase client with user's JWT
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify user authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[GMB Sync] Auth verification failed:", authError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unauthorized",
          message: "Invalid authentication",
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // Parse request body
    // ---------------------------------------------------------------------
    let accountId: string;
    let syncType = "full";
    let priority = 0;

    try {
      const body = await req.json();
      accountId = body.accountId || body.account_id;
      syncType = body.syncType || body.sync_type || "full";
      priority = body.priority || 0;
    } catch (error) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_request",
          message: "Invalid JSON payload",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    if (!accountId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_request",
          message: "accountId is required",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    console.log(
      `[GMB Sync] Enqueuing sync job for account ${accountId} (${syncType}) by user ${user.id}`,
    );

    // ---------------------------------------------------------------------
    // ENQUEUE JOB TO PGMQ (NO WAITING)
    // ---------------------------------------------------------------------
    // Use service role client for database operations
    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Call the enqueue_sync_job function
    const { data: jobId, error: enqueueError } = await serviceClient.rpc(
      "enqueue_sync_job",
      {
        p_account_id: accountId,
        p_user_id: user.id,
        p_sync_type: syncType,
        p_priority: priority,
      },
    );

    if (enqueueError) {
      console.error("[GMB Sync] Failed to enqueue job:", enqueueError);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "enqueue_failed",
          message: enqueueError.message || "Failed to enqueue sync job",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const tookMs = Date.now() - startTime;

    console.log(
      `[GMB Sync] Job enqueued successfully: ${jobId} in ${tookMs}ms`,
    );

    // ---------------------------------------------------------------------
    // Return immediately with job ID
    // ---------------------------------------------------------------------
    return new Response(
      JSON.stringify({
        ok: true,
        status: "queued",
        job_id: jobId,
        account_id: accountId,
        sync_type: syncType,
        priority,
        message:
          "Sync job queued successfully. Worker will process it shortly.",
        took_ms: tookMs,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const tookMs = Date.now() - startTime;

    console.error("[GMB Sync] Exception:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_error",
        message: msg,
        took_ms: tookMs,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
