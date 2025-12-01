"use client";

import { createClient } from "@/lib/supabase/client";
import { logger } from "@/lib/utils/logger";

export type ActivityType =
  | "ai"
  | "post"
  | "review"
  | "location"
  | "auth"
  | "youtube"
  | "settings"
  | "error";

type LogParams = {
  type: ActivityType | string;
  message: string;
  metadata?: Record<string, unknown>;
  actionable?: boolean;
};

/**
 * Log user activity into Supabase activity_logs table.
 * Safe to call on client; silently no-ops if user not authenticated.
 */
export async function logActivity({
  type,
  message,
  metadata = {},
  actionable = false,
}: LogParams) {
  try {
    const supabase = createClient();
    if (!supabase) {
      throw new Error("Failed to initialize Supabase client");
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      activity_type: type,
      activity_message: message,
      metadata,
      actionable,
    });
  } catch (err) {
    // Do not block UX if logging fails
    logger.error(
      "logActivity failed",
      err instanceof Error ? err : new Error(String(err)),
    );
  }
}
