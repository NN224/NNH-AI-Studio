/**
 * ⏰ PREPARE ACTIONS CRON JOB
 *
 * /api/cron/prepare-actions
 *
 * Runs every hour to:
 * 1. Find new reviews without replies
 * 2. Generate AI replies for them
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
  results: any,
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

      // Generate AI reply
      const aiReply = await generateReviewReply(review, dna);
      if (!aiReply) continue;

      // Determine if this needs attention
      const isNegative = review.rating <= 2;
      const isPositive = review.rating >= 4;
      const requiresAttention = isNegative;

      // Create pending action
      const action = await createPendingAction({
        userId,
        locationId: review.location_id,
        actionType: "review_reply",
        referenceId: review.id,
        referenceData: {
          reviewerName: review.reviewer_name,
          rating: review.rating,
          reviewText: review.review_text,
          reviewDate: review.review_date,
        },
        aiGeneratedContent: aiReply.content,
        aiConfidence: aiReply.confidence,
        aiReasoning: aiReply.reasoning,
        requiresAttention,
        attentionReason: isNegative
          ? "مراجعة سلبية تحتاج لمسة شخصية"
          : undefined,
      });

      if (action) {
        results.actionsCreated++;

        // Auto-publish if conditions met
        if (
          isAutopilotEnabled &&
          aiReply.confidence >= 85 &&
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

          // TODO: Actually publish to Google
          // await publishReplyToGoogle(review, aiReply.content);

          results.autoPublished++;
        }
      }
    } catch (error) {
      console.error(`Error processing review ${review.id}:`, error);
    }
  }
}

async function generateReviewReply(
  review: any,
  dna: any,
): Promise<{ content: string; confidence: number; reasoning: string } | null> {
  try {
    // Build prompt based on Business DNA
    const isPositive = review.rating >= 4;
    const isNegative = review.rating <= 2;

    const tone = dna?.replyStyle?.tone || "professional";
    const useEmoji = dna?.replyStyle?.emojiUsage || false;
    const businessName = dna?.businessName || "our business";

    // Simple template-based generation (replace with actual AI call)
    let content = "";
    let confidence = 85;
    let reasoning = "";

    if (isPositive) {
      const greetings = [
        `شكراً جزيلاً ${review.reviewer_name}!`,
        `نشكرك ${review.reviewer_name} على تقييمك الرائع!`,
        `ممتنين لك ${review.reviewer_name}!`,
      ];
      const bodies = [
        "سعداء جداً إنك استمتعت بتجربتك معنا.",
        "كلماتك تسعدنا وتشجعنا على الاستمرار.",
        "نقدر وقتك لكتابة هذا التقييم.",
      ];
      const closings = [
        "ننتظرك دائماً! 🙏",
        "نتطلع لزيارتك القادمة!",
        "أهلاً بك في أي وقت!",
      ];

      content = `${greetings[Math.floor(Math.random() * greetings.length)]} ${useEmoji ? "🙏 " : ""}${bodies[Math.floor(Math.random() * bodies.length)]} ${closings[Math.floor(Math.random() * closings.length)]}`;
      confidence = 92;
      reasoning = "مراجعة إيجابية - رد شكر قياسي";
    } else if (isNegative) {
      content = `${review.reviewer_name}، نعتذر بشدة عن تجربتك السيئة. هذا لا يمثل معاييرنا ونحن نأخذ ملاحظاتك بجدية. نود التواصل معك لتعويضك. يرجى التواصل معنا.`;
      confidence = 70; // Lower confidence for negative reviews
      reasoning = "مراجعة سلبية - يُنصح بمراجعة الرد قبل النشر";
    } else {
      content = `شكراً ${review.reviewer_name} على تقييمك وملاحظاتك. نقدر رأيك ونسعى دائماً للتحسين. نتمنى أن تكون تجربتك القادمة أفضل!`;
      confidence = 80;
      reasoning = "مراجعة محايدة";
    }

    // Apply signature phrases if available
    if (dna?.signaturePhrases?.length > 0) {
      const signature = dna.signaturePhrases[0];
      if (!content.includes(signature)) {
        content += ` ${signature}`;
      }
    }

    return { content, confidence, reasoning };
  } catch (error) {
    console.error("Error generating reply:", error);
    return null;
  }
}

// Also export POST for flexibility
export { GET as POST };
