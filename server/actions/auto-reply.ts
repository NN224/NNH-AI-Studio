"use server";

import { createClient } from "@/lib/supabase/server";
import { getBaseUrl } from "@/lib/utils/get-base-url";

export interface AutoReplySettings {
  enabled: boolean;
  minRating: number; // Minimum rating to auto-reply (1-5)
  replyToPositive: boolean; // 4-5 stars (legacy, kept for backwards compatibility)
  replyToNeutral: boolean; // 3 stars (legacy, kept for backwards compatibility)
  replyToNegative: boolean; // 1-2 stars (legacy, kept for backwards compatibility)
  requireApproval: boolean; // Require manual approval before sending (default: false)
  tone: "friendly" | "professional" | "apologetic" | "marketing";
  locationId?: string; // If null, applies to all locations
  // New per-rating controls
  autoReply1Star?: boolean; // Auto-reply to 1-star reviews
  autoReply2Star?: boolean; // Auto-reply to 2-star reviews
  autoReply3Star?: boolean; // Auto-reply to 3-star reviews
  autoReply4Star?: boolean; // Auto-reply to 4-star reviews
  autoReply5Star?: boolean; // Auto-reply to 5-star reviews
}

/**
 * Save auto-reply settings for a user
 */
export async function saveAutoReplySettings(
  settings: AutoReplySettings
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  try {
    const targetLocationId = settings.locationId ?? null;

    const existingQuery = supabase
      .from("auto_reply_settings")
      .select("id")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (targetLocationId) {
      existingQuery.eq("location_id", targetLocationId);
    } else {
      existingQuery.is("location_id", null);
    }

    const { data: existingRow, error: existingError } = await existingQuery.maybeSingle();

    if (existingError && existingError.code !== "PGRST116") {
      console.error("[AutoReply] Failed to fetch existing settings:", existingError);
      return {
        success: false,
        error: existingError.message,
      };
    }

    const payload = {
      user_id: user.id,
      location_id: targetLocationId,
      enabled: settings.enabled,
      reply_to_positive: settings.replyToPositive,
      reply_to_neutral: settings.replyToNeutral,
      reply_to_negative: settings.replyToNegative,
      require_approval: settings.requireApproval,
      response_style: settings.tone,
      response_delay_minutes: settings.minRating,
      language: "en",
      // New per-rating controls
      auto_reply_1_star: settings.autoReply1Star ?? settings.replyToNegative ?? true,
      auto_reply_2_star: settings.autoReply2Star ?? settings.replyToNegative ?? true,
      auto_reply_3_star: settings.autoReply3Star ?? settings.replyToNeutral ?? true,
      auto_reply_4_star: settings.autoReply4Star ?? settings.replyToPositive ?? true,
      auto_reply_5_star: settings.autoReply5Star ?? settings.replyToPositive ?? true,
      updated_at: new Date().toISOString(),
    };

    if (existingRow?.id) {
      const { error: updateError } = await supabase
        .from("auto_reply_settings")
        .update(payload)
        .eq("id", existingRow.id);

      if (updateError) {
        console.error("[AutoReply] Failed to update settings:", updateError);
        return {
          success: false,
          error: updateError.message,
        };
      }
    } else {
      const { error: insertError } = await supabase
        .from("auto_reply_settings")
        .insert({
          ...payload,
          created_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error("[AutoReply] Failed to insert settings:", insertError);
        return {
          success: false,
          error: insertError.message,
        };
      }
    }

    return {
      success: true,
      message: "Auto-reply settings saved successfully",
    };
  } catch (error) {
    console.error("Error in saveAutoReplySettings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get auto-reply settings for a user
 */
export async function getAutoReplySettings(locationId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Not authenticated",
      data: null,
    };
  }

  try {
    const targetLocationId = locationId ?? null;

    const defaultSettings: AutoReplySettings = {
      enabled: false,
      minRating: 4,
      replyToPositive: true,
      replyToNeutral: false,
      replyToNegative: false,
      requireApproval: false, // ← Changed to false for instant replies!
      tone: "friendly",
      locationId: locationId || undefined,
      // New per-rating defaults (all enabled for immediate responses)
      autoReply1Star: true,
      autoReply2Star: true,
      autoReply3Star: true,
      autoReply4Star: true,
      autoReply5Star: true,
    };

    const allowedTones: AutoReplySettings["tone"][] = [
      "friendly",
      "professional",
      "apologetic",
      "marketing",
    ];

    const query = supabase
      .from("auto_reply_settings")
      .select(
        `
          enabled,
          reply_to_positive,
          reply_to_neutral,
          reply_to_negative,
          require_approval,
          response_style,
          response_delay_minutes,
          auto_reply_1_star,
          auto_reply_2_star,
          auto_reply_3_star,
          auto_reply_4_star,
          auto_reply_5_star
        `
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (targetLocationId) {
      query.eq("location_id", targetLocationId);
    } else {
      query.is("location_id", null);
    }

    const { data: row, error: fetchError } = await query.maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[AutoReply] Failed to load settings:", fetchError);
      return {
        success: false,
        error: fetchError.message,
        data: null,
      };
    }

    if (!row) {
      return {
        success: true,
        data: defaultSettings,
      };
    }

    const resolvedTone =
      typeof row.response_style === "string" && allowedTones.includes(row.response_style as AutoReplySettings["tone"])
        ? (row.response_style as AutoReplySettings["tone"])
        : defaultSettings.tone;

    const resolvedMinRating =
      typeof row.response_delay_minutes === "number"
        ? Math.min(5, Math.max(1, Math.round(row.response_delay_minutes)))
        : defaultSettings.minRating;

    return {
      success: true,
      data: {
        enabled: row.enabled ?? defaultSettings.enabled,
        minRating: resolvedMinRating,
        replyToPositive: row.reply_to_positive ?? defaultSettings.replyToPositive,
        replyToNeutral: row.reply_to_neutral ?? defaultSettings.replyToNeutral,
        replyToNegative: row.reply_to_negative ?? defaultSettings.replyToNegative,
        requireApproval: row.require_approval ?? defaultSettings.requireApproval,
        tone: resolvedTone,
        locationId: locationId || undefined,
        // New per-rating controls
        autoReply1Star: row.auto_reply_1_star ?? defaultSettings.autoReply1Star,
        autoReply2Star: row.auto_reply_2_star ?? defaultSettings.autoReply2Star,
        autoReply3Star: row.auto_reply_3_star ?? defaultSettings.autoReply3Star,
        autoReply4Star: row.auto_reply_4_star ?? defaultSettings.autoReply4Star,
        autoReply5Star: row.auto_reply_5_star ?? defaultSettings.autoReply5Star,
      },
    };
  } catch (error) {
    console.error("Error in getAutoReplySettings:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
      data: null,
    };
  }
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

interface ReviewRecord {
  id: string;
  rating: number;
  location_id: string | null;
  review_text: string | null;
  has_reply: boolean;
  reply_text: string | null;
  status: string | null;
}

// Get base URL - use utility function that handles production/development
// This will return https://nnh.ae in production, localhost:5050 in development
const DEFAULT_APP_URL = getBaseUrl();

async function fetchReviewRecord(
  supabase: SupabaseClient,
  reviewId: string,
  userId: string
): Promise<{ success: true; review: ReviewRecord } | { success: false; error: string }> {
  const { data: review, error: reviewError } = await supabase
    .from("gmb_reviews")
    .select("*")
    .eq("id", reviewId)
    .eq("user_id", userId)
    .single();

  if (reviewError || !review) {
    return { success: false, error: "Review not found" };
  }

  return { success: true, review: review as ReviewRecord };
}

function evaluateAutoReplyEligibility(
  review: ReviewRecord,
  settings: AutoReplySettings
): { allowed: boolean; reason?: string } {
  if (review.has_reply || review.reply_text) {
    return { allowed: false, reason: "Review already has a reply" };
  }

  if (!settings.enabled) {
    return { allowed: false, reason: "Auto-reply is disabled" };
  }

  const matchesRating =
    (review.rating >= 4 && settings.replyToPositive) ||
    (review.rating === 3 && settings.replyToNeutral) ||
    (review.rating <= 2 && settings.replyToNegative);

  if (!matchesRating) {
    return { allowed: false, reason: "Review rating doesn't match auto-reply criteria" };
  }

  if (review.rating < settings.minRating) {
    return { allowed: false, reason: "Review rating is below minimum threshold" };
  }

  return { allowed: true };
}

async function generateReviewReply(
  review: ReviewRecord,
  settings: AutoReplySettings
): Promise<{ success: true; reply: string } | { success: false; error: string }> {
  try {
    const aiResponse = await fetch(`${DEFAULT_APP_URL}/api/ai/generate-review-reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewText: review.review_text || "",
        rating: review.rating,
        tone: settings.tone,
        locationName: "Business",
      }),
    });

    if (!aiResponse.ok) {
      return { success: false, error: "Failed to generate AI response" };
    }

    const { response: generatedReply } = await aiResponse.json();
    if (!generatedReply) {
      return { success: false, error: "No response generated" };
    }

    return { success: true, reply: generatedReply as string };
  } catch (error) {
    console.error("Error generating review reply:", error);
    return { success: false, error: "Failed to generate AI response" };
  }
}

async function persistApprovalDraft(
  supabase: SupabaseClient,
  reviewId: string,
  reply: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { error: updateError } = await supabase
    .from("gmb_reviews")
    .update({
      ai_suggested_reply: reply,
      ai_generated_response: reply,
      status: "in_progress",
    })
    .eq("id", reviewId);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  return { success: true };
}

async function dispatchAutoReply(reviewId: string, reply: string) {
  const { replyToReview } = await import("./reviews-management");
  return replyToReview(reviewId, reply);
}

/**
 * Process auto-reply for a new review
 * This should be called when a new review is detected
 */
export async function processAutoReply(reviewId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Not authenticated",
    };
  }

  try {
    const reviewResult = await fetchReviewRecord(supabase, reviewId, user.id);

    if (!reviewResult.success) {
      return reviewResult;
    }

    const review = reviewResult.review;
    const settingsResult = await getAutoReplySettings(review.location_id || undefined);
    if (!settingsResult.success || !settingsResult.data) {
      return {
        success: false,
        error: "Failed to get auto-reply settings",
      };
    }

    const settings = settingsResult.data;
    const eligibility = evaluateAutoReplyEligibility(review, settings);

    if (!eligibility.allowed) {
      return {
        success: false,
        error: eligibility.reason || "Review is not eligible for auto-reply",
      };
    }

    const generationResult = await generateReviewReply(review, settings);
    if (!generationResult.success) {
      return generationResult;
    }

    const generatedReply = generationResult.reply;

    if (settings.requireApproval) {
      const draftResult = await persistApprovalDraft(supabase, reviewId, generatedReply);
      if (!draftResult.success) {
        return draftResult;
      }

      return {
        success: true,
        message: "AI reply generated and saved for approval",
        requiresApproval: true,
        suggestedReply: generatedReply,
      };
    }

    const replyResult = await dispatchAutoReply(reviewId, generatedReply);

    if (replyResult.success) {
      return {
        success: true,
        message: "Auto-reply sent successfully",
        requiresApproval: false,
      };
    }

    return {
      success: false,
      error: replyResult.error || "Failed to send auto-reply",
    };
  } catch (error) {
    console.error("Error in processAutoReply:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

