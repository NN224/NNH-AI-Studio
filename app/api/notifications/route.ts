import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * GET /api/notifications
 * Returns user notifications
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          retry_after: rateLimitHeaders["X-RateLimit-Reset"],
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit,
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10));

    // Get notifications from notifications table
    let notifications: Array<{
      id: string;
      type: string;
      title: string;
      message: string;
      timestamp: string;
      read: boolean;
      metadata: any;
    }> = [];
    let total = 0;

    // First try the notifications table
    const {
      data: notificationsData,
      error: notificationsError,
      count,
    } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (
      !notificationsError &&
      notificationsData &&
      notificationsData.length > 0
    ) {
      notifications = notificationsData.map((n) => ({
        id: n.id,
        type: n.type || "system",
        title: n.title,
        message: n.message,
        timestamp: n.created_at,
        read: n.read || false,
        metadata: {
          ...n.metadata,
          actionUrl: n.action_url,
          actionLabel: n.action_label,
          priority: n.priority,
        },
      }));
      total = count || notifications.length;
    } else {
      // Fallback to activity_logs if notifications table is empty or doesn't exist
      const { data: activityData, error: activityError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!activityError && activityData && activityData.length > 0) {
        notifications = activityData.map((log) => ({
          id: log.id,
          type: log.activity_type || "system",
          title: getNotificationTitle(log.activity_type),
          message: log.activity_message || log.description || "Activity logged",
          timestamp: log.created_at,
          read: false,
          metadata: log.metadata || {},
        }));
        total = notifications.length;
      }
    }

    // If still no notifications, create a welcome one
    if (notifications.length === 0) {
      // Try to insert welcome notification
      const { data: welcomeNotification } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          type: "system",
          title: "Welcome to NNH AI Studio! 🎉",
          message:
            "Your dashboard is ready. Connect your Google My Business account to get started.",
          priority: "medium",
          read: false,
        })
        .select()
        .single();

      if (welcomeNotification) {
        notifications = [
          {
            id: welcomeNotification.id,
            type: "system",
            title: welcomeNotification.title,
            message: welcomeNotification.message,
            timestamp: welcomeNotification.created_at,
            read: false,
            metadata: {},
          },
        ];
        total = 1;
      } else {
        // Final fallback - return static welcome
        notifications = [
          {
            id: "welcome-static",
            type: "system",
            title: "Welcome to NNH AI Studio! 🎉",
            message:
              "Your dashboard is ready. Connect your Google My Business account to get started.",
            timestamp: new Date().toISOString(),
            read: false,
            metadata: {},
          },
        ];
        total = 1;
      }
    }

    // Build response
    const response = {
      notifications,
      pagination: {
        limit,
        offset,
        total: total || notifications.length,
        hasMore: total > offset + limit,
      },
      lastUpdated: new Date().toISOString(),
    };

    // Set cache headers
    const headers = new Headers({
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      ...Object.fromEntries(
        Object.entries(rateLimitHeaders).map(([k, v]) => [k, String(v)]),
      ),
    });

    return NextResponse.json(response, {
      status: 200,
      headers,
    });
  } catch (error) {
    apiLogger.error(
      "Notifications API error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch notifications",
      },
      { status: 500 },
    );
  }
}

/**
 * Helper function to get notification title based on activity type
 */
function getNotificationTitle(activityType: string): string {
  const titles: Record<string, string> = {
    system: "System Notification",
    review_reply: "Review Reply",
    question_answer: "Question Answered",
    sync_complete: "Sync Complete",
    sync_error: "Sync Error",
    auto_reply: "Auto Reply Sent",
    settings_update: "Settings Updated",
    location_update: "Location Updated",
    default: "Notification",
  };

  return titles[activityType] || titles["default"];
}
