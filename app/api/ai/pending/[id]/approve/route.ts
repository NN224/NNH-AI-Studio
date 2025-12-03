/**
 * ✅ APPROVE ACTION API
 *
 * POST /api/ai/pending/[id]/approve
 * Approves a pending action and publishes to Google
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { approveAction } from "@/lib/services/pending-actions-service";

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

    // Approve the action
    const result = await approveAction(actionId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      publishedTo: result.publishedTo,
      message: "Action approved and published",
    });
  } catch (error) {
    console.error("Approve Action API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
