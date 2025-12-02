/**
 * GMB Sync Diagnostics API
 *
 * @security Uses createClient with RLS - no admin bypass needed
 */

import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // ✅ Use regular client - RLS filters by user_id automatically
    const { data: gmbAccount, error: gmbAccountError } = await supabase
      .from("gmb_accounts")
      .select("id, account_name, is_active, last_synced_at, last_error")
      .eq("user_id", user.id)
      .maybeSingle();

    if (gmbAccountError) {
      gmbLogger.error(
        "Error fetching user account for diagnostics",
        gmbAccountError instanceof Error
          ? gmbAccountError
          : new Error(String(gmbAccountError)),
        { userId: user.id },
      );
    }

    if (!gmbAccount) {
      return NextResponse.json({
        success: false,
        error:
          "No GMB account found. Please connect your Google Business Profile.",
      });
    }

    // Get sync queue status
    const { data: queueItems } = await supabase
      .from("sync_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    const queueStats = {
      total: queueItems?.length || 0,
      pending: queueItems?.filter((q) => q.status === "pending").length || 0,
      processing:
        queueItems?.filter((q) => q.status === "processing").length || 0,
      completed:
        queueItems?.filter((q) => q.status === "completed").length || 0,
      failed: queueItems?.filter((q) => q.status === "failed").length || 0,
      lastSync: queueItems?.[0]
        ? {
            id: queueItems[0].id,
            status: queueItems[0].status,
            created_at: queueItems[0].created_at,
            error_message: queueItems[0].error_message,
          }
        : undefined,
    };

    // Get sync logs
    const { data: syncLogs } = await supabase
      .from("gmb_sync_logs")
      .select("phase, status, created_at, counts, error")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get data counts
    const [
      { count: locationsCount },
      { count: reviewsCount },
      { count: mediaCount },
      { count: questionsCount },
      { count: performanceCount },
      { count: keywordsCount },
    ] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_media")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_performance")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_keywords")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        syncQueue: queueStats,
        syncLogs: {
          total: syncLogs?.length || 0,
          phases: syncLogs || [],
        },
        dataCounts: {
          locations: locationsCount || 0,
          reviews: reviewsCount || 0,
          media: mediaCount || 0,
          questions: questionsCount || 0,
          performance: performanceCount || 0,
          keywords: keywordsCount || 0,
        },
        gmbAccount: {
          id: gmbAccount.id,
          account_name: gmbAccount.account_name,
          is_active: gmbAccount.is_active,
          last_sync: gmbAccount.last_synced_at,
          last_error: gmbAccount.last_error,
        },
      },
    });
  } catch (error) {
    gmbLogger.error(
      "GMB Diagnostics API error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
