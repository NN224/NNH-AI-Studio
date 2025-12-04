/**
 * 🏆 COMPETITOR MANAGEMENT API
 *
 * DELETE /api/ai/competitors/[id] - Remove competitor from tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { removeCompetitor } from "@/lib/services/competitor-service";

/**
 * DELETE - Remove competitor from tracking
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    // Check auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const competitorId = params.id;

    const result = await removeCompetitor(competitorId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Competitor removed successfully",
    });
  } catch (error) {
    console.error("Error in competitor DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
