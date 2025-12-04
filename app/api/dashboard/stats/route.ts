import { NextRequest, NextResponse } from "next/server";
import { getDashboardStats } from "@/server/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * Dashboard Stats API
 * Returns basic dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Get dashboard stats
    const stats = await getDashboardStats();

    return NextResponse.json(stats);
  } catch (error) {
    apiLogger.error(
      "Dashboard stats error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
