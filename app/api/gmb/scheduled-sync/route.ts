import { withCronAuth } from "@/lib/security/cron-auth";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleScheduledSync(_request: Request): Promise<Response> {
  try {
    const supabase = await createClient();

    // التوقيت الحالي
    const now = new Date();
    const hour = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();
    const isMidnight = hour === 0;
    const isNineAM = hour === 9;
    const isSixPM = hour === 18;
    const isMonday = dayOfWeek === 1;

    // جلب الحسابات النشطة
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, user_id, account_name, settings, is_active, last_sync")
      .eq("is_active", true);

    if (accountsError) {
      gmbLogger.error(
        "Error fetching accounts",
        new Error(accountsError.message),
      );
      return NextResponse.json(
        { error: accountsError.message },
        { status: 500 },
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: "No active accounts", synced: 0 });
    }

    const syncResults = [];

    // التحقق من كل حساب
    for (const account of accounts) {
      const settings = account.settings || {};
      const syncSchedule = settings.syncSchedule || "manual";

      if (syncSchedule === "manual") continue;

      let shouldSync = false;
      switch (syncSchedule) {
        case "hourly":
          shouldSync = true;
          break;
        case "daily":
          shouldSync = isMidnight;
          break;
        case "twice-daily":
          shouldSync = isNineAM || isSixPM;
          break;
        case "weekly":
          shouldSync = isMonday && isMidnight;
          break;
        default:
          shouldSync = false;
      }

      if (shouldSync) {
        // 1. تجنب التكرار السريع (إذا تمت المزامنة قبل أقل من 30 دقيقة)
        if (syncSchedule === "hourly" && account.last_sync) {
          const lastSyncTime = new Date(account.last_sync);
          const minutesSinceLast =
            (now.getTime() - lastSyncTime.getTime()) / 60000;
          if (minutesSinceLast < 30) continue;
        }

        try {
          // 2. التحقق من وجود عملية جارية حالياً (pending/processing)
          const { data: existingJob } = await supabase
            .from("sync_queue")
            .select("id")
            .eq("account_id", account.id)
            .in("status", ["pending", "processing"])
            .maybeSingle();

          if (existingJob) {
            syncResults.push({
              id: account.id,
              status: "skipped",
              reason: "Already queued",
            });
            continue;
          }

          // 🛡️ 3. الحماية الذكية (Circuit Breaker)
          const sixHoursAgo = new Date(
            Date.now() - 6 * 60 * 60 * 1000,
          ).toISOString();
          const { data: recentFailure } = await supabase
            .from("sync_queue")
            .select("id")
            .eq("account_id", account.id)
            .eq("status", "failed")
            .gt("updated_at", sixHoursAgo)
            .limit(1);

          if (recentFailure && recentFailure.length > 0) {
            syncResults.push({
              id: account.id,
              status: "skipped",
              reason: "Recent failure detected (Cooling down)",
            });
            continue;
          }

          // 4. إضافة المهمة للطابور مع metadata صحيحة
          const { error: enqueueError } = await supabase
            .from("sync_queue")
            .insert({
              user_id: account.user_id,
              account_id: account.id,
              sync_type: "full",
              priority: 5,
              status: "pending",
              scheduled_at: new Date().toISOString(),
              metadata: {
                job_type: "discovery_locations",
                userId: account.user_id,
                accountId: account.id,
              },
            });

          if (enqueueError) throw enqueueError;

          syncResults.push({ id: account.id, status: "enqueued" });
        } catch (err) {
          gmbLogger.error(
            "Sync enqueue failed",
            err instanceof Error ? err : new Error(String(err)),
          );
          syncResults.push({ id: account.id, status: "error" });
        }
      }
    }

    // تنظيف البيانات القديمة (OAuth States) - تم التصحيح هنا
    try {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      await supabase.from("oauth_states").delete().lt("expires_at", oneHourAgo);
    } catch (cleanupError) {
      // Ignore cleanup errors explicitly
    }

    return NextResponse.json({
      success: true,
      processed: syncResults.length,
      details: syncResults,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal Server Error", details: errorMessage },
      { status: 500 },
    );
  }
}

export const GET = withCronAuth(handleScheduledSync);

// Endpoint للمزامنة اليدوية (Deprecated)
export async function POST(_request: NextRequest) {
  return NextResponse.json({
    message:
      "Manual trigger via POST is deprecated. Use the UI to trigger sync safely.",
  });
}
