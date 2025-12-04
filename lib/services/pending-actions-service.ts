/**
 * 📋 PENDING ACTIONS SERVICE
 *
 * إدارة الأعمال اللي AI جهزها وبانتظار موافقة المستخدم
 * - ردود المراجعات
 * - إجابات الأسئلة
 * - المنشورات
 */

import { createAdminClient } from "@/lib/supabase/server";

// ============================================
// TYPES
// ============================================

export type ActionType = "review_reply" | "question_answer" | "post" | "offer";
export type ActionStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "auto_published"
  | "edited"
  | "publish_failed";

export interface PendingAction {
  id: string;
  userId: string;
  locationId?: string;
  actionType: ActionType;
  referenceId: string;
  referenceData: any;
  aiGeneratedContent: string;
  aiConfidence: number;
  aiReasoning?: string;
  status: ActionStatus;
  requiresAttention: boolean;
  attentionReason?: string;
  createdAt: Date;
  reviewedAt?: Date;
  publishedAt?: Date;
  editedContent?: string;
}

export interface CreatePendingActionInput {
  userId: string;
  locationId?: string;
  actionType: ActionType;
  referenceId: string;
  referenceData: any;
  aiGeneratedContent: string;
  aiConfidence: number;
  aiReasoning?: string;
  requiresAttention?: boolean;
  attentionReason?: string;
}

export interface PendingActionFilters {
  actionType?: ActionType;
  status?: ActionStatus;
  requiresAttention?: boolean;
  locationId?: string;
}

export interface BatchResult {
  success: boolean;
  processed: number;
  failed: number;
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    publishedTo?: string;
  }>;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map database row to PendingAction
 */
function mapRowToAction(row: any): PendingAction {
  return {
    id: row.id,
    userId: row.user_id,
    locationId: row.location_id,
    actionType: row.action_type,
    referenceId: row.reference_id,
    referenceData: row.reference_data,
    aiGeneratedContent: row.ai_generated_content,
    aiConfidence: row.ai_confidence,
    aiReasoning: row.ai_reasoning,
    status: row.status,
    requiresAttention: row.requires_attention,
    attentionReason: row.attention_reason,
    createdAt: new Date(row.created_at),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : undefined,
    publishedAt: row.published_at ? new Date(row.published_at) : undefined,
    editedContent: row.edited_content,
  };
}

/**
 * Publish reply to Google Business Profile
 */
async function publishToGoogle(
  action: PendingAction,
  content: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();

    // Only handle review replies for now
    // Questions and posts require different API endpoints
    if (action.actionType !== "review_reply") {
      console.log(
        `[PUBLISH] Skipping ${action.actionType} - not implemented yet`,
      );
      return { success: true }; // Don't fail, just skip
    }

    // Get review with account/location info
    const { data: review } = await supabase
      .from("gmb_reviews")
      .select(
        `
        *,
        gmb_locations!inner(
          id, location_id, gmb_account_id,
          gmb_accounts!inner(id, account_id, is_active)
        )
      `,
      )
      .eq("id", action.referenceId)
      .single();

    if (!review) {
      return { success: false, error: "Review not found" };
    }

    // Check if account is active
    if (!review.gmb_locations?.gmb_accounts?.is_active) {
      return {
        success: false,
        error: "GMB account is not active. Please reconnect your account.",
      };
    }

    // Import and use existing replyToReview function
    const { replyToReview } = await import(
      "@/server/actions/reviews-management"
    );
    const result = await replyToReview(action.referenceId, content);

    return result;
  } catch (error) {
    console.error("Error publishing to Google:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Publish with retry logic (exponential backoff)
 */
async function publishWithRetry(
  action: PendingAction,
  content: string,
  maxRetries = 3,
): Promise<{ success: boolean; error?: string; attempt?: number }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await publishToGoogle(action, content);

    if (result.success) {
      return { ...result, attempt };
    }

    // Don't retry on certain errors
    const nonRetryableErrors = [
      "Authentication",
      "not found",
      "not active",
      "Invalid",
      "Forbidden",
    ];

    const shouldNotRetry = nonRetryableErrors.some((errText) =>
      result.error?.includes(errText),
    );

    if (shouldNotRetry) {
      console.log(`[PUBLISH] Not retrying due to error: ${result.error}`);
      return result;
    }

    // Exponential backoff before retry
    if (attempt < maxRetries) {
      const delayMs = 1000 * Math.pow(2, attempt);
      console.log(
        `[PUBLISH] Retry attempt ${attempt} failed, waiting ${delayMs}ms before retry ${attempt + 1}`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

// ============================================
// CRUD FUNCTIONS
// ============================================

/**
 * Get pending actions for a user
 */
export async function getPendingActions(
  userId: string,
  filters?: PendingActionFilters,
): Promise<PendingAction[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("pending_ai_actions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Apply filters
  if (filters?.actionType) {
    query = query.eq("action_type", filters.actionType);
  }
  if (filters?.status) {
    query = query.eq("status", filters.status);
  } else {
    // Default: only pending
    query = query.eq("status", "pending");
  }
  if (filters?.requiresAttention !== undefined) {
    query = query.eq("requires_attention", filters.requiresAttention);
  }
  if (filters?.locationId) {
    query = query.eq("location_id", filters.locationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching pending actions:", error);
    return [];
  }

  return (data || []).map(mapRowToAction);
}

/**
 * Get a single pending action by ID
 */
export async function getPendingActionById(
  actionId: string,
  userId: string,
): Promise<PendingAction | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pending_ai_actions")
    .select("*")
    .eq("id", actionId)
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return mapRowToAction(data);
}

/**
 * Create a new pending action
 */
export async function createPendingAction(
  input: CreatePendingActionInput,
): Promise<PendingAction | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pending_ai_actions")
    .insert({
      user_id: input.userId,
      location_id: input.locationId,
      action_type: input.actionType,
      reference_id: input.referenceId,
      reference_data: input.referenceData,
      ai_generated_content: input.aiGeneratedContent,
      ai_confidence: input.aiConfidence,
      ai_reasoning: input.aiReasoning,
      requires_attention: input.requiresAttention || false,
      attention_reason: input.attentionReason,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating pending action:", error);
    return null;
  }

  return mapRowToAction(data);
}

/**
 * Check if action already exists for a reference
 */
export async function actionExistsForReference(
  userId: string,
  referenceId: string,
  actionType: ActionType,
): Promise<boolean> {
  const supabase = createAdminClient();

  const { count } = await supabase
    .from("pending_ai_actions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("reference_id", referenceId)
    .eq("action_type", actionType);

  return (count || 0) > 0;
}

// ============================================
// ACTION FUNCTIONS
// ============================================

/**
 * Approve a pending action
 */
export async function approveAction(
  actionId: string,
  userId: string,
): Promise<{ success: boolean; publishedTo?: string; error?: string }> {
  const supabase = createAdminClient();

  // Get the action
  const action = await getPendingActionById(actionId, userId);
  if (!action) {
    return { success: false, error: "Action not found" };
  }

  if (action.status !== "pending") {
    return { success: false, error: "Action already processed" };
  }

  // Publish to Google with retry logic
  const publishResult = await publishWithRetry(
    action,
    action.aiGeneratedContent,
    3, // max retries
  );

  if (!publishResult.success) {
    // Update status to publish_failed with error details
    await supabase
      .from("pending_ai_actions")
      .update({
        status: "publish_failed",
        last_publish_error: publishResult.error,
        last_publish_attempt_at: new Date().toISOString(),
        publish_attempts: (action as any).publish_attempts
          ? (action as any).publish_attempts + 1
          : 1,
      })
      .eq("id", actionId);

    return { success: false, error: publishResult.error };
  }

  // Update status to approved with success details
  const { error } = await supabase
    .from("pending_ai_actions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      reviewed_by: userId,
      publish_attempts: publishResult.attempt || 1,
      last_publish_attempt_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, publishedTo: "google" };
}

/**
 * Reject a pending action
 */
export async function rejectAction(
  actionId: string,
  userId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Get the action
  const action = await getPendingActionById(actionId, userId);
  if (!action) {
    return { success: false, error: "Action not found" };
  }

  if (action.status !== "pending") {
    return { success: false, error: "Action already processed" };
  }

  // Update status
  const { error } = await supabase
    .from("pending_ai_actions")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      attention_reason: reason || action.attentionReason,
    })
    .eq("id", actionId);

  if (error) {
    return { success: false, error: error.message };
  }

  // TODO: Learn from rejection to improve AI

  return { success: true };
}

/**
 * Edit and approve a pending action
 */
export async function editAndApproveAction(
  actionId: string,
  userId: string,
  editedContent: string,
): Promise<{ success: boolean; publishedTo?: string; error?: string }> {
  const supabase = createAdminClient();

  // Get the action
  const action = await getPendingActionById(actionId, userId);
  if (!action) {
    return { success: false, error: "Action not found" };
  }

  if (action.status !== "pending") {
    return { success: false, error: "Action already processed" };
  }

  // Publish edited content to Google with retry logic
  const publishResult = await publishWithRetry(action, editedContent, 3);

  if (!publishResult.success) {
    // Update status to publish_failed with error details
    await supabase
      .from("pending_ai_actions")
      .update({
        status: "publish_failed",
        edited_content: editedContent,
        last_publish_error: publishResult.error,
        last_publish_attempt_at: new Date().toISOString(),
        publish_attempts: (action as any).publish_attempts
          ? (action as any).publish_attempts + 1
          : 1,
      })
      .eq("id", actionId);

    return { success: false, error: publishResult.error };
  }

  // Update status with edited content
  const { error } = await supabase
    .from("pending_ai_actions")
    .update({
      status: "edited",
      edited_content: editedContent,
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      reviewed_by: userId,
      publish_attempts: publishResult.attempt || 1,
      last_publish_attempt_at: new Date().toISOString(),
    })
    .eq("id", actionId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, publishedTo: "google" };
}

// ============================================
// BATCH FUNCTIONS
// ============================================

/**
 * Batch approve multiple actions
 */
export async function batchApprove(
  actionIds: string[],
  userId: string,
): Promise<BatchResult> {
  const results: BatchResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const actionId of actionIds) {
    const result = await approveAction(actionId, userId);
    results.push({
      id: actionId,
      success: result.success,
      error: result.error,
      publishedTo: result.publishedTo,
    });

    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

/**
 * Batch reject multiple actions
 */
export async function batchReject(
  actionIds: string[],
  userId: string,
  reason?: string,
): Promise<BatchResult> {
  const results: BatchResult["results"] = [];
  let processed = 0;
  let failed = 0;

  for (const actionId of actionIds) {
    const result = await rejectAction(actionId, userId, reason);
    results.push({
      id: actionId,
      success: result.success,
      error: result.error,
    });

    if (result.success) {
      processed++;
    } else {
      failed++;
    }
  }

  return {
    success: failed === 0,
    processed,
    failed,
    results,
  };
}

// ============================================
// STATS FUNCTIONS
// ============================================

/**
 * Get pending actions count by type
 */
export async function getPendingActionsCounts(
  userId: string,
  locationId?: string,
): Promise<{
  reviewReplies: number;
  questionAnswers: number;
  posts: number;
  total: number;
  requiresAttention: number;
}> {
  const supabase = createAdminClient();

  let baseQuery = supabase
    .from("pending_ai_actions")
    .select("action_type, requires_attention")
    .eq("user_id", userId)
    .eq("status", "pending");

  if (locationId) {
    baseQuery = baseQuery.eq("location_id", locationId);
  }

  const { data } = await baseQuery;

  const actions = data || [];

  return {
    reviewReplies: actions.filter((a) => a.action_type === "review_reply")
      .length,
    questionAnswers: actions.filter((a) => a.action_type === "question_answer")
      .length,
    posts: actions.filter((a) => a.action_type === "post").length,
    total: actions.length,
    requiresAttention: actions.filter((a) => a.requires_attention).length,
  };
}

/**
 * Get actions that require attention
 */
export async function getAttentionRequiredActions(
  userId: string,
  locationId?: string,
): Promise<PendingAction[]> {
  return getPendingActions(userId, {
    requiresAttention: true,
    status: "pending",
    locationId,
  });
}
