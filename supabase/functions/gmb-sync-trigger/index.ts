import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

/**
 * ============================================================================
 * GMB Sync Trigger (Dispatcher)
 * ============================================================================
 *
 * PURPOSE:
 * This Edge Function is the dispatcher for GMB sync jobs. It:
 * - Lists active GMB accounts from the database
 * - Enqueues sync jobs in the sync_queue table
 * - Avoids creating duplicate jobs for accounts already pending/running
 * - Returns quickly (does NOT process jobs itself)
 *
 * ARCHITECTURE:
 * - Called by: Cron scheduler (daily) OR Postgres function trigger_gmb_sync
 * - Security: Requires X-Trigger-Secret header matching TRIGGER_SECRET env var
 * - Output: Enqueues jobs in sync_queue for gmb-sync-worker to process
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 * - SUPABASE_URL: Your Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key (admin access)
 * - TRIGGER_SECRET: Secret for authenticating trigger calls
 *
 * CRON SCHEDULE (recommended):
 * - Daily at 2am: 0 2 * * *
 * - Or call via trigger_gmb_sync Postgres function
 *
 * المنطق (Logic in Arabic for developer):
 * هذه الدالة مسؤولة فقط عن إضافة المهام للطابور، وليست مسؤولة عن تنفيذها.
 * Worker منفصل (gmb-sync-worker) هو المسؤول عن معالجة المهام.
 * ============================================================================
 */

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "https://www.nnh.ae",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Trigger-Secret",
  "Access-Control-Max-Age": "86400",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'"
};

// ============================================================================
// Types
// ============================================================================

interface TriggerRequest {
  sync_type?: 'full' | 'incremental';
  limit?: number;
  cursor?: string; // For pagination
  priority?: number; // 1-10, lower = higher priority
  dry_run?: boolean;
}

interface EnqueueResult {
  account_id: string;
  enqueued: boolean;
  reason?: string; // Why it wasn't enqueued (e.g., "already_pending")
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAdminClient(): SupabaseClient {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Enqueue sync jobs for active accounts
 * Avoids duplicates by checking for existing pending/running jobs
 */
async function enqueueJobsForActiveAccounts(
  admin: SupabaseClient,
  options: {
    sync_type: 'full' | 'incremental';
    limit: number;
    cursor: string | null;
    priority: number;
    dry_run: boolean;
  }
): Promise<{
  results: EnqueueResult[];
  next_cursor: string | null;
  total_enqueued: number;
}> {
  const { sync_type, limit, cursor, priority, dry_run } = options;

  // Fetch active accounts
  let query = admin
    .from("gmb_accounts")
    .select("id, user_id, email")
    .eq("is_active", true)
    .order("id", { ascending: true })
    .limit(limit);

  if (cursor) {
    query = query.gt("id", cursor);
  }

  const { data: accounts, error: fetchError } = await query;

  if (fetchError) {
    throw new Error(`Failed to fetch accounts: ${fetchError.message}`);
  }

  if (!accounts || accounts.length === 0) {
    return {
      results: [],
      next_cursor: null,
      total_enqueued: 0
    };
  }

  const results: EnqueueResult[] = [];
  let enqueued_count = 0;

  // Process each account
  for (const account of accounts) {
    try {
      if (dry_run) {
        results.push({
          account_id: account.id,
          enqueued: true,
          reason: 'dry_run'
        });
        continue;
      }

      // Check for existing pending/running jobs for this account + sync_type
      const { data: existing, error: checkError } = await admin
        .from("sync_queue")
        .select("id, status")
        .eq("account_id", account.id)
        .eq("sync_type", sync_type)
        .in("status", ["pending", "running"])
        .limit(1)
        .maybeSingle();

      if (checkError) {
        console.error(`Error checking existing jobs for ${account.id}:`, checkError);
        results.push({
          account_id: account.id,
          enqueued: false,
          reason: `check_error: ${checkError.message}`
        });
        continue;
      }

      if (existing) {
        results.push({
          account_id: account.id,
          enqueued: false,
          reason: `already_${existing.status}`
        });
        continue;
      }

      // Insert new job
      const { error: insertError } = await admin
        .from("sync_queue")
        .insert({
          account_id: account.id,
          sync_type,
          priority,
          status: 'pending',
          scheduled_at: new Date().toISOString(),
          created_by: 'dispatcher'
        });

      if (insertError) {
        console.error(`Error inserting job for ${account.id}:`, insertError);
        results.push({
          account_id: account.id,
          enqueued: false,
          reason: `insert_error: ${insertError.message}`
        });
        continue;
      }

      enqueued_count++;
      results.push({
        account_id: account.id,
        enqueued: true
      });

    } catch (err: any) {
      console.error(`Unexpected error for ${account.id}:`, err);
      results.push({
        account_id: account.id,
        enqueued: false,
        reason: `exception: ${err.message}`
      });
    }
  }

  const next_cursor = accounts.length === limit ? accounts[accounts.length - 1].id : null;

  return {
    results,
    next_cursor,
    total_enqueued: enqueued_count
  };
}

// ============================================================================
// Main Handler
// ============================================================================

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

  try {
    // Verify trigger secret
    const TRIGGER_SECRET = Deno.env.get("TRIGGER_SECRET") || "replace-me-now";
    const provided = req.headers.get("X-Trigger-Secret");

    if (!provided || provided !== TRIGGER_SECRET) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Parse request body
    let body: TriggerRequest = {};
    try {
      body = await req.json();
    } catch {
      // Empty body is OK, use defaults
    }

    const sync_type = body.sync_type || 'incremental';
    const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 500);
    const cursor = body.cursor ?? null;
    const priority = Math.min(Math.max(Number(body.priority ?? 5), 1), 10);
    const dry_run = Boolean(body.dry_run ?? false);

    // Get admin client
    const admin = getAdminClient();

    // Enqueue jobs
    const result = await enqueueJobsForActiveAccounts(admin, {
      sync_type,
      limit,
      cursor,
      priority,
      dry_run
    });

    console.log(`✅ Enqueued ${result.total_enqueued} jobs (type: ${sync_type})`);

    return new Response(
      JSON.stringify({
        success: true,
        enqueued: result.total_enqueued,
        total_accounts: result.results.length,
        next_cursor: result.next_cursor,
        results: result.results
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error: any) {
    console.error("❌ Dispatcher error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
