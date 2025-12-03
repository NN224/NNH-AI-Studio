/**
 * ⏰ PREPARE ACTIONS CRON JOB
 *
 * /api/cron/prepare-actions
 *
 * Runs every hour to:
 * 1. Find new reviews without replies
 * 2. Generate AI replies using the real AI service
 * 3. Save as pending actions
 * 4. Auto-publish if autopilot is enabled (for positive reviews)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  getBusinessDNA,
  buildBusinessDNA,
} from "@/lib/services/business-dna-service";
import {
  createPendingAction,
  actionExistsForReference,
} from "@/lib/services/pending-actions-service";
import {
  generateAIReviewReply,
  logReplyGeneration,
  type ReviewContext,
} from "@/lib/services/ai-review-reply-service";
import type { AutoReplySettings } from "@/server/actions/auto-reply";

// Verify cron secret
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const results = {
      usersProcessed: 0,
      reviewsProcessed: 0,
      actionsCreated: 0,
      autoPublished: 0,
      errors: [] as string[],
    };

    // Get all users with active locations
    const { data: users } = await supabase
      .from("gmb_locations")
      .select("user_id")
      .eq("is_active", true);

    const uniqueUserIds = [...new Set(users?.map((u) => u.user_id) || [])];

    for (const userId of uniqueUserIds) {
      try {
        await processUserReviews(supabase, userId, results);
        results.usersProcessed++;
      } catch (error) {
        results.errors.push(`User ${userId}: ${error}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Prepare actions completed",
      results,
    });
  } catch (error) {
    console.error("Prepare Actions Cron Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

async function processUserReviews(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  results: {
    usersProcessed: number;
    reviewsProcessed: number;
    actionsCreated: number;
    autoPublished: number;
    errors: string[];
  },
) {
  // Get user's autopilot settings
  const { data: autopilotSettings } = await supabase
    .from("autopilot_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: autoReplySettings } = await supabase
    .from("auto_reply_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const isAutopilotEnabled = autopilotSettings?.is_enabled || false;
  const autoReplyPositive = autoReplySettings?.reply_to_positive ?? true;
  const autoReplyNeutral = autoReplySettings?.reply_to_neutral ?? false;
  const autoReplyNegative = autoReplySettings?.reply_to_negative ?? false;

  // Build settings for AI service
  const settings: AutoReplySettings = {
    enabled: isAutopilotEnabled,
    tone: autoReplySettings?.tone || "friendly",
    reply_to_positive: autoReplyPositive,
    reply_to_neutral: autoReplyNeutral,
    reply_to_negative: autoReplyNegative,
    min_rating_for_auto: autoReplySettings?.min_rating_for_auto || 4,
    include_signature: autoReplySettings?.include_signature ?? true,
    signature_text: autoReplySettings?.signature_text || "",
  };

  // Get or build Business DNA
  let dna = await getBusinessDNA(userId);
  if (!dna) {
    const result = await buildBusinessDNA(userId);
    dna = result.dna || null;
  }

  // Get reviews without replies (from last 7 days)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { data: reviews } = await supabase
    .from("gmb_reviews")
    .select("*")
    .eq("user_id", userId)
    .eq("has_reply", false)
    .gte("review_date", weekAgo.toISOString())
    .order("review_date", { ascending: false })
    .limit(20);

  if (!reviews || reviews.length === 0) return;

  for (const review of reviews) {
    try {
      results.reviewsProcessed++;

      // Check if action already exists
      const exists = await actionExistsForReference(
        userId,
        review.id,
        "review_reply",
      );
      if (exists) continue;

      // Build review context for AI service
      const reviewContext: ReviewContext = {
        reviewText: review.review_text || review.comment || "",
        rating: review.rating,
        locationName: dna?.businessName,
        businessCategory: dna?.businessCategory,
        customerName: review.reviewer_name,
      };

      // Generate AI reply using the REAL AI service
      const aiResult = await generateAIReviewReply(
        reviewContext,
        settings,
        userId,
      );

      // Log the generation attempt
      await logReplyGeneration(userId, review.id, aiResult, reviewContext);

      if (!aiResult.success) {
        console.error(
          `AI reply failed for review ${review.id}:`,
          aiResult.error,
        );
        continue;
      }

      // Determine if this needs attention
      const isNegative = review.rating <= 2;
      const isPositive = review.rating >= 4;
      const requiresAttention = isNegative || aiResult.confidence < 80;

      // Create pending action
      const action = await createPendingAction({
        userId,
        locationId: review.location_id,
        actionType: "review_reply",
        referenceId: review.id,
        referenceData: {
          reviewerName: review.reviewer_name,
          rating: review.rating,
          reviewText: review.review_text || review.comment,
          reviewDate: review.review_date,
        },
        aiGeneratedContent: aiResult.reply,
        aiConfidence: aiResult.confidence,
        aiReasoning: isNegative
          ? "مراجعة سلبية - يُنصح بمراجعة الرد قبل النشر"
          : aiResult.confidence < 80
            ? "ثقة AI منخفضة - يحتاج مراجعة"
            : `تم التوليد بواسطة ${aiResult.provider} (${aiResult.latency}ms)`,
        requiresAttention,
        attentionReason: isNegative
          ? "مراجعة سلبية تحتاج لمسة شخصية"
          : aiResult.confidence < 80
            ? "ثقة AI منخفضة"
            : undefined,
      });

      if (action) {
        results.actionsCreated++;

        // Auto-publish if conditions met
        if (
          isAutopilotEnabled &&
          aiResult.confidence >= 85 &&
          !requiresAttention &&
          ((isPositive && autoReplyPositive) ||
            (review.rating === 3 && autoReplyNeutral) ||
            (isNegative && autoReplyNegative))
        ) {
          // Auto-publish
          await supabase
            .from("pending_ai_actions")
            .update({
              status: "auto_published",
              published_at: new Date().toISOString(),
            })
            .eq("id", action.id);

          // TODO: Actually publish to Google using gmb-service
          // await publishReplyToGoogle(review, aiResult.reply);

          results.autoPublished++;
        }
      }
    } catch (error) {
      console.error(`Error processing review ${review.id}:`, error);
      results.errors.push(`Review ${review.id}: ${error}`);
    }
  }
}

// Also export POST for flexibility
export { GET as POST };
