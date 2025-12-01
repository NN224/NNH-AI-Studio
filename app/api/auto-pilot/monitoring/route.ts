import { createClient } from "@/lib/supabase/server";
import { aiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auto-pilot/monitoring
 * Returns auto-reply monitoring statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get today's replies (reviews with replies sent today)
    const { data: todayReplies } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .gte("replied_at", startOfToday.toISOString());

    // Also get replies where replied_at is null but updated_at is today
    const { data: todayRepliesAlt } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .is("replied_at", null)
      .gte("updated_at", startOfToday.toISOString());

    const allTodayReplies = [
      ...(todayReplies || []),
      ...(todayRepliesAlt || []),
    ];

    // Get this week's replies
    const { data: weekReplies } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .gte("replied_at", startOfWeek.toISOString());

    const { data: weekRepliesAlt } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .is("replied_at", null)
      .gte("updated_at", startOfWeek.toISOString());

    const allWeekReplies = [...(weekReplies || []), ...(weekRepliesAlt || [])];

    // Get this month's replies
    const { data: monthReplies } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .gte("replied_at", startOfMonth.toISOString());

    const { data: monthRepliesAlt } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, replied_at, updated_at, has_reply, reply_text, created_at",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .is("replied_at", null)
      .gte("updated_at", startOfMonth.toISOString());

    const allMonthReplies = [
      ...(monthReplies || []),
      ...(monthRepliesAlt || []),
    ];

    // Calculate today's stats
    const todayTotal = allTodayReplies.length;
    const todaySuccess = todayTotal; // Assume all replies are successful (we can enhance this later with error tracking)
    const todayFailed = 0; // We'll track this when we add error logging

    // Calculate average response time (simplified - using time between review creation and reply)
    let totalResponseTime = 0;
    let responseTimeCount = 0;

    if (allTodayReplies.length > 0) {
      allTodayReplies.forEach((review) => {
        if (review.created_at) {
          const replyTime = review.replied_at
            ? new Date(review.replied_at).getTime()
            : new Date(review.updated_at).getTime();
          const reviewTime = new Date(review.created_at).getTime();
          const responseTime = (replyTime - reviewTime) / 1000; // in seconds
          if (responseTime > 0 && responseTime < 86400) {
            // Less than 24 hours
            totalResponseTime += responseTime;
            responseTimeCount++;
          }
        }
      });
    }

    const avgResponseTime =
      responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;

    // Calculate weekly and monthly stats
    const weekTotal = allWeekReplies.length;
    const weekSuccess = weekTotal;
    const weekFailed = 0;

    const monthTotal = allMonthReplies.length;
    const monthSuccess = monthTotal;
    const monthFailed = 0;

    // Get daily stats for last 7 days
    const dailyStats: Array<{ date: string; success: number; failed: number }> =
      [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);

      const { count: dayCount1 } = await supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("has_reply", true)
        .not("reply_text", "is", null)
        .gte("replied_at", dayStart.toISOString())
        .lt("replied_at", dayEnd.toISOString());

      const { count: dayCount2 } = await supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("has_reply", true)
        .not("reply_text", "is", null)
        .is("replied_at", null)
        .gte("updated_at", dayStart.toISOString())
        .lt("updated_at", dayEnd.toISOString());

      const dayCount = (dayCount1 || 0) + (dayCount2 || 0);

      dailyStats.push({
        date: dayStart.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        success: dayCount || 0,
        failed: 0,
      });
    }

    // Get recent replies (last 10)
    const { data: recentReplies } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, created_at, replied_at, updated_at, has_reply, reply_text",
      )
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .order("replied_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(10);

    const formattedRecentReplies = (recentReplies || []).map((reply) => {
      const replyTime = reply.replied_at
        ? new Date(reply.replied_at).getTime()
        : new Date(reply.updated_at).getTime();
      const reviewTime = new Date(reply.created_at).getTime();
      const responseTime = (replyTime - reviewTime) / 1000; // in seconds

      return {
        id: reply.id,
        reviewId: reply.id,
        rating: reply.rating || 5,
        success: true, // Assume success for now
        responseTime: responseTime > 0 ? responseTime : 0,
        createdAt: reply.replied_at || reply.updated_at || reply.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        today: {
          total: todayTotal,
          success: todaySuccess,
          failed: todayFailed,
          avgResponseTime,
        },
        thisWeek: {
          total: weekTotal,
          success: weekSuccess,
          failed: weekFailed,
        },
        thisMonth: {
          total: monthTotal,
          success: monthSuccess,
          failed: monthFailed,
        },
        recentReplies: formattedRecentReplies,
        dailyStats,
      },
    });
  } catch (error) {
    aiLogger.error(
      "[Auto-Reply Monitoring] Error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch monitoring stats",
      },
      { status: 500 },
    );
  }
}
