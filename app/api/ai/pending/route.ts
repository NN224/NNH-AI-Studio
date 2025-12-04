/**
 * 📋 PENDING ACTIONS API
 *
 * GET /api/ai/pending
 * Returns list of pending AI actions
 */

import { NextRequest, NextResponse } from "next/server";

// Force dynamic rendering (uses cookies for auth)
export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import {
  getPendingActions,
  getPendingActionsCounts,
  type ActionType,
  type ActionStatus,
} from "@/lib/services/pending-actions-service";

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

    // Get query params
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("locationId") || undefined;
    const actionType = searchParams.get("type") as ActionType | undefined;
    const status = searchParams.get("status") as ActionStatus | undefined;
    const requiresAttention =
      searchParams.get("attention") === "true" ? true : undefined;

    // Get pending actions
    const actions = await getPendingActions(user.id, {
      locationId,
      actionType,
      status,
      requiresAttention,
    });

    // Get counts
    const counts = await getPendingActionsCounts(user.id, locationId);

    return NextResponse.json({
      success: true,
      data: {
        actions,
        counts,
      },
    });
  } catch (error) {
    console.error("Pending Actions API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
