"use server";

import { trackDailyActiveUser } from "@/lib/monitoring/metrics";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { headers } from "next/headers";

type AuditMetadata = Record<string, unknown> | null | undefined;

function getClientIp() {
  const forwardHeader = headers().get("x-forwarded-for");
  if (forwardHeader) {
    return forwardHeader.split(",")[0]?.trim() || null;
  }
  return headers().get("x-real-ip") || null;
}

export async function logAction(
  action: string,
  resourceType?: string | null,
  resourceId?: string | number | null,
  metadata?: AuditMetadata,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("audit_logs").insert({
      action,
      resource_type: resourceType ?? null,
      resource_id: resourceId ? String(resourceId) : null,
      metadata: metadata ?? null,
      ip_address: getClientIp(),
      user_id: user?.id ?? null,
    });

    if (user?.id) {
      await trackDailyActiveUser(user.id);
    }
  } catch (error) {
    apiLogger.error(
      "Failed to log audit action",
      error instanceof Error ? error : new Error(String(error)),
      { action },
    );
  }
}

export async function getRecentActivity(userId: string, limit = 10) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, resource_type, resource_id, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      apiLogger.error(
        "Failed to fetch audit activity",
        error instanceof Error ? error : new Error(String(error)),
        { userId },
      );
      return [];
    }

    return data ?? [];
  } catch (error) {
    apiLogger.error(
      "Unexpected error fetching audit activity",
      error instanceof Error ? error : new Error(String(error)),
      { userId },
    );
    return [];
  }
}
