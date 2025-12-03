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
  | "edited";

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
  // TODO: Implement actual Google API call
  // For now, simulate success
  console.log(`[PUBLISH] Would publish to Google:`, {
    actionType: action.actionType,
    referenceId: action.referenceId,
    content: content.substring(0, 100) + "...",
  });

  // In real implementation:
  // 1. Get OAuth token for user
  // 2. Call Google Business Profile API
  // 3. Post reply/answer/post
  // 4. Return result

  return { success: true };
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

  // Publish to Google
  const publishResult = await publishToGoogle(
    action,
    action.aiGeneratedContent,
  );

  if (!publishResult.success) {
    return { success: false, error: publishResult.error };
  }

  // Update status
  const { error } = await supabase
    .from("pending_ai_actions")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      reviewed_by: userId,
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

  // Publish edited content to Google
  const publishResult = await publishToGoogle(action, editedContent);

  if (!publishResult.success) {
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
