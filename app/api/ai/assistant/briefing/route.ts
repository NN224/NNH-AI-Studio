/**
 * 📊 AI DAILY BRIEFING API
 *
 * GET /api/ai/assistant/briefing
 *
 * Get today's AI briefing for the user
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateDailyBriefing } from "@/lib/services/ai-assistant-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Auth check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate or get today's briefing
    const result = await generateDailyBriefing(user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to generate briefing" },
        { status: 500 },
      );
    }

    // Mark as read
    if (result.briefing && !result.briefing.is_read) {
      await supabase
        .from("ai_daily_briefings")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", result.briefing.id);
    }

    return NextResponse.json({
      success: true,
      briefing: result.briefing,
    });
  } catch (error) {
    console.error("[AI Briefing] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
