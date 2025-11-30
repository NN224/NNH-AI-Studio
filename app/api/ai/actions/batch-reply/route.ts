/**
 * AI Batch Reply API
 * Generates AI replies for multiple pending reviews
 */

import { getAIProvider } from "@/lib/ai/provider";
import {
  withAIProtection,
  type AIProtectionContext,
} from "@/lib/api/with-ai-protection";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Review {
  id: string;
  review_id: string;
  rating: number;
  review_text: string;
  reviewer_name: string;
  location_id: string;
  location_name?: string;
}

interface GeneratedReply {
  reviewId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  suggestedReply: string;
  confidence: number;
}

async function handleBatchReply(
  request: Request,
  { userId }: AIProtectionContext,
): Promise<Response> {
  const supabase = await createClient();

  const body = await request.json();
  const { action, locationId, maxCount = 5 } = body;

  // Validate action
  if (action !== "generate_replies") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get AI provider
  const aiProvider = await getAIProvider(userId);
  if (!aiProvider) {
    return NextResponse.json(
      {
        error:
          "AI provider not configured. Please set up an API key in Settings.",
      },
      { status: 400 },
    );
  }

  // Fetch pending reviews (no reply yet)
  let query = supabase
    .from("gmb_reviews")
    .select(
      `
      id,
      review_id,
      rating,
      review_text,
      reviewer_name,
      location_id,
      gmb_locations!inner(location_name)
    `,
    )
    .eq("user_id", userId)
    .eq("has_reply", false)
    .order("review_date", { ascending: false })
    .limit(maxCount);

  if (locationId) {
    query = query.eq("location_id", locationId);
  }

  const { data: reviews, error } = await query;

  if (error) {
    console.error("[Batch Reply] Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 },
    );
  }

  if (!reviews || reviews.length === 0) {
    return NextResponse.json({
      success: true,
      message: "No pending reviews found",
      replies: [],
    });
  }

  // Generate replies for each review
  const generatedReplies: GeneratedReply[] = [];

  for (const review of reviews) {
    try {
      const typedReview = review as unknown as Review & {
        gmb_locations: { location_name: string };
      };

      const prompt = buildReplyPrompt(typedReview);
      const { content } = await aiProvider.generateCompletion(
        prompt,
        "batch_reply",
        typedReview.location_id,
      );

      // Parse JSON response
      let replyData: { reply: string; confidence: number };
      try {
        const cleanContent = content
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        replyData = JSON.parse(cleanContent);
      } catch {
        replyData = { reply: content, confidence: 70 };
      }

      generatedReplies.push({
        reviewId: typedReview.review_id,
        reviewerName: typedReview.reviewer_name || "Customer",
        rating: typedReview.rating,
        reviewText: typedReview.review_text || "",
        suggestedReply: replyData.reply,
        confidence: replyData.confidence,
      });
    } catch (err) {
      console.error(
        `[Batch Reply] Error generating reply for review ${review.id}:`,
        err,
      );
      // Continue with other reviews
    }
  }

  return NextResponse.json({
    success: true,
    totalPending: reviews.length,
    generated: generatedReplies.length,
    replies: generatedReplies,
  });
}

function buildReplyPrompt(
  review: Review & { gmb_locations: { location_name: string } },
): string {
  const locationName = review.gmb_locations?.location_name || "our business";
  const sentiment =
    review.rating <= 2
      ? "negative"
      : review.rating === 3
        ? "neutral"
        : "positive";

  return `You are a professional business owner responding to a customer review.

Business: ${locationName}
Review Rating: ${review.rating}/5 stars (${sentiment})
Reviewer: ${review.reviewer_name || "Customer"}
Review: "${review.review_text || "No text provided"}"

Generate a professional, personalized response that:
1. Thanks the customer by name if available
2. Addresses specific points from their review
3. For negative reviews: Apologize sincerely and offer resolution
4. For positive reviews: Express genuine gratitude
5. Keep the response between 50-150 words
6. End with an invitation to return

Return ONLY valid JSON:
{
  "reply": "Your response text here",
  "confidence": 85
}

The confidence score (0-100) indicates how certain you are about this response.`;
}

export const POST = withAIProtection(handleBatchReply, {
  endpointType: "generate",
});
