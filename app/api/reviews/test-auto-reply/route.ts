import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processAutoReply } from "@/server/actions/auto-reply";
import { reviewsLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/test-auto-reply
 * Manually trigger auto-reply for a specific review (for testing)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reviewId } = await request.json();

    if (!reviewId) {
      return NextResponse.json(
        { error: "Review ID is required" },
        { status: 400 },
      );
    }

    // Verify review belongs to user
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select("id, rating, review_text, has_reply, location_id")
      .eq("id", reviewId)
      .eq("user_id", user.id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json(
        { error: "Review not found or access denied" },
        { status: 404 },
      );
    }

    if (review.has_reply) {
      return NextResponse.json(
        { error: "This review already has a reply" },
        { status: 400 },
      );
    }

    // Process auto-reply
    const result = await processAutoReply(reviewId);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: result.requiresApproval
        ? "AI reply generated and saved for approval"
        : "Auto-reply sent successfully",
      data: {
        requiresApproval: result.requiresApproval || false,
        suggestedReply: result.suggestedReply || null,
      },
    });
  } catch (error) {
    reviewsLogger.error(
      "[Test Auto-Reply] Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to process auto-reply",
      },
      { status: 500 },
    );
  }
}
