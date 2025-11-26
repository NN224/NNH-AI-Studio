// GMB Sync Queue Worker using PGMQ
// Processes sync jobs from the queue in real-time

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-trigger-secret",
};

interface SyncJob {
  account_id: string;
  user_id: string;
  sync_type: string;
  priority: number;
  enqueued_at: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify trigger secret
    const providedSecret = req.headers.get("X-Trigger-Secret");
    if (!TRIGGER_SECRET || providedSecret !== TRIGGER_SECRET) {
      console.error("[Queue Worker] Unauthorized: Invalid trigger secret");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("[Queue Worker] Starting to process jobs...");

    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;
    const results: any[] = [];

    // Process up to 10 jobs per invocation
    for (let i = 0; i < 10; i++) {
      // Read message from queue (30 second visibility timeout) via public wrapper
      const { data: messages, error: readError } = await supabase.rpc(
        "pgmq_read",
        {
          p_qty: 1,
          p_vt: 30,
        },
      );

      if (readError) {
        console.error("[Queue Worker] Error reading from queue:", readError);
        break;
      }

      if (!messages || messages.length === 0) {
        console.log("[Queue Worker] No more messages in queue");
        break;
      }

      const message = messages[0];
      const msgId = message.msg_id;
      const job: SyncJob = message.message;

      console.log(`[Queue Worker] Processing job ${msgId}:`, job);
      processedCount++;

      try {
        // Call the gmb-sync Edge Function
        const syncResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/gmb-sync`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "X-Internal-Run": TRIGGER_SECRET,
            },
            body: JSON.stringify({
              accountId: job.account_id,
              includeQuestions: job.sync_type === "full",
              includePosts: false,
              includeMedia: false,
            }),
          },
        );

        const syncResult = await syncResponse.json();

        if (syncResponse.ok && syncResult.ok) {
          console.log(`[Queue Worker] ✅ Job ${msgId} succeeded`);
          successCount++;

          // Delete message from queue via public wrapper
          await supabase.rpc("pgmq_delete", {
            p_msg_id: msgId,
          });

          results.push({
            msg_id: msgId,
            account_id: job.account_id,
            success: true,
            result: syncResult,
          });
        } else {
          throw new Error(syncResult.error || "Sync failed");
        }
      } catch (error) {
        console.error(`[Queue Worker] ❌ Job ${msgId} failed:`, error);
        failedCount++;

        // Archive message (moves to archive, can be retried later) via public wrapper
        await supabase.rpc("pgmq_archive", {
          p_msg_id: msgId,
        });

        results.push({
          msg_id: msgId,
          account_id: job.account_id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Log worker run
    await supabase.from("sync_worker_runs").insert({
      status: "completed",
      jobs_picked: processedCount,
      jobs_succeeded: successCount,
      jobs_failed: failedCount,
      notes: `Processed ${processedCount} jobs from PGMQ queue`,
      metadata: { results },
    });

    console.log(
      `[Queue Worker] Completed: ${successCount}/${processedCount} succeeded`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        processed: processedCount,
        succeeded: successCount,
        failed: failedCount,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Queue Worker] Fatal error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
