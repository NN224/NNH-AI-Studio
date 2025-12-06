/**
 * Manual Sync Trigger
 * 
 * This endpoint manually triggers the sync worker to process pending jobs.
 * Use this when cron jobs are not running or for immediate sync.
 * 
 * POST /api/gmb/trigger-sync-now
 */

import { createAdminClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    gmbLogger.info("Manual sync trigger requested");

    const adminClient = createAdminClient();
    
    // Get current user
    const { data: { user } } = await adminClient.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Check for pending sync jobs for this user
    const { data: pendingJobs, error: jobsError } = await adminClient
      .from("sync_queue")
      .select("id, account_id, sync_type, attempts")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(5);

    if (jobsError) {
      gmbLogger.error("Failed to fetch pending jobs", jobsError);
      return NextResponse.json(
        { error: "Failed to fetch pending jobs" },
        { status: 500 }
      );
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      gmbLogger.info("No pending jobs found", { userId: user.id });
      return NextResponse.json({
        message: "No pending sync jobs found",
        jobsProcessed: 0,
      });
    }

    gmbLogger.info("Found pending jobs", {
      count: pendingJobs.length,
      userId: user.id,
    });

    // Trigger the sync worker Edge Function
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const TRIGGER_SECRET = process.env.TRIGGER_SECRET;

    if (!SUPABASE_URL || !TRIGGER_SECRET) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Call the worker function
    const workerUrl = `${SUPABASE_URL}/functions/v1/gmb-sync-worker`;
    
    const workerResponse = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "X-Trigger-Secret": TRIGGER_SECRET,
      },
      body: JSON.stringify({
        trigger: "manual",
        userId: user.id,
      }),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      gmbLogger.error("Worker function failed", new Error(errorText));
      
      return NextResponse.json(
        { 
          error: "Failed to trigger sync worker",
          details: errorText,
        },
        { status: 500 }
      );
    }

    const workerResult = await workerResponse.json();
    
    gmbLogger.info("Sync worker triggered successfully", {
      userId: user.id,
      jobsPicked: workerResult.jobs_picked,
      jobsSucceeded: workerResult.jobs_succeeded,
    });

    return NextResponse.json({
      success: true,
      message: "Sync triggered successfully",
      jobsFound: pendingJobs.length,
      workerResult,
    });

  } catch (error) {
    gmbLogger.error(
      "Error triggering manual sync",
      error instanceof Error ? error : new Error(String(error))
    );
    
    return NextResponse.json(
      { 
        error: "Failed to trigger sync",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
