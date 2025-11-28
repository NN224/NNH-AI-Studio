import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Scheduled Sync API Endpoint
 * This endpoint is called by cron jobs to automatically sync GMB data
 * for accounts that have auto-sync enabled in their settings.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[Scheduled Sync] Starting scheduled sync process...");

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
      console.log("[Scheduled Sync] No active accounts found");
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
            console.log(
              `[Scheduled Sync] Skipping ${account.account_name} - synced ${minutesSinceLastSync.toFixed(0)} minutes ago`,
            );
            continue;
          }
        }

        accountsToSync.push(account.id);
      }
    }

    if (accountsToSync.length === 0) {
      console.log("[Scheduled Sync] No accounts need syncing at this time");
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

    console.log(
      `[Scheduled Sync] Found ${accountsToSync.length} account(s) to sync`,
    );

    // ✅ MODERNIZED: Use queue-based sync instead of direct HTTP calls
    // This is more reliable and consistent with the rest of the application
    const syncResults = [];
    for (const accountId of accountsToSync) {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) continue;

      try {
        console.log(
          `[Scheduled Sync] Enqueueing sync for ${account.account_name} (${accountId})`,
        );

        // Check if there's already a pending job for this account
        const { data: existingJob } = await supabase
          .from("sync_queue")
          .select("id, status")
          .eq("account_id", accountId)
          .in("status", ["pending", "processing"])
          .maybeSingle();

        if (existingJob) {
          console.log(
            `[Scheduled Sync] Job already queued for ${account.account_name}, skipping`,
          );
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

        console.log(
          `[Scheduled Sync] ✅ Enqueued job ${job.id} for ${account.account_name}`,
        );
        syncResults.push({
          accountId,
          accountName: account.account_name,
          status: "enqueued",
          jobId: job.id,
        });
      } catch (error: any) {
        console.error(
          `[Scheduled Sync] Error enqueueing account ${accountId}:`,
          error,
        );
        syncResults.push({
          accountId,
          accountName: account.account_name || "Unknown",
          status: "error",
          error: error.message,
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
        console.warn(
          "[Scheduled Sync] Failed to cleanup expired OAuth states:",
          cleanupError,
        );
      } else {
        console.log("[Scheduled Sync] ✅ Cleaned up expired OAuth states");
      }
    } catch (cleanupErr) {
      console.warn("[Scheduled Sync] OAuth cleanup error:", cleanupErr);
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
  } catch (error: any) {
    console.error("[Scheduled Sync] General error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST endpoint for manual trigger (for testing)
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

    // Trigger sync by calling the sync API as the current user
    const syncUrl = new URL("/api/gmb/sync", request.url);
    const cookieHeader = request.headers.get("cookie") ?? "";

    const syncResponse = await fetch(syncUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Forward authentication cookies so /api/gmb/sync sees the same user
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({
        accountId,
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
  } catch (error: any) {
    console.error("[Scheduled Sync POST] Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
