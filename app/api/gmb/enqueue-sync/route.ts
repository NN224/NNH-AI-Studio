import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Enqueue Sync API Endpoint
 *
 * This endpoint adds a sync job to the sync_queue table.
 * The gmb-sync-worker will pick it up and process it asynchronously.
 *
 * POST /api/gmb/enqueue-sync
 * Body: { accountId: string, syncType?: 'full' | 'incremental', priority?: number }
 *
 * This is the modern approach for reliable background syncing.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized - Authentication required" },
        { status: 401 },
      );
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const {
      accountId,
      syncType = "full",
      priority = 0,
      scheduled_at = null,
    } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 },
      );
    }

    // Validate syncType
    if (!["full", "incremental"].includes(syncType)) {
      return NextResponse.json(
        { error: 'syncType must be "full" or "incremental"' },
        { status: 400 },
      );
    }

    // Verify the account exists and belongs to the user
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_name, user_id")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      console.error("[Enqueue Sync] Account not found:", accountError);
      return NextResponse.json(
        { error: "Account not found or access denied" },
        { status: 404 },
      );
    }

    // Check if there's already a pending job for this account
    const { data: existingJob, error: checkError } = await supabase
      .from("sync_queue")
      .select("id, status, created_at")
      .eq("account_id", accountId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkError) {
      console.error("[Enqueue Sync] Error checking existing jobs:", checkError);
      // Continue anyway - not critical
    }

    if (existingJob) {
      console.log(
        `[Enqueue Sync] Job already exists for account ${accountId}:`,
        existingJob.id,
      );
      return NextResponse.json({
        message: "Sync job already queued for this account",
        job_id: existingJob.id,
        status: existingJob.status,
        created_at: existingJob.created_at,
        duplicate: true,
      });
    }

    // Insert sync job into queue
    const { data: job, error: insertError } = await supabase
      .from("sync_queue")
      .insert({
        user_id: user.id,
        account_id: accountId,
        sync_type: syncType,
        status: "pending",
        priority: priority,
        attempts: 0,
        max_attempts: 3,
        scheduled_at: scheduled_at,
        metadata: {
          account_name: account.account_name,
          enqueued_via: "api",
          enqueued_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Enqueue Sync] Failed to enqueue job:", insertError);
      return NextResponse.json(
        {
          error: "Failed to enqueue sync job",
          details: insertError.message,
        },
        { status: 500 },
      );
    }

    console.log(
      `[Enqueue Sync] ✅ Enqueued ${syncType} sync for account ${account.account_name} (${accountId})`,
    );

    return NextResponse.json(
      {
        message: "Sync job enqueued successfully",
        job: {
          id: job.id,
          account_id: job.account_id,
          account_name: account.account_name,
          sync_type: job.sync_type,
          status: job.status,
          priority: job.priority,
          created_at: job.created_at,
        },
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("[Enqueue Sync] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 },
    );
  }
}

/**
 * GET endpoint to check queue status for current user
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get queue stats for this user
    const { data: jobs, error: queueError } = await supabase
      .from("sync_queue")
      .select(
        "id, account_id, sync_type, status, attempts, max_attempts, created_at, scheduled_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (queueError) {
      console.error("[Enqueue Sync] Error fetching queue:", queueError);
      return NextResponse.json(
        { error: "Failed to fetch queue", details: queueError.message },
        { status: 500 },
      );
    }

    const stats = {
      total: jobs?.length || 0,
      pending: jobs?.filter((j) => j.status === "pending").length || 0,
      processing: jobs?.filter((j) => j.status === "processing").length || 0,
      succeeded: jobs?.filter((j) => j.status === "succeeded").length || 0,
      failed: jobs?.filter((j) => j.status === "failed").length || 0,
    };

    return NextResponse.json({
      stats,
      jobs: jobs || [],
    });
  } catch (error: any) {
    console.error("[Enqueue Sync] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 },
    );
  }
}
