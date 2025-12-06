import { withCronAuth } from "@/lib/security/cron-auth";
import { createAdminClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

/**
 * Cron job to cleanup old sync_queue records
 * Run this daily via Vercel Cron or similar service
 *
 * @security Uses withCronAuth wrapper - FAILS CLOSED if CRON_SECRET not set
 */
async function handleCleanupSyncQueue(_request: Request): Promise<Response> {
  const adminClient = createAdminClient();

  try {
    // Call the cleanup function from database
    const { data, error } = await adminClient.rpc("cleanup_sync_queue");

    if (error) {
      apiLogger.error(
        "Error calling cleanup_sync_queue function",
        error instanceof Error ? error : new Error(String(error)),
      );
      return NextResponse.json(
        { error: "Failed to cleanup sync_queue" },
        { status: 500 },
      );
    }

    const deletedCount = data?.[0]?.deleted_count || 0;

    apiLogger.info("Sync queue cleanup completed", {
      deletedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${deletedCount} records deleted.`,
      deletedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    apiLogger.error(
      "Error in sync queue cleanup cron job",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Export with cron authentication wrapper
export const GET = withCronAuth(handleCleanupSyncQueue);
