/**
 * 🎛️ COMMAND CENTER API
 *
 * GET /api/ai/command-center
 * Returns all data needed for the Command Center page
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCommandCenterData } from "@/lib/services/command-center-service";

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

    // Get all command center data
    const data = await getCommandCenterData(user.id, locationId);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Command Center API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
