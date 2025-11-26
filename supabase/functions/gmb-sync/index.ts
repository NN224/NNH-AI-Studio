import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * ============================================================================
 * GMB Sync Edge Function (FINAL VERSION)
 * ============================================================================
 *
 * PURPOSE:
 * Syncs GMB data for a single account by calling the Next.js API.
 *
 * INTERNAL CALLS (from worker):
 *   - Must include:  X-Internal-Run: <TRIGGER_SECRET>
 *   - No user JWT required
 *
 * EXTERNAL CALLS (from browser / dashboard):
 *   - Must include: Authorization: Bearer <JWT>
 *
 * This function proxies all sync operations to:
 *   NEXT_PUBLIC_APP_URL/api/gmb/sync-v2
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
    // INTERNAL AUTH
    // ---------------------------------------------------------------------
    const TRIGGER = Deno.env.get("TRIGGER_SECRET");
    const providedSecret =
      req.headers.get("X-Internal-Run") ||
      req.headers.get("X-Trigger-Secret") ||
      req.headers.get("X-Internal-Worker") ||
      "";

    const isInternal = TRIGGER && providedSecret === TRIGGER;

    const hasUserAuth = req.headers.get("Authorization");

    if (!isInternal && !hasUserAuth) {
      console.error("[GMB Sync] Unauthorized: Missing authentication");
      return new Response(
        JSON.stringify({
          ok: false,
          error: "unauthorized",
          message: "Missing authentication",
        }),
        { status: 401, headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // Parse request body
    // ---------------------------------------------------------------------
    let accountId;
    let syncType = "incremental";

    try {
      const body = await req.json();
      accountId = body.accountId || body.account_id;
      syncType = body.syncType || body.sync_type || "incremental";
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
      `[GMB Sync] Starting sync for account ${accountId} (${syncType})`,
    );

    // ---------------------------------------------------------------------
    // CALL NEXT.JS APP (sync-v2)
    // ---------------------------------------------------------------------
    const APP_URL =
      Deno.env.get("NEXT_PUBLIC_APP_URL") ||
      Deno.env.get("APP_URL") ||
      "https://nnh.ae";

    const apiUrl = `${APP_URL}/api/gmb/sync-v2`;
    console.log(`[GMB Sync] Calling ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isInternal
          ? { "X-Internal-Run": TRIGGER }
          : { Authorization: hasUserAuth }),
      },
      body: JSON.stringify({
        accountId,
        includeQuestions: syncType === "full",
      }),
    });

    const tookMs = Date.now() - startTime;

    // ---------------------------------------------------------------------
    // Handle errors from Next.js
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

      const errorType = errorJson?.error || "api_error";

      console.error(`[GMB Sync] API error (${response.status}):`, errorText);

      // auth / token issues
      if (
        response.status === 401 ||
        errorType.includes("token") ||
        errorType.includes("auth")
      ) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "account_not_found",
            message: errorText,
            mode: "internal",
            accountId,
            syncType,
            took_ms: tookMs,
          }),
          { status: response.status, headers: corsHeaders },
        );
      }

      // Google locations / API errors
      return new Response(
        JSON.stringify({
          ok: false,
          error: "locations_api_error",
          message: errorText,
          mode: "internal",
          accountId,
          syncType,
          took_ms: tookMs,
        }),
        { status: response.status, headers: corsHeaders },
      );
    }

    // ---------------------------------------------------------------------
    // Success
    // ---------------------------------------------------------------------
    const result = await response.json();

    console.log(`[GMB Sync] Success for account ${accountId} in ${tookMs}ms`);

    return new Response(
      JSON.stringify({
        ok: true,
        ...result,
        mode: "internal",
        accountId,
        syncType,
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
