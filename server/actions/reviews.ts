"use server";

import { GMB_CONSTANTS, getValidAccessToken } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import {
  ReviewReplySchema,
  ReviewStatusSchema,
} from "@/lib/validations/dashboard";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function getReviews(locationId?: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Authentication error:", authError);
    }
    return { reviews: [], error: "Not authenticated" };
  }

  let query = supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (locationId && locationId !== "all") {
    query = query.eq("location_id", locationId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to fetch reviews:", error);
    return { reviews: [], error: error.message };
  }

  return { reviews: data || [], error: null };
}

export async function updateReviewStatus(reviewId: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Authentication error:", authError);
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  try {
    const validatedData = ReviewStatusSchema.parse({ reviewId, status });

    const { error } = await supabase
      .from("gmb_reviews")
      .update({ status: validatedData.status })
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to update review status:", error);
      return { success: false, error: error.message };
    }

    revalidatePath("/reviews");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      return { success: false, error: `Validation error: ${errorMessage}` };
    }
    console.error("Unexpected error:", error);
    return { success: false, error: "Failed to update review status" };
  }
}

export async function addReviewReply(reviewId: string, reply: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError && authError.name !== "AuthSessionMissingError") {
      console.error("Authentication error:", authError);
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  try {
    const validatedData = ReviewReplySchema.parse({ reviewId, reply });

    // 1. Get the review with its Google resource name and account info
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select(
        `
        id,
        google_name,
        review_id,
        gmb_account_id,
        gmb_accounts!inner (
          id,
          account_id
        )
      `,
      )
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id)
      .single();

    if (reviewError || !review) {
      console.error("Failed to fetch review:", reviewError);
      return { success: false, error: "Review not found" };
    }

    // 2. Get valid access token
    const gmbAccountId = review.gmb_account_id;
    if (!gmbAccountId) {
      return { success: false, error: "No GMB account linked to this review" };
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(supabase, gmbAccountId);
    } catch (tokenError) {
      console.error("Failed to get access token:", tokenError);
      return { success: false, error: "Failed to authenticate with Google" };
    }

    // 3. Build the review resource name for Google API
    // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}
    const gmbAccount = review.gmb_accounts as unknown as {
      account_id: string;
    } | null;
    const googleReviewName =
      review.google_name ||
      (gmbAccount
        ? `${gmbAccount.account_id}/reviews/${review.review_id}`
        : null);

    if (!googleReviewName) {
      return {
        success: false,
        error: "Cannot determine Google review resource name",
      };
    }

    // 4. Send reply to Google API (v4)
    const replyUrl = `${GMB_CONSTANTS.GMB_V4_BASE}/${googleReviewName}/reply`;

    const googleResponse = await fetch(replyUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: validatedData.reply,
      }),
    });

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json().catch(() => ({}));
      console.error("Google API reply failed:", {
        status: googleResponse.status,
        error: errorData,
      });
      return {
        success: false,
        error:
          errorData?.error?.message ||
          `Google API error: ${googleResponse.status}`,
      };
    }

    // 5. Update local database after successful Google API call
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        review_reply: validatedData.reply,
        has_reply: true,
        status: "responded",
      })
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update local review:", updateError);
      // Note: Reply was sent to Google but local DB update failed
      return {
        success: true,
        error: "Reply sent to Google but local update failed",
      };
    }

    revalidatePath("/reviews");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      return { success: false, error: `Validation error: ${errorMessage}` };
    }
    console.error("Unexpected error:", error);
    return { success: false, error: "Failed to add review reply" };
  }
}
