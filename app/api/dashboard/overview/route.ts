import { NextRequest, NextResponse } from "next/server";
import { getCachedDashboardData } from "@/server/actions/dashboard";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * Dashboard Overview API
 * Returns comprehensive dashboard snapshot data
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

    // Get cached dashboard data
    const result = await getCachedDashboardData(user.id);

    return NextResponse.json(result.data);
  } catch (error) {
    apiLogger.error(
      "Dashboard overview error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
