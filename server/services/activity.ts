"use server";

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";

type LogParams = {
  userId: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionable?: boolean;
};

export async function logServerActivity({
  userId,
  type,
  message,
  metadata = {},
  actionable = false,
}: LogParams) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("activity_logs").insert({
      user_id: userId,
      activity_type: type,
      activity_message: message,
      metadata,
      actionable,
    });
    if (error) {
      apiLogger.error(
        "logServerActivity insert error",
        error instanceof Error ? error : new Error(String(error)),
        { userId, type, message },
      );
    }
  } catch (err) {
    apiLogger.error(
      "logServerActivity failed",
      err instanceof Error ? err : new Error(String(err)),
      { userId, type, message },
    );
  }
}
