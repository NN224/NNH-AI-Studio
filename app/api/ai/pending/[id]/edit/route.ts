/**
 * ✏️ EDIT AND APPROVE ACTION API
 *
 * POST /api/ai/pending/[id]/edit
 * Edits content and then approves/publishes
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editAndApproveAction } from "@/lib/services/pending-actions-service";

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

    // Get edited content from body
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { success: false, error: "Content is required" },
        { status: 400 },
      );
    }

    // Edit and approve the action
    const result = await editAndApproveAction(actionId, user.id, content);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      publishedTo: result.publishedTo,
      message: "Action edited and published",
    });
  } catch (error) {
    console.error("Edit Action API Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
