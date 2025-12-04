/**
 * 🧠 PROACTIVE GREETING API
 *
 * GET /api/ai/proactive
 * Returns the smart AI greeting with insights
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateProactiveGreeting } from "@/lib/services/ai-proactive-service";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Get locationId from query params (optional)
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") || undefined;

    // Generate proactive greeting
    const greeting = await generateProactiveGreeting(user.id, locationId);

    return NextResponse.json({
      success: true,
      data: greeting,
    });
  } catch (error) {
    console.error("Proactive API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
