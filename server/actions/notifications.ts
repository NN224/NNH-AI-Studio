"use server";

/**
 * Notifications Server Actions
 *
 * Handles all notification mutations. Replaces the API routes at:
 * - POST /api/notifications/create
 * - POST /api/notifications/[id]/read
 * - POST /api/notifications/read-all
 * - POST /api/notifications/clear-all
 * - DELETE /api/notifications/[id]
 */

import { logAction } from "@/lib/monitoring/audit";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/utils/logger";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ============================================================================
// Validation Schemas
// ============================================================================

const createNotificationSchema = z.object({
  type: z.enum([
    "review",
    "question",
    "sync",
    "alert",
    "info",
    "success",
    "warning",
    "error",
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  link: z.string().url().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface NotificationResult {
  success: boolean;
  error?: string;
  notification?: Notification;
}

export interface NotificationsResult {
  success: boolean;
  error?: string;
  notifications?: Notification[];
  unreadCount?: number;
}

// ============================================================================
// Server Actions
// ============================================================================

/**
 * Get all notifications for the authenticated user
 */
export async function getNotifications(options?: {
  limit?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (options?.unreadOnly) {
      query = query.eq("read", false);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error(
        "Failed to fetch notifications",
        error instanceof Error ? error : new Error(String(error)),
      );
      return { success: false, error: "Failed to fetch notifications" };
    }

    // Get unread count
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    return {
      success: true,
      notifications: data || [],
      unreadCount: count || 0,
    };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Create a new notification
 */
export async function createNotification(
  input: unknown,
): Promise<NotificationResult> {
  // Validate input
  const parsed = createNotificationSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid notification data: ${parsed.error.errors.map((e) => e.message).join(", ")}`,
    };
  }

  const { type, title, message, link, metadata } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Use admin client to bypass RLS for notification creation
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("notifications")
      .insert({
        user_id: user.id,
        type,
        title,
        message,
        link: link || null,
        metadata: metadata || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      logger.error(
        "Failed to create notification",
        error instanceof Error ? error : new Error(String(error)),
      );
      await logAction("notification_create", "notification", null, {
        status: "failed",
        error: error.message,
        type,
      });
      return { success: false, error: "Failed to create notification" };
    }

    await logAction("notification_create", "notification", data.id, {
      status: "success",
      type,
    });

    revalidatePath("/dashboard");

    return { success: true, notification: data };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || typeof notificationId !== "string") {
    return { success: false, error: "Invalid notification ID" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      logger.error(
        "Failed to mark notification as read",
        error instanceof Error ? error : new Error(String(error)),
        { notificationId },
      );
      return { success: false, error: "Failed to mark notification as read" };
    }

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{
  success: boolean;
  error?: string;
  count?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .select("id");

    if (error) {
      logger.error(
        "Failed to mark all notifications as read",
        error instanceof Error ? error : new Error(String(error)),
      );
      return { success: false, error: "Failed to mark notifications as read" };
    }

    await logAction("notifications_read_all", "notification", null, {
      status: "success",
      count: data?.length || 0,
    });

    revalidatePath("/dashboard");

    return { success: true, count: data?.length || 0 };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Delete a notification
 */
export async function deleteNotification(
  notificationId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!notificationId || typeof notificationId !== "string") {
    return { success: false, error: "Invalid notification ID" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId)
      .eq("user_id", user.id);

    if (error) {
      logger.error(
        "Failed to delete notification",
        error instanceof Error ? error : new Error(String(error)),
        { notificationId },
      );
      await logAction("notification_delete", "notification", notificationId, {
        status: "failed",
        error: error.message,
      });
      return { success: false, error: "Failed to delete notification" };
    }

    await logAction("notification_delete", "notification", notificationId, {
      status: "success",
    });

    revalidatePath("/dashboard");

    return { success: true };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<{
  success: boolean;
  error?: string;
  count?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get count before deleting
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (error) {
      logger.error(
        "Failed to clear all notifications",
        error instanceof Error ? error : new Error(String(error)),
      );
      await logAction("notifications_clear_all", "notification", null, {
        status: "failed",
        error: error.message,
      });
      return { success: false, error: "Failed to clear notifications" };
    }

    await logAction("notifications_clear_all", "notification", null, {
      status: "success",
      count: count || 0,
    });

    revalidatePath("/dashboard");

    return { success: true, count: count || 0 };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(): Promise<{
  success: boolean;
  error?: string;
  count?: number;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Not authenticated" };
    }

    const { count, error } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      logger.error(
        "Failed to get notification count",
        error instanceof Error ? error : new Error(String(error)),
      );
      return { success: false, error: "Failed to get notification count" };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    logger.error(
      "Unexpected error in getNotifications",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { success: false, error: "Unexpected error" };
  }
}
