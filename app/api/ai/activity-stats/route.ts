/**
 * AI Activity Stats API
 * Returns statistics about AI actions (auto-replies, generated content, etc.)
 *
 * GET /api/ai/activity-stats
 * Returns: { actionsToday, lastActionAt, reviewsReplied, questionsAnswered, postsGenerated }
 */

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        actionsToday: 0,
        lastActionAt: null,
        reviewsReplied: 0,
        questionsAnswered: 0,
        postsGenerated: 0,
      });
    }

    // Get today's date range
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Query ai_actions table for today's stats
    // Note: This table may not exist yet - we'll return defaults if it doesn't
    const { data: aiActions, error } = await supabase
      .from("ai_actions")
      .select("*")
      .eq("user_id", user.id)
      .gte("created_at", todayStart.toISOString())
      .lte("created_at", todayEnd.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      // Table might not exist - return defaults
      apiLogger.warn("[AI Activity Stats] Error querying ai_actions", {
        message: error.message,
      });
      return NextResponse.json({
        actionsToday: 0,
        lastActionAt: null,
        reviewsReplied: 0,
        questionsAnswered: 0,
        postsGenerated: 0,
      });
    }

    // Calculate stats
    const reviewsReplied =
      aiActions?.filter((a) => a.action_type === "review_reply").length ?? 0;
    const questionsAnswered =
      aiActions?.filter((a) => a.action_type === "question_answer").length ?? 0;
    const postsGenerated =
      aiActions?.filter((a) => a.action_type === "post_generate").length ?? 0;

    const actionsToday = aiActions?.length ?? 0;
    const lastActionAt = aiActions?.[0]?.created_at ?? null;

    return NextResponse.json({
      actionsToday,
      lastActionAt,
      reviewsReplied,
      questionsAnswered,
      postsGenerated,
    });
  } catch (error) {
    apiLogger.error(
      "[AI Activity Stats] Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({
      actionsToday: 0,
      lastActionAt: null,
      reviewsReplied: 0,
      questionsAnswered: 0,
      postsGenerated: 0,
    });
  }
}
