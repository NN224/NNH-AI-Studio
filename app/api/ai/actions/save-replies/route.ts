/**
 * Save AI-Generated Replies API
 * Saves draft replies to database for later publishing
 */

import {
  withAIProtection,
  type AIProtectionContext,
} from "@/lib/api/with-ai-protection";
import { apiLogger } from "@/lib/utils/logger";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ReplyToSave {
  reviewId: string;
  suggestedReply: string;
  confidence?: number;
}

async function handleSaveReplies(
  request: Request,
  { userId }: AIProtectionContext,
): Promise<Response> {
  const supabase = await createClient();

  const body = await request.json();
  const { replies, action = "save_draft" } = body as {
    replies: ReplyToSave[];
    action: "save_draft" | "publish_all";
  };

  if (!replies || !Array.isArray(replies) || replies.length === 0) {
    return NextResponse.json({ error: "No replies provided" }, { status: 400 });
  }

  const savedReplies: string[] = [];
  const errors: string[] = [];

  for (const reply of replies) {
    try {
      // Get the review to update
      const { data: review, error: fetchError } = await supabase
        .from("gmb_reviews")
        .select("id, review_id, location_id")
        .eq("review_id", reply.reviewId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !review) {
        errors.push(`Review ${reply.reviewId} not found`);
        continue;
      }

      if (action === "save_draft") {
        // Save as draft reply
        const { error: upsertError } = await supabase
          .from("review_reply_drafts")
          .upsert(
            {
              user_id: userId,
              review_id: review.id,
              gmb_review_id: reply.reviewId,
              location_id: review.location_id,
              draft_reply: reply.suggestedReply,
              ai_confidence: reply.confidence || 0,
              status: "draft",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "review_id",
            },
          );

        if (upsertError) {
          apiLogger.error(
            "[Save Replies] Error saving draft",
            upsertError instanceof Error
              ? upsertError
              : new Error(String(upsertError)),
            { userId, reviewId: reply.reviewId },
          );
          errors.push(`Failed to save draft for ${reply.reviewId}`);
        } else {
          savedReplies.push(reply.reviewId);
        }
      } else if (action === "publish_all") {
        // TODO: Implement Google My Business API call to publish reply
        // For now, just mark as published in our DB
        const { error: updateError } = await supabase
          .from("gmb_reviews")
          .update({
            has_reply: true,
            reply_text: reply.suggestedReply,
            reply_date: new Date().toISOString(),
          })
          .eq("id", review.id)
          .eq("user_id", userId);

        if (updateError) {
          errors.push(`Failed to publish reply for ${reply.reviewId}`);
        } else {
          savedReplies.push(reply.reviewId);

          // Log AI action
          await supabase.from("ai_actions").insert({
            user_id: userId,
            action_type: "review_reply",
            location_id: review.location_id,
            target_id: review.id,
            content: reply.suggestedReply,
            status: "completed",
            created_at: new Date().toISOString(),
          });
        }
      }
    } catch (err) {
      apiLogger.error(
        "[Save Replies] Error processing reply",
        err instanceof Error ? err : new Error(String(err)),
        { userId, reviewId: reply.reviewId },
      );
      errors.push(`Error processing ${reply.reviewId}`);
    }
  }

  return NextResponse.json({
    success: errors.length === 0,
    saved: savedReplies.length,
    failed: errors.length,
    savedReviewIds: savedReplies,
    errors: errors.length > 0 ? errors : undefined,
    message:
      action === "save_draft"
        ? `تم حفظ ${savedReplies.length} رد كمسودة`
        : `تم نشر ${savedReplies.length} رد`,
  });
}

export const POST = withAIProtection(handleSaveReplies, {
  endpointType: "generate",
});
