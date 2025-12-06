"use server";

import { GMB_CONSTANTS, getValidAccessToken } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import { API_TIMEOUTS, fetchWithTimeout } from "@/lib/utils/error-handling";
import { reviewsLogger } from "@/lib/utils/logger";
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
      reviewsLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
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
    reviewsLogger.error(
      "Failed to fetch reviews",
      error instanceof Error ? error : new Error(String(error)),
    );
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
      reviewsLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
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
      reviewsLogger.error(
        "Failed to update review status",
        error instanceof Error ? error : new Error(String(error)),
        { reviewId },
      );
      return { success: false, error: error.message };
    }

    revalidatePath("/reviews");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      return { success: false, error: `Validation error: ${errorMessage}` };
    }
    reviewsLogger.error(
      "Unexpected error updating review status",
      error instanceof Error ? error : new Error(String(error)),
      { reviewId },
    );
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
      reviewsLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  try {
    const validatedData = ReviewReplySchema.parse({ reviewId, reply });

    // 1. Get the review with its Google resource name, account info, and location info
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select(
        `
        id,
        google_name,
        review_id,
        gmb_account_id,
        google_location_id,
        gmb_accounts!inner (
          id,
          account_id
        ),
        gmb_locations!inner (
          id,
          location_id
        )
      `,
      )
      .eq("id", validatedData.reviewId)
      .eq("user_id", user.id)
      .single();

    if (reviewError || !review) {
      reviewsLogger.error(
        "Failed to fetch review",
        reviewError instanceof Error
          ? reviewError
          : new Error(String(reviewError)),
        { reviewId },
      );
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
      reviewsLogger.error(
        "Failed to get access token",
        tokenError instanceof Error
          ? tokenError
          : new Error(String(tokenError)),
        { gmbAccountId },
      );
      return { success: false, error: "Failed to authenticate with Google" };
    }

    // 3. Build the review resource name for Google API
    // Format: accounts/{accountId}/locations/{locationId}/reviews/{reviewId}

    // Define proper types with Zod for account and location objects
    const AccountSchema = z.object({
      account_id: z.string(),
    });

    const LocationSchema = z.object({
      location_id: z.string(),
    });

    // Safely validate the nested objects
    const gmbAccountResult = AccountSchema.safeParse(review.gmb_accounts);
    const gmbLocationResult = LocationSchema.safeParse(review.gmb_locations);

    const gmbAccount = gmbAccountResult.success ? gmbAccountResult.data : null;
    const gmbLocation = gmbLocationResult.success
      ? gmbLocationResult.data
      : null;

    // Log validation failures for debugging
    if (!gmbAccountResult.success) {
      reviewsLogger.warn("Invalid GMB account structure", {
        error: gmbAccountResult.error,
        reviewId: validatedData.reviewId,
      });
    }

    if (!gmbLocationResult.success) {
      reviewsLogger.warn("Invalid GMB location structure", {
        error: gmbLocationResult.error,
        reviewId: validatedData.reviewId,
      });
    }

    let googleReviewName = review.google_name;

    // If google_name is not stored, build it from components
    if (!googleReviewName && gmbAccount && gmbLocation && review.review_id) {
      // Use google_location_id if available, otherwise use location_id from gmb_locations
      const locationId = review.google_location_id || gmbLocation.location_id;

      // Ensure locationId is valid before building the resource name
      if (locationId) {
        googleReviewName = `${gmbAccount.account_id}/locations/${locationId}/reviews/${review.review_id}`;
      }
    }

    if (!googleReviewName) {
      return {
        success: false,
        error:
          "Cannot determine Google review resource name. Missing account, location, or review ID.",
      };
    }

    // 4. Send reply to Google API (v4)
    const replyUrl = `${GMB_CONSTANTS.GMB_V4_BASE}/${googleReviewName}/reply`;

    const googleResponse = await fetchWithTimeout(
      replyUrl,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          comment: validatedData.reply,
        }),
      },
      API_TIMEOUTS.GOOGLE_API,
    );

    if (!googleResponse.ok) {
      const errorData = await googleResponse.json().catch(() => ({}));
      reviewsLogger.error(
        "Google API reply failed",
        new Error(`Google API error: ${googleResponse.status}`),
        {
          status: googleResponse.status,
          errorData,
          reviewId,
        },
      );
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
      reviewsLogger.error(
        "Failed to update local review",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { reviewId },
      );
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
    reviewsLogger.error(
      "Unexpected error adding review reply",
      error instanceof Error ? error : new Error(String(error)),
      { reviewId },
    );
    return { success: false, error: "Failed to add review reply" };
  }
}
