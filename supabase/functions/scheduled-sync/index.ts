/**
 * ============================================================================
 * Scheduled Sync Edge Function (PRODUCTION VERSION)
 * ============================================================================
 *
 * PURPOSE:
 * Called by pg_cron to batch-enqueue sync jobs for all active accounts.
 * Does NOT make HTTP calls - directly inserts into PGMQ queue.
 *
 * FLOW:
 * 1. Verify cron secret
 * 2. Fetch all active GMB accounts from database
 * 3. Batch-insert sync jobs into PGMQ queue
 * 4. Return summary
 *
 * ============================================================================
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // ---------------------------------------------------------------------
    // VERIFY CRON SECRET
    // ---------------------------------------------------------------------
    const cronSecret =
      Deno.env.get("TRIGGER_SECRET") || Deno.env.get("CRON_SECRET");

    const authHeader = req.headers.get("authorization");

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[Scheduled Sync] Unauthorized request");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log("[Scheduled Sync] Cron job triggered");

    // ---------------------------------------------------------------------
    // INITIALIZE SUPABASE CLIENT
    // ---------------------------------------------------------------------
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[Scheduled Sync] Missing Supabase credentials");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ---------------------------------------------------------------------
    // FETCH ACTIVE GMB ACCOUNTS
    // ---------------------------------------------------------------------
    const { data: accounts, error: fetchError } = await supabase
      .from("gmb_accounts")
      .select("id, user_id, account_id, account_name")
      .eq("is_active", true);

    if (fetchError) {
      console.error("[Scheduled Sync] Failed to fetch accounts:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Database error",
          details: fetchError.message,
        }),
        {
          status: 500,
          headers: corsHeaders,
        },
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log("[Scheduled Sync] No active accounts found");
      return new Response(
        JSON.stringify({
          ok: true,
          message: "No active accounts to sync",
          accounts_processed: 0,
          took_ms: Date.now() - startTime,
        }),
        {
          headers: corsHeaders,
          status: 200,
        },
      );
    }

    console.log(`[Scheduled Sync] Found ${accounts.length} active accounts`);

    // ---------------------------------------------------------------------
    // BATCH-ENQUEUE JOBS TO PGMQ
    // ---------------------------------------------------------------------
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const account of accounts) {
      try {
        const { error: enqueueError } = await supabase.rpc("enqueue_sync_job", {
          p_account_id: account.id,
          p_user_id: account.user_id,
          p_sync_type: "incremental",
          p_priority: 0,
        });

        if (enqueueError) {
          console.error(
            `[Scheduled Sync] Failed to enqueue ${account.account_id}:`,
            enqueueError,
          );
          failureCount++;
          errors.push(
            `${account.account_name || account.account_id}: ${enqueueError.message}`,
          );
        } else {
          successCount++;
        }
      } catch (error) {
        console.error(
          `[Scheduled Sync] Exception for ${account.account_id}:`,
          error,
        );
        failureCount++;
        errors.push(
          `${account.account_name || account.account_id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    const tookMs = Date.now() - startTime;

    console.log(
      `[Scheduled Sync] Completed: ${successCount} succeeded, ${failureCount} failed in ${tookMs}ms`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Scheduled sync completed",
        accounts_total: accounts.length,
        accounts_succeeded: successCount,
        accounts_failed: failureCount,
        errors: errors.length > 0 ? errors : undefined,
        took_ms: tookMs,
      }),
      {
        headers: corsHeaders,
        status: 200,
      },
    );
  } catch (error) {
    console.error("[Scheduled Sync] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
