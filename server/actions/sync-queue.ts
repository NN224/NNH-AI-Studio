"use server";

import type { SyncJobMetadata, SyncJobType } from "@/lib/gmb/sync-types";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { syncLogger } from "@/lib/utils/logger";

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
        syncLogger.error(
          "Failed to add to queue (admin)",
          error instanceof Error ? error : new Error(String(error)),
          { accountId },
        );
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
      syncLogger.error(
        "Failed to add to queue",
        error instanceof Error ? error : new Error(String(error)),
        { accountId },
      );
      return { success: false, error: error.message };
    }

    return { success: true, queueId: data.id };
  } catch (error) {
    syncLogger.error(
      "Unexpected error in addToSyncQueue",
      error instanceof Error ? error : new Error(String(error)),
      { accountId },
    );
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
      syncLogger.error(
        "Failed to fetch pending jobs",
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }

    return (data || []) as SyncQueueItem[];
  } catch (error) {
    syncLogger.error(
      "Unexpected error in getPendingSyncJobs",
      error instanceof Error ? error : new Error(String(error)),
    );
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
      syncLogger.error(
        "Failed to update status",
        error instanceof Error ? error : new Error(String(error)),
        { queueId, status },
      );
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    syncLogger.error(
      "Unexpected error in updateSyncStatus",
      error instanceof Error ? error : new Error(String(error)),
      { queueId, status },
    );
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
    syncLogger.error(
      "Unexpected error in getSyncQueueStats",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { pending: 0, processing: 0, completed: 0, failed: 0 };
  }
}

// ============================================================================
// Event-Driven Queue Functions (Micro-jobs Architecture)
// ============================================================================

/**
 * Enqueue a single sync job with typed metadata.
 * This is the primary function for adding jobs to the event-driven queue.
 *
 * @param jobType - The type of sync job to enqueue
 * @param metadata - Job-specific metadata (must include userId and accountId)
 * @param priority - Job priority (higher = processed first), defaults by job type
 * @returns Result with success status and optional queueId
 */
export async function enqueueSyncJob(
  jobType: SyncJobType,
  metadata: Omit<SyncJobMetadata, "job_type">,
  priority?: number,
): Promise<{ success: boolean; queueId?: string; error?: string }> {
  try {
    const admin = createAdminClient();

    // Default priorities by job type (discovery is higher to fan out quickly)
    const defaultPriorities: Record<SyncJobType, number> = {
      discovery_locations: 10,
      sync_reviews: 7,
      sync_insights: 5,
      sync_posts: 4,
      sync_media: 3,
    };

    const jobPriority = priority ?? defaultPriorities[jobType];

    // Build the full metadata object
    const fullMetadata: SyncJobMetadata = {
      job_type: jobType,
      ...metadata,
    };

    const { data, error } = await admin
      .from("sync_queue")
      .insert({
        user_id: metadata.userId,
        account_id: metadata.accountId,
        sync_type: "full", // Keep for backwards compatibility
        priority: jobPriority,
        status: "pending",
        metadata: fullMetadata,
        scheduled_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      syncLogger.error(
        "Failed to enqueue sync job",
        error instanceof Error ? error : new Error(String(error)),
        { jobType, accountId: metadata.accountId, userId: metadata.userId },
      );
      return { success: false, error: error.message };
    }

    syncLogger.info("Enqueued sync job", {
      queueId: data.id,
      jobType,
      accountId: metadata.accountId,
      userId: metadata.userId,
      priority: jobPriority,
    });

    return { success: true, queueId: data.id };
  } catch (error) {
    syncLogger.error(
      "Unexpected error in enqueueSyncJob",
      error instanceof Error ? error : new Error(String(error)),
      { jobType, accountId: metadata.accountId },
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fan out location-specific jobs for multiple locations.
 * Called after discovery_locations to create child jobs for each location.
 *
 * @param locations - Array of location data with IDs
 * @param jobTypes - Types of jobs to create for each location
 * @param baseMetadata - Common metadata for all jobs
 * @param parentJobId - Optional parent job ID for tracking
 * @returns Result with counts of jobs created
 */
export async function fanOutLocationJobs(
  locations: Array<{
    locationId: string;
    googleLocationId: string;
  }>,
  jobTypes: SyncJobType[],
  baseMetadata: {
    userId: string;
    accountId: string;
    googleAccountId?: string;
  },
  parentJobId?: string,
): Promise<{
  success: boolean;
  jobsCreated: number;
  errors: number;
  error?: string;
}> {
  if (locations.length === 0 || jobTypes.length === 0) {
    return { success: true, jobsCreated: 0, errors: 0 };
  }

  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();

    // Build array of jobs to insert
    const jobsToInsert = [];

    for (const location of locations) {
      for (const jobType of jobTypes) {
        // Skip discovery_locations - it's a parent job, not a child job
        if (jobType === "discovery_locations") continue;

        const metadata: SyncJobMetadata = {
          job_type: jobType,
          userId: baseMetadata.userId,
          accountId: baseMetadata.accountId,
          locationId: location.locationId,
          googleLocationId: location.googleLocationId,
          googleAccountId: baseMetadata.googleAccountId,
          parentJobId,
        };

        // Default priorities
        const priorities: Record<SyncJobType, number> = {
          discovery_locations: 10,
          sync_reviews: 7,
          sync_insights: 5,
          sync_posts: 4,
          sync_media: 3,
        };

        jobsToInsert.push({
          user_id: baseMetadata.userId,
          account_id: baseMetadata.accountId,
          sync_type: "full",
          priority: priorities[jobType],
          status: "pending" as const,
          metadata,
          scheduled_at: now,
        });
      }
    }

    if (jobsToInsert.length === 0) {
      return { success: true, jobsCreated: 0, errors: 0 };
    }

    // Bulk insert all jobs at once
    const { data, error } = await admin
      .from("sync_queue")
      .insert(jobsToInsert)
      .select("id");

    if (error) {
      syncLogger.error(
        "Failed to fan out location jobs",
        error instanceof Error ? error : new Error(String(error)),
        {
          accountId: baseMetadata.accountId,
          userId: baseMetadata.userId,
          locationCount: locations.length,
          jobTypes,
        },
      );
      return {
        success: false,
        jobsCreated: 0,
        errors: jobsToInsert.length,
        error: error.message,
      };
    }

    const jobsCreated = data?.length || 0;

    syncLogger.info("Fanned out location jobs", {
      jobsCreated,
      locationCount: locations.length,
      jobTypes,
      accountId: baseMetadata.accountId,
      userId: baseMetadata.userId,
      parentJobId,
    });

    return {
      success: true,
      jobsCreated,
      errors: jobsToInsert.length - jobsCreated,
    };
  } catch (error) {
    syncLogger.error(
      "Unexpected error in fanOutLocationJobs",
      error instanceof Error ? error : new Error(String(error)),
      { accountId: baseMetadata.accountId },
    );
    return {
      success: false,
      jobsCreated: 0,
      errors: locations.length * jobTypes.length,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get pending jobs with typed metadata for processing.
 * Used by the cron worker to fetch jobs to process.
 *
 * @param limit - Maximum number of jobs to fetch
 * @returns Array of queue items with typed metadata
 */
export async function getPendingJobsForWorker(
  limit: number = 10,
): Promise<(SyncQueueItem & { metadata: SyncJobMetadata })[]> {
  try {
    const admin = createAdminClient();

    syncLogger.info("Fetching pending jobs from sync_queue", { limit });

    const { data, error } = await admin
      .from("sync_queue")
      .select("*")
      .eq("status", "pending")
      .lt("attempts", 3)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(limit);

    syncLogger.info("Query result", {
      dataCount: data?.length || 0,
      error: error?.message,
      firstJob: data?.[0]?.id,
    });

    if (error) {
      syncLogger.error(
        "Failed to fetch pending jobs for worker",
        error instanceof Error ? error : new Error(String(error)),
      );
      return [];
    }

    // Filter to only jobs with valid metadata.job_type
    const validJobs = (data || []).filter((job: SyncQueueItem) => {
      // Safely check if metadata has the required properties for SyncJobMetadata
      const metadata = job.metadata;
      const isValid =
        metadata &&
        typeof metadata === "object" &&
        "job_type" in metadata &&
        "userId" in metadata &&
        "accountId" in metadata;

      if (!isValid && metadata) {
        syncLogger.warn("Job filtered out - invalid metadata", {
          jobId: job.id,
          metadata: JSON.stringify(metadata),
        });
      }

      return isValid;
    });

    syncLogger.info("Valid jobs after filtering", {
      total: data?.length || 0,
      valid: validJobs.length,
    });

    // Map to ensure type safety
    return validJobs.map((job) => {
      // We've already verified the metadata has the required properties
      return {
        ...job,
        metadata: job.metadata as unknown as SyncJobMetadata,
      };
    });
  } catch (error) {
    syncLogger.error(
      "Unexpected error in getPendingJobsForWorker",
      error instanceof Error ? error : new Error(String(error)),
    );
    return [];
  }
}

/**
 * Update queue item status using admin client (for worker use).
 * Ensures status updates work regardless of RLS policies.
 *
 * @param queueId - The queue item ID
 * @param status - New status
 * @param errorMessage - Optional error message for failed status
 * @returns Result with success status
 */
export async function updateJobStatus(
  queueId: string,
  status: "processing" | "completed" | "failed",
  errorMessage?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createAdminClient();

    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "processing") {
      updates.started_at = new Date().toISOString();
    }

    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    if (errorMessage) {
      updates.error_message = errorMessage;
    }

    // If failed, increment attempts
    if (status === "failed") {
      const { data: current } = await admin
        .from("sync_queue")
        .select("attempts")
        .eq("id", queueId)
        .single();

      if (current) {
        updates.attempts = (current.attempts || 0) + 1;
      }
    }

    const { error } = await admin
      .from("sync_queue")
      .update(updates)
      .eq("id", queueId);

    if (error) {
      syncLogger.error(
        "Failed to update job status",
        error instanceof Error ? error : new Error(String(error)),
        { queueId, status },
      );
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    syncLogger.error(
      "Unexpected error in updateJobStatus",
      error instanceof Error ? error : new Error(String(error)),
      { queueId, status },
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
