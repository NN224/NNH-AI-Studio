import { withAuthorization } from "@/lib/api/with-authorization";
import { withCSRF } from "@/lib/api/with-csrf";
import { withRateLimit } from "@/lib/api/with-rate-limit";
import { sanitizeHtml } from "@/lib/security/sanitize-html";
import { createClient } from "@/lib/supabase/server";
import { reviewsLogger } from "@/lib/utils/logger";
import { reviewReplySchema } from "@/lib/validations/schemas";
import { validateBody } from "@/middleware/validate-request";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  reply_text: reviewReplySchema.shape.replyText.optional(),
  tone: z
    .enum(["friendly", "professional", "apologetic", "marketing"])
    .optional(),
  generate_ai_reply: z.boolean().optional(),
});

async function replyHandler(
  request: NextRequest,
  { params, user }: { params: { id: string }; user: Record<string, unknown> },
) {
  try {
    const supabase = await createClient();

    const { id: reviewId } = params;
    const validation = await validateBody(request, replySchema);
    if (!validation.success) {
      return validation.response;
    }

    const { reply_text, tone, generate_ai_reply } = validation.data;

    // Verify review belongs to user
    const { data: review, error: reviewError } = await supabase
      .from("gmb_reviews")
      .select("*, gmb_locations!inner(user_id, location_name)")
      .eq("id", reviewId)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    // Ownership check is now handled by the middleware
    // Double-check for extra security
    if (review.gmb_locations?.user_id !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let finalReplyText = reply_text
      ? sanitizeHtml(reply_text).trim()
      : undefined;

    // Generate AI reply if requested
    if (generate_ai_reply && !reply_text) {
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          (process.env.NODE_ENV === "production"
            ? "https://nnh.ae"
            : "http://localhost:5050");
        const aiResponse = await fetch(`${baseUrl}/api/reviews/ai-response`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewId: review.id,
            reviewText: review.review_text || review.comment || "",
            rating: review.rating,
            locationName: review.gmb_locations?.location_name || "our business",
            tone: tone || "friendly",
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          finalReplyText = sanitizeHtml(aiData.response).trim();
        } else {
          return NextResponse.json(
            { error: "Failed to generate AI reply" },
            { status: 500 },
          );
        }
      } catch (aiError) {
        reviewsLogger.error(
          "AI generation error",
          aiError instanceof Error ? aiError : new Error(String(aiError)),
          { reviewId, userId: user.id },
        );
        return NextResponse.json(
          { error: "Failed to generate AI reply" },
          { status: 500 },
        );
      }
    }

    if (!finalReplyText || finalReplyText.trim().length === 0) {
      return NextResponse.json(
        { error: "Reply text is required" },
        { status: 400 },
      );
    }

    // Update review with reply
    const { error: updateError } = await supabase
      .from("gmb_reviews")
      .update({
        reply_text: finalReplyText.trim(),
        review_reply: finalReplyText.trim(), // Keep both for backwards compatibility
        reply_date: new Date().toISOString(),
        has_reply: true,
        has_response: true,
        response_text: finalReplyText.trim(),
        responded_at: new Date().toISOString(),
        status: "responded",
        updated_at: new Date().toISOString(),
      })
      .eq("id", reviewId);

    if (updateError) {
      reviewsLogger.error(
        "Error updating review reply",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { reviewId, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to save reply", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Reply saved successfully",
      reply_text: sanitizeHtml(finalReplyText),
    });
  } catch (error) {
    reviewsLogger.error(
      "Unexpected error in review reply",
      error instanceof Error ? error : new Error(String(error)),
      { reviewId: params.id },
    );
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 },
    );
  }
}

// Apply CSRF protection, rate limiting, and ownership check
export const POST = withCSRF(
  withRateLimit(
    withAuthorization(replyHandler, {
      checkOwnership: true,
      resourceType: "review",
    }),
    { limit: 50, window: 60 }, // 50 requests per minute
  ),
);
