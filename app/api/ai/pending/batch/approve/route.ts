/**
 * ⚡ BATCH APPROVE API
 *
 * POST /api/ai/pending/batch/approve
 * Approves multiple pending actions at once
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { batchApprove } from "@/lib/services/pending-actions-service";

export async function POST(request: NextRequest) {
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

    // Get action IDs from body
    const body = await request.json();
    const { actionIds } = body;

    if (!actionIds || !Array.isArray(actionIds) || actionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Action IDs array is required" },
        { status: 400 },
      );
    }

    // Limit batch size
    if (actionIds.length > 50) {
      return NextResponse.json(
        { success: false, error: "Maximum 50 actions per batch" },
        { status: 400 },
      );
    }

    // Batch approve
    const result = await batchApprove(actionIds, user.id);

    return NextResponse.json({
      success: result.success,
      processed: result.processed,
      failed: result.failed,
      results: result.results,
      message: `Approved ${result.processed} actions${result.failed > 0 ? `, ${result.failed} failed` : ""}`,
    });
  } catch (error) {
    console.error("Batch Approve API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
