import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/read-all
 * Mark all user notifications as read
 */
export async function PATCH(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 },
      );
    }

    // Update all unread notifications for this user
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("read", false)
      .select();

    if (error) {
      apiLogger.error(
        "[Notifications API] Error marking all as read",
        error instanceof Error ? error : new Error(String(error)),
        { userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to mark all notifications as read" },
        { status: 500 },
      );
    }

    const updatedCount = data?.length || 0;

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `${updatedCount} notification(s) marked as read`,
    });
  } catch (error) {
    apiLogger.error(
      "[Notifications API] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
