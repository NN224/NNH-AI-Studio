import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Internal-Run",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
    // 1. Verify Secret
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET");
    const providedSecret = req.headers.get("X-Internal-Run");

    if (!TRIGGER_SECRET || providedSecret !== TRIGGER_SECRET) {
      return new Response(
        JSON.stringify({ ok: false, error: "unauthorized" }),
        { status: 401, headers: corsHeaders },
      );
    }

    // 2. Parse Body
    const body = await req.json();
    const accountId = body.accountId || body.account_id;
    const userId = body.userId || body.user_id;
    const syncType = body.syncType || body.sync_type || "full";

    if (!accountId || !userId) {
      return new Response(
        JSON.stringify({ ok: false, error: "missing_params" }),
        { status: 400, headers: corsHeaders },
      );
    }

    // 3. Call Next.js API
    const APP_URL =
      Deno.env.get("NEXT_PUBLIC_APP_URL") || Deno.env.get("APP_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!APP_URL) throw new Error("APP_URL is not set");

    console.log(`[GMB Process] Forwarding to ${APP_URL}/api/gmb/sync-v2`);

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
        includePosts: true,
        includeMedia: true,
        includeInsights: true,
        isInternalCall: true,
      }),
    });

    // Handle Response
    if (!response.ok) {
      let errorText = await response.text().catch(() => "Unknown error");
      try {
        const json = JSON.parse(errorText);
        errorText = json.error || json.message || errorText;
      } catch {
        // Ignore JSON parse errors for error text
      }

      console.error(
        `[GMB Process] API Error (${response.status}): ${errorText}`,
      );
      return new Response(
        JSON.stringify({ ok: false, error: "sync_failed", message: errorText }),
        { status: response.status, headers: corsHeaders },
      );
    }

    const result = await response.json();
    return new Response(
      JSON.stringify({ ok: true, ...result, took_ms: Date.now() - startTime }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error: any) {
    console.error("[GMB Process] Exception:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        error: "internal_error",
        message: error.message,
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
