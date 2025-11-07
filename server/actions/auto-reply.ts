"use server";

import { createClient } from "@/lib/supabase/server";

export interface AutoReplySettings {
  enabled: boolean;
  minRating: number; // Minimum rating to auto-reply (1-5)
  replyToPositive: boolean; // 4-5 stars
  replyToNeutral: boolean; // 3 stars
  replyToNegative: boolean; // 1-2 stars
  requireApproval: boolean; // Require manual approval before sending
  tone: "friendly" | "professional" | "apologetic" | "marketing";
  locationId?: string; // If null, applies to all locations
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
    // Check if settings already exist
    const { data: existing } = await supabase
      .from("gmb_locations")
      .select("id")
      .eq("user_id", user.id)
      .eq("id", settings.locationId || "")
      .single();

    if (settings.locationId && !existing) {
      return {
        success: false,
        error: "Location not found",
      };
    }

    // Save settings to user profile or location-specific settings
    // For now, we'll use a simple approach: store in user settings JSON
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        settings: {
          auto_reply: {
            enabled: settings.enabled,
            min_rating: settings.minRating,
            reply_to_positive: settings.replyToPositive,
            reply_to_neutral: settings.replyToNeutral,
            reply_to_negative: settings.replyToNegative,
            require_approval: settings.requireApproval,
            tone: settings.tone,
            location_id: settings.locationId || null,
          },
        },
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Error saving auto-reply settings:", updateError);
      return {
        success: false,
        error: updateError.message,
      };
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
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("settings")
      .eq("id", user.id)
      .single();

    if (profileError) {
      return {
        success: true,
        data: {
          enabled: false,
          minRating: 4,
          replyToPositive: true,
          replyToNeutral: false,
          replyToNegative: false,
          requireApproval: true,
          tone: "friendly" as const,
          locationId: locationId || undefined,
        } as AutoReplySettings,
      };
    }

    const autoReplySettings = profile?.settings?.auto_reply || {};
    const defaultSettings: AutoReplySettings = {
      enabled: false,
      minRating: 4,
      replyToPositive: true,
      replyToNeutral: false,
      replyToNegative: false,
      requireApproval: true,
      tone: "friendly",
      locationId: locationId || undefined,
    };

    return {
      success: true,
      data: {
        ...defaultSettings,
        ...autoReplySettings,
        locationId: locationId || autoReplySettings.location_id || undefined,
      } as AutoReplySettings,
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
    // Get the review
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select("*")
      .eq("id", reviewId)
      .eq("user_id", user.id)
      .single();

    if (reviewError || !review) {
      return {
        success: false,
        error: "Review not found",
      };
    }

    // Check if review already has a reply
    if (review.has_reply || review.reply_text) {
      return {
        success: false,
        error: "Review already has a reply",
      };
    }

    // Get auto-reply settings
    const settingsResult = await getAutoReplySettings(review.location_id);
    if (!settingsResult.success || !settingsResult.data) {
      return {
        success: false,
        error: "Failed to get auto-reply settings",
      };
    }

    const settings = settingsResult.data;

    // Check if auto-reply is enabled
    if (!settings.enabled) {
      return {
        success: false,
        error: "Auto-reply is disabled",
      };
    }

    // Check rating requirements
    const shouldReply =
      (review.rating >= 4 && settings.replyToPositive) ||
      (review.rating === 3 && settings.replyToNeutral) ||
      (review.rating <= 2 && settings.replyToNegative);

    if (!shouldReply) {
      return {
        success: false,
        error: "Review rating doesn't match auto-reply criteria",
      };
    }

    // Check minimum rating
    if (review.rating < settings.minRating) {
      return {
        success: false,
        error: "Review rating is below minimum threshold",
      };
    }

    // Generate AI response
    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/generate-review-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reviewText: review.review_text || "",
          rating: review.rating,
          tone: settings.tone,
          locationName: "Business", // You can get this from location
        }),
      }
    );

    if (!aiResponse.ok) {
      return {
        success: false,
        error: "Failed to generate AI response",
      };
    }

    const { response: generatedReply } = await aiResponse.json();

    if (!generatedReply) {
      return {
        success: false,
        error: "No response generated",
      };
    }

    // If approval is required, save as draft
    if (settings.requireApproval) {
      const { error: updateError } = await supabase
        .from("gmb_reviews")
        .update({
          ai_suggested_reply: generatedReply,
          ai_generated_response: generatedReply,
          status: "in_progress",
        })
        .eq("id", reviewId);

      if (updateError) {
        return {
          success: false,
          error: updateError.message,
        };
      }

      return {
        success: true,
        message: "AI reply generated and saved for approval",
        requiresApproval: true,
        suggestedReply: generatedReply,
      };
    }

    // Auto-send the reply
    const { replyToReview } = await import("./reviews-management");
    const replyResult = await replyToReview(reviewId, generatedReply);

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

