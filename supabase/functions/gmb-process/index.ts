import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * ============================================================================
 * GMB Process Edge Function (HEAVY LIFTER)
 * ============================================================================
 *
 * PURPOSE:
 * Performs the ACTUAL sync logic (Google API → Database).
 * This is the function that does the real work.
 *
 * CALLED BY:
 * - gmb-sync-worker ONLY (via Internal Secret)
 *
 * FLOW:
 * 1. Verify internal secret
 * 2. Get account and decrypt tokens
 * 3. Call Next.js API /api/gmb/sync-v2 (which has all the logic)
 * 4. Return result
 *
 * NOTE: This function proxies to Next.js because the actual sync logic
 * is complex and already implemented there. We don't duplicate it here.
 *
 * ============================================================================
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Run",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    // VERIFY INTERNAL SECRET (Worker Only)
    // ---------------------------------------------------------------------
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");
    const providedSecret = req.headers.get("X-Internal-Run");

    if (!TRIGGER_SECRET || providedSecret !== TRIGGER_SECRET) {
      console.error("[GMB Process] Unauthorized: Invalid internal secret");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unauthorized",
          message: "Internal access only",
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // PARSE REQUEST
    // ---------------------------------------------------------------------
    let accountId: string;
    let userId: string;
    let syncType = "full";

    try {
      const body = await req.json();
      accountId = body.accountId || body.account_id;
      userId = body.userId || body.user_id;
      syncType = body.syncType || body.sync_type || "full";
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

    if (!accountId || !userId) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_request",
          message: "accountId and userId are required",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    console.log(
      `[GMB Process] Processing sync for account ${accountId}, user ${userId}`,
    );

    // ---------------------------------------------------------------------
    // CALL NEXT.JS API (Where the actual logic lives)
    // ---------------------------------------------------------------------
    const APP_URL =
      Deno.env.get("NEXT_PUBLIC_APP_URL") ||
      Deno.env.get("APP_URL") ||
      "https://www.nnh.ae";

    const apiUrl = `${APP_URL}/api/gmb/sync-v2`;

    console.log(`[GMB Process] Calling ${apiUrl}`);

    // Create a service role token for internal call
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    const response = await fetch(apiUrl, {
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
        includePosts: true,
        includeMedia: true,
        includeInsights: true,
        isInternalCall: true,
      }),
    });

    const tookMs = Date.now() - startTime;

    // ---------------------------------------------------------------------
    // HANDLE RESPONSE
    // ---------------------------------------------------------------------
    if (!response.ok) {
      let errorText = "Unknown error";
      let errorJson = null;

      try {
        errorJson = await response.json();
        errorText = errorJson.error || errorJson.message || errorText;
      } catch {
        try {
          errorText = await response.text();
        } catch {
          errorText = `HTTP ${response.status}`;
        }
      }

      console.error(`[GMB Process] API error (${response.status}):`, errorText);

      return new Response(
        JSON.stringify({
          ok: false,
          error: "sync_failed",
          message: errorText,
          account_id: accountId,
          took_ms: tookMs,
        }),
        { status: response.status, headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------------------------
    const result = await response.json();

    console.log(
      `[GMB Process] Sync completed successfully for account ${accountId} in ${tookMs}ms`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        ...result,
        account_id: accountId,
        took_ms: tookMs,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    const tookMs = Date.now() - startTime;

    console.error("[GMB Process] Exception:", error);

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
