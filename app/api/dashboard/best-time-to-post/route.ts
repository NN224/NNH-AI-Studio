import { getBestTimeToPost } from "@/app/[locale]/(dashboard)/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard/best-time-to-post
 * Returns the best time to post based on historical data
 */
export async function GET(request: NextRequest) {
  try {
    const result = await getBestTimeToPost();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    apiLogger.error(
      "[Best Time to Post] Error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to calculate best time",
        data: { hour: 15, minute: 0, confidence: "low" as const },
      },
      { status: 500 },
    );
  }
}
