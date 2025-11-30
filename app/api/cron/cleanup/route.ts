import { withCronAuth } from "@/lib/security/cron-auth";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Cron job to cleanup archived data based on retention policy
 * Run this daily via Vercel Cron or similar service
 *
 * @security Uses withCronAuth wrapper - FAILS CLOSED if CRON_SECRET not set
 */
async function handleCleanup(_request: Request): Promise<Response> {
  const supabase = await createClient();

  try {
    // Get all accounts with data retention policies
    const { data: accounts, error: accountsError } = await supabase
      .from("gmb_accounts")
      .select("id, data_retention_days, disconnected_at")
      .not("disconnected_at", "is", null);

    if (accountsError) {
      console.error("Error fetching accounts:", accountsError);
      return NextResponse.json(
        { error: "Failed to fetch accounts" },
        { status: 500 },
      );
    }

    let totalDeleted = 0;

    for (const account of accounts || []) {
      if (!account.data_retention_days || !account.disconnected_at) continue;

      // Calculate deletion date
      const disconnectedDate = new Date(account.disconnected_at);
      const retentionDays = account.data_retention_days;
      const deletionDate = new Date(disconnectedDate);
      deletionDate.setDate(deletionDate.getDate() + retentionDays);

      // Only delete if past retention period
      if (new Date() < deletionDate) continue;

      console.warn(
        `[Cleanup] Cleaning up data for account ${account.id} (retention period expired)`,
      );

      // Get location IDs first
      const { data: locationData } = await supabase
        .from("gmb_locations")
        .select("id")
        .eq("gmb_account_id", account.id);

      const locationIdList = locationData?.map((l) => l.id) || [];

      // Delete archived reviews
      const { count: reviewsDeleted } =
        locationIdList.length > 0
          ? await supabase
              .from("gmb_reviews")
              .delete({ count: "exact" })
              .eq("is_archived", true)
              .lt("archived_at", deletionDate.toISOString())
              .in("location_id", locationIdList)
          : { count: 0 };

      // Delete archived questions
      const { count: questionsDeleted } =
        locationIdList.length > 0
          ? await supabase
              .from("gmb_questions")
              .delete({ count: "exact" })
              .eq("is_archived", true)
              .lt("archived_at", deletionDate.toISOString())
              .in("location_id", locationIdList)
          : { count: 0 };

      // Delete archived posts
      const { count: postsDeleted } =
        locationIdList.length > 0
          ? await supabase
              .from("gmb_posts")
              .delete({ count: "exact" })
              .eq("is_archived", true)
              .lt("archived_at", deletionDate.toISOString())
              .in("location_id", locationIdList)
          : { count: 0 };

      // Delete archived locations (only if all associated data is gone)
      const { count: locationsDeleted } = await supabase
        .from("gmb_locations")
        .delete({ count: "exact" })
        .eq("is_archived", true)
        .eq("gmb_account_id", account.id)
        .lt("archived_at", deletionDate.toISOString());

      const accountTotal =
        (reviewsDeleted || 0) +
        (questionsDeleted || 0) +
        (postsDeleted || 0) +
        (locationsDeleted || 0);
      totalDeleted += accountTotal;

      console.warn(
        `[Cleanup] Deleted ${accountTotal} items for account ${account.id}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup completed. ${totalDeleted} items deleted.`,
      accountsProcessed: accounts?.length || 0,
      totalDeleted,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Cleanup failed";
    console.error("Error in cleanup cron job:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Export with cron authentication wrapper
export const GET = withCronAuth(handleCleanup);
