import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/notifications/{id}/read
 * Mark a specific notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const notificationId = params.id;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notificationId)) {
      return NextResponse.json(
        { error: "Invalid notification ID format" },
        { status: 400 },
      );
    }

    // Update notification to mark as read
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", user.id) // Ensure user owns this notification
      .select()
      .single();

    if (error) {
      apiLogger.error(
        "[Notifications API] Error marking as read",
        error instanceof Error ? error : new Error(String(error)),
        { notificationId },
      );

      // Handle not found case
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Notification not found" },
          { status: 404 },
        );
      }

      return NextResponse.json(
        { error: "Failed to mark notification as read" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      notification: data,
      message: "Notification marked as read",
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
