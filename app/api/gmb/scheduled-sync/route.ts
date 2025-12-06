import { withCronAuth } from "@/lib/security/cron-auth";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

/**
 * Scheduled Sync API Endpoint
 * This endpoint is called by cron jobs to automatically sync GMB data
 * for accounts that have auto-sync enabled in their settings.
 *
 * @security Uses withCronAuth wrapper - FAILS CLOSED if CRON_SECRET not set
 * 
 * ✅ Timeout Configuration:
 * - Vercel Pro plan max: 60 seconds
 * - Using 60s to allow sufficient time for enqueuing multiple accounts
 * - Actual sync happens in Edge Functions (10 minute timeout)
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // ✅ Vercel Pro plan maximum

async function handleScheduledSync(_request: Request): Promise<Response> {
  try {
    const supabase = await createClient();

    // Get current time to determine which schedules to run
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const isMidnight = hour === 0;
    const isNineAM = hour === 9;
    const isSixPM = hour === 18;
    const isMonday = dayOfWeek === 1;

    // Fetch all active accounts with their sync schedules
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, user_id, account_name, settings, is_active, last_sync")
      .eq("is_active", true);

    if (accountsError) {
      const errorMessage =
        accountsError.message || JSON.stringify(accountsError);
      gmbLogger.error(
        "Error fetching accounts for scheduled sync",
        new Error(errorMessage),
      );
      return NextResponse.json(
        { error: "Failed to fetch accounts", details: errorMessage },
        { status: 500 },
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({
        message: "No active accounts to sync",
        synced: 0,
      });
    }

    const accountsToSync: string[] = [];

    // Filter accounts based on their sync schedule and current time
    for (const account of accounts) {
      const settings = account.settings || {};
      const syncSchedule = settings.syncSchedule || "manual";

      if (syncSchedule === "manual") {
        continue; // Skip manual sync accounts
      }

      // Check if this account should be synced now
      let shouldSync = false;

      switch (syncSchedule) {
        case "hourly":
          // Sync every hour (always sync)
          shouldSync = true;
          break;

        case "daily":
          // Sync once per day at midnight UTC
          shouldSync = isMidnight;
          break;

        case "twice-daily":
          // Sync at 9 AM and 6 PM UTC
          shouldSync = isNineAM || isSixPM;
          break;

        case "weekly":
          // Sync once per week on Monday at midnight UTC
          shouldSync = isMonday && isMidnight;
          break;

        default:
          shouldSync = false;
      }

      if (shouldSync) {
        // Check if we already synced recently (within last 30 minutes for hourly, to prevent duplicate syncs)
        if (syncSchedule === "hourly" && account.last_sync) {
          const lastSyncTime = new Date(account.last_sync);
          const minutesSinceLastSync =
            (now.getTime() - lastSyncTime.getTime()) / 1000 / 60;
          if (minutesSinceLastSync < 30) {
            continue; // Skip - synced recently
          }
        }

        accountsToSync.push(account.id);
      }
    }

    if (accountsToSync.length === 0) {
      return NextResponse.json({
        message: "No accounts need syncing at this time",
        synced: 0,
        schedule: {
          hour,
          dayOfWeek,
          isMidnight,
          isNineAM,
          isSixPM,
          isMonday,
        },
      });
    }

    // ✅ MODERNIZED: Use queue-based sync instead of direct HTTP calls
    // This is more reliable and consistent with the rest of the application
    const syncResults = [];
    for (const accountId of accountsToSync) {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) continue;

      try {
        // Check if there's already a pending job for this account
        const { data: existingJob } = await supabase
          .from("sync_queue")
          .select("id, status")
          .eq("account_id", accountId)
          .in("status", ["pending", "processing"])
          .maybeSingle();

        if (existingJob) {
          syncResults.push({
            accountId,
            accountName: account.account_name,
            status: "skipped",
            reason: "Already queued",
            jobId: existingJob.id,
          });
          continue;
        }

        // Enqueue sync job directly to sync_queue
        const { data: job, error: enqueueError } = await supabase
          .from("sync_queue")
          .insert({
            user_id: account.user_id,
            account_id: accountId,
            sync_type: "full",
            priority: 5, // Medium priority for scheduled syncs
            status: "pending",
            scheduled_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (enqueueError) {
          const enqueueErrorMsg =
            enqueueError.message || JSON.stringify(enqueueError);
          gmbLogger.error(
            "Failed to enqueue scheduled sync job",
            new Error(enqueueErrorMsg),
            {
              accountId,
              accountName: account.account_name,
              userId: account.user_id,
            },
          );
          syncResults.push({
            accountId,
            accountName: account.account_name,
            status: "error",
            error: enqueueErrorMsg,
          });
          continue;
        }

        syncResults.push({
          accountId,
          accountName: account.account_name,
          status: "enqueued",
          jobId: job.id,
        });
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        gmbLogger.error("Enqueue error during scheduled sync", err, {
          accountId,
          accountName: account.account_name || "Unknown",
          userId: account.user_id,
        });
        syncResults.push({
          accountId,
          accountName: account.account_name || "Unknown",
          status: "error",
          error: err.message,
        });
      }
    }

    // ✅ CLEANUP: Remove expired OAuth states (prevent table growth)
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { error: cleanupError } = await supabase
        .from("oauth_states")
        .delete()
        .lt("expires_at", oneHourAgo);

      if (cleanupError) {
        gmbLogger.error(
          "OAuth cleanup failed during scheduled sync",
          cleanupError instanceof Error
            ? cleanupError
            : new Error(String(cleanupError)),
        );
      }
    } catch {
      // OAuth cleanup is non-critical, ignore errors
    }

    return NextResponse.json({
      message: `Scheduled sync process completed`,
      enqueued: syncResults.filter((r) => r.status === "enqueued").length,
      skipped: syncResults.filter((r) => r.status === "skipped").length,
      errors: syncResults.filter((r) => r.status === "error").length,
      results: syncResults,
      schedule: {
        hour,
        dayOfWeek,
        isMidnight,
        isNineAM,
        isSixPM,
        isMonday,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("Scheduled sync handler error", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}

// Export GET with cron authentication wrapper
export const GET = withCronAuth(handleScheduledSync);

/**
 * POST endpoint for manual trigger (for testing)
 * Uses user authentication instead of cron secret
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId is required" },
        { status: 400 },
      );
    }

    // Verify the account belongs to the user
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id, user_id, settings")
      .eq("id", accountId)
      .eq("user_id", user.id)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Trigger sync by calling the sync-v2 API with internal auth
    const syncUrl = new URL("/api/gmb/sync-v2", request.url);

    const syncResponse = await fetch(syncUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Run": process.env.INTERNAL_API_SECRET || "scheduled-sync",
      },
      body: JSON.stringify({
        accountId,
        userId: user.id,
        syncType: "full",
      }),
    });

    const payload = await syncResponse.json().catch(() => ({}));

    if (!syncResponse.ok) {
      return NextResponse.json(
        {
          error: payload?.error || "Failed to trigger sync",
          message: payload?.message,
          status: syncResponse.status,
        },
        { status: syncResponse.status },
      );
    }

    return NextResponse.json({
      message: "Sync triggered successfully",
      accountId,
      result: payload,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    gmbLogger.error("Scheduled sync POST error", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
