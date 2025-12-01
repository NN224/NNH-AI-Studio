import { createClient } from "@/lib/supabase/server";
import { aiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/auto-pilot/stats
 * Returns today's autopilot statistics (replies, questions, posts, time saved)
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

    // Get start of today (UTC)
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfTodayISO = startOfToday.toISOString();

    // 1. Count auto-replies today (reviews with replies sent today)
    const { count: repliesToday } = await supabase
      .from("gmb_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .gte("replied_at", startOfTodayISO);

    // If replied_at is null, check updated_at for reviews that got replies today
    const { count: repliesTodayAlt } = await supabase
      .from("gmb_reviews")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("has_reply", true)
      .not("reply_text", "is", null)
      .is("replied_at", null)
      .gte("updated_at", startOfTodayISO);

    const totalRepliesToday = (repliesToday || 0) + (repliesTodayAlt || 0);

    // 2. Count auto-answered questions today
    const { count: questionsToday } = await supabase
      .from("gmb_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("answer_text", "is", null)
      .gte("answered_at", startOfTodayISO);

    // If answered_at is null, check updated_at
    const { count: questionsTodayAlt } = await supabase
      .from("gmb_questions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("answer_text", "is", null)
      .is("answered_at", null)
      .gte("updated_at", startOfTodayISO);

    const totalQuestionsToday =
      (questionsToday || 0) + (questionsTodayAlt || 0);

    // 3. Count auto-generated posts today (from ai_requests with feature = 'content_generation')
    const { count: postsToday } = await supabase
      .from("ai_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("feature", "content_generation")
      .eq("success", true)
      .gte("created_at", startOfTodayISO);

    // 4. Calculate time saved (estimate: 3 min per reply, 2 min per question, 5 min per post)
    const timeSavedMinutes =
      totalRepliesToday * 3 + totalQuestionsToday * 2 + (postsToday || 0) * 5;

    // 5. Get autopilot settings status
    const { data: settings } = await supabase
      .from("auto_reply_settings")
      .select("enabled, require_approval")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if auto-reply is enabled (from settings or gmb_accounts)
    const { data: accountSettings } = await supabase
      .from("gmb_accounts")
      .select("settings")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    const accountSettingsData = (accountSettings as any)?.settings || {};
    const autoReplyEnabled =
      settings?.enabled || accountSettingsData.autoReplyEnabled || false;
    const autoAnswerEnabled = accountSettingsData.autoAnswerEnabled || false;
    const autoPostEnabled = accountSettingsData.autoPostEnabled || false;
    const autopilotEnabled = accountSettingsData.autopilotEnabled || false;

    return NextResponse.json({
      success: true,
      data: {
        enabled: autopilotEnabled,
        autoReplyEnabled,
        autoAnswerEnabled,
        autoPostEnabled,
        repliesToday: totalRepliesToday,
        questionsToday: totalQuestionsToday,
        postsToday: postsToday || 0,
        timeSavedMinutes,
      },
    });
  } catch (error) {
    aiLogger.error(
      "AutoPilot stats error",
      error instanceof Error ? error : new Error(String(error)),
      { requestId: request.headers.get("x-request-id") || undefined },
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch autopilot stats",
      },
      { status: 500 },
    );
  }
}
