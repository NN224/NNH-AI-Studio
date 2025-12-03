/**
 * ❌ REJECT ACTION API
 *
 * POST /api/ai/pending/[id]/reject
 * Rejects a pending action
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rejectAction } from "@/lib/services/pending-actions-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const actionId = params.id;

    if (!actionId) {
      return NextResponse.json(
        { success: false, error: "Action ID required" },
        { status: 400 },
      );
    }

    // Get reason from body (optional)
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // No body provided, that's okay
    }

    // Reject the action
    const result = await rejectAction(actionId, user.id, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Action rejected",
    });
  } catch (error) {
    console.error("Reject Action API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
