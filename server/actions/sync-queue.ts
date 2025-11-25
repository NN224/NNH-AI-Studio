"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface SyncQueueItem {
  id: string;
  user_id: string;
  account_id: string;
  sync_type: "full" | "incremental" | "locations_only";
  status: "pending" | "processing" | "completed" | "failed";
  priority: number;
  attempts: number;
  max_attempts: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

/**
 * Add a sync job to the queue
 */
export async function addToSyncQueue(
  accountId: string,
  syncType: "full" | "incremental" | "locations_only" = "full",
  priority: number = 0,
  /**
   * Optional userId for server-side contexts (e.g. OAuth callback) where
   * there may be no Supabase session cookie. When provided, we will use the
   * Admin client to bypass RLS safely and attribute the job to this user.
   */
  userId?: string,
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    // If userId is explicitly provided (server-to-server flow), use admin client
    if (userId) {
      const admin = createAdminClient();
      const { data, error } = await admin
        .from("sync_queue")
        .insert({
          user_id: userId,
          account_id: accountId,
          sync_type: syncType,
          priority,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[Sync Queue] Failed to add to queue (admin):", error);
        return { success: false, error: error.message };
      }

      return { success: true, queueId: data.id };
    }

    // Otherwise, fall back to authenticated user context
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("sync_queue")
      .insert({
        user_id: user.id,
        account_id: accountId,
        sync_type: syncType,
        priority,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Sync Queue] Failed to add to queue:", error);
      return { success: false, error: error.message };
    }

    return { success: true, queueId: data.id };
  } catch (error) {
    console.error("[Sync Queue] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get pending queue items (for processing)
 */
export async function getPendingSyncJobs(
  limit: number = 10,
): Promise<SyncQueueItem[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("sync_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3) // Only get items that haven't exceeded max attempts
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[Sync Queue] Failed to fetch pending jobs:", error);
      return [];
    }

    return (data || []) as SyncQueueItem[];
  } catch (error) {
    console.error("[Sync Queue] Unexpected error:", error);
    return [];
  }
}

/**
 * Update queue item status
 */
export async function updateSyncQueueStatus(
  queueId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const updates: Partial<SyncQueueItem> = {
      status,
      ...(status === "processing" && { started_at: new Date().toISOString() }),
      ...(status === "completed" && {
        completed_at: new Date().toISOString(),
      }),
      ...(errorMessage && { error_message: errorMessage }),
    };

    // If failed, increment attempts
    if (status === "failed") {
      const { data: current } = await supabase
        .from("sync_queue")
        .select("attempts")
        .eq("id", queueId)
        .single();

      if (current) {
        updates.attempts = (current.attempts || 0) + 1;
      }
    }

    const { error } = await supabase
      .from("sync_queue")
      .update(updates)
      .eq("id", queueId);

    if (error) {
      console.error("[Sync Queue] Failed to update status:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("[Sync Queue] Unexpected error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get user's queue status
 */
export async function getUserQueueStatus(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }

    const { data, error } = await supabase
      .from("sync_queue")
      .select("status")
      .eq("user_id", user.id);

    if (error || !data) {
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }

    const counts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    data.forEach((item) => {
      if (item.status in counts) {
        counts[item.status as keyof typeof counts]++;
      }
    });

    return counts;
  } catch (error) {
    console.error("[Sync Queue] Unexpected error:", error);
    return { pending: 0, processing: 0, completed: 0, failed: 0 };
  }
}
