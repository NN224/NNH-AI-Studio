import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * ============================================================================
 * GMB Sync Edge Function
 * ============================================================================
 *
 * PURPOSE:
 * Syncs GMB data for a single account by calling the Next.js API.
 * This Edge Function acts as a bridge between the queue system and the
 * Next.js backend which has token refresh logic built-in.
 *
 * AUTHENTICATION:
 * - Internal calls: Requires X-Internal-Run header with TRIGGER_SECRET
 * - External calls: Requires Authorization header with valid JWT
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - TRIGGER_SECRET: Secret for internal authentication
 * - NEXT_PUBLIC_APP_URL: Next.js application URL
 *
 * ============================================================================
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://www.nnh.ae",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Run",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'"
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: corsHeaders }
    );
  }

  const startTime = Date.now();

  try {
    // Check authentication
    const TRIGGER = Deno.env.get("TRIGGER_SECRET");
    const isInternal = TRIGGER && (req.headers.get("X-Internal-Run") || "") === TRIGGER;
    const hasAuth = req.headers.get("Authorization");

    if (!isInternal && !hasAuth) {
      console.error("[GMB Sync] Unauthorized: Missing authentication");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unauthorized",
          message: "Missing authentication"
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    let accountId: string | undefined;
    let syncType: "full" | "incremental" = "incremental";

    try {
      const body = await req.json();
      accountId = body.accountId || body.account_id;
      syncType = body.syncType || body.sync_type || "incremental";
    } catch (error) {
      console.error("[GMB Sync] Invalid JSON:", error);
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_request",
          message: "Invalid JSON payload"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!accountId) {
      console.error("[GMB Sync] Missing accountId");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "invalid_request",
          message: "accountId is required"
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`[GMB Sync] Starting sync for account ${accountId} (${syncType})`);

    // Get Next.js app URL
    const APP_URL = Deno.env.get("NEXT_PUBLIC_APP_URL") ||
                     Deno.env.get("APP_URL") ||
                     "https://nnh.ae";

    // Call Next.js API endpoint (which has token refresh logic)
    const apiUrl = `${APP_URL}/api/gmb/sync-v2`;

    console.log(`[GMB Sync] Calling ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward authentication header if not internal
        ...(isInternal ? {} : { "Authorization": req.headers.get("Authorization")! })
      },
      body: JSON.stringify({
        accountId,
        includeQuestions: syncType === "full"
      })
    });

    const tookMs = Date.now() - startTime;

    if (!response.ok) {
      let errorText = "Unknown error";
      let errorJson: any = null;

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

      console.error(`[GMB Sync] API error (${response.status}):`, errorText);

      // Check for specific error types
      const errorType = errorJson?.error || "api_error";

      if (response.status === 401 || errorType.includes("token") || errorType.includes("auth")) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "account_not_found",
            message: errorText,
            mode: "internal",
            accountId,
            syncType,
            took_ms: tookMs
          }),
          { status: response.status, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          ok: false,
          error: "locations_api_error",
          message: errorText,
          mode: "internal",
          accountId,
          syncType,
          took_ms: tookMs
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    // Success
    const result = await response.json();

    console.log(`[GMB Sync] Success for account ${accountId} in ${tookMs}ms`);

    return new Response(
      JSON.stringify({
        ok: true,
        ...result,
        mode: "internal",
        accountId,
        syncType,
        took_ms: tookMs
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: unknown) {
    const tookMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    console.error("[GMB Sync] Exception:", error);

    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_error",
        message: errorMessage,
        took_ms: tookMs
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
