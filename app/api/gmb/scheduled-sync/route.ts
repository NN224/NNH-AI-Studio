import { withCronAuth } from "@/lib/security/cron-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * Scheduled Sync API Endpoint
 * This endpoint is called by cron jobs to automatically sync GMB data
 * for accounts that have auto-sync enabled in their settings.
 *
 * @security Uses withCronAuth wrapper - FAILS CLOSED if CRON_SECRET not set
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
      .select("id, user_id, account_name, settings, last_sync, is_active")
      .eq("is_active", true);

    if (accountsError) {
      console.error("[Scheduled Sync] Error fetching accounts:", accountsError);
      return NextResponse.json(
        { error: "Failed to fetch accounts", details: accountsError.message },
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
          console.error(
            `[Scheduled Sync] Failed to enqueue ${account.account_name}:`,
            enqueueError,
          );
          syncResults.push({
            accountId,
            accountName: account.account_name,
            status: "error",
            error: enqueueError.message,
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
        console.error("[Scheduled Sync] Enqueue error:", err.message);
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
        console.error(
          "[Scheduled Sync] OAuth cleanup failed:",
          cleanupError.message,
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
    console.error("[Scheduled Sync] Error:", err.message);
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
    console.error("[Scheduled Sync] POST error:", err.message);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 },
    );
  }
}
