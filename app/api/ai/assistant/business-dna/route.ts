/**
 * 🧠 BUSINESS DNA API
 *
 * GET /api/ai/assistant/business-dna - Get existing DNA
 * POST /api/ai/assistant/business-dna - Build/refresh DNA
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildBusinessDNA,
  getBusinessDNA,
  generateBusinessSummary,
} from "@/lib/services/business-dna-service";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // DNA analysis can take time

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationId =
      request.nextUrl.searchParams.get("locationId") || undefined;

    const dna = await getBusinessDNA(user.id, locationId);

    if (!dna) {
      return NextResponse.json({
        success: true,
        dna: null,
        message: "No Business DNA found. Use POST to generate one.",
      });
    }

    return NextResponse.json({
      success: true,
      dna,
      summary: generateBusinessSummary(dna),
    });
  } catch (error) {
    console.error("[Business DNA GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const locationId = body.locationId || undefined;
    const forceRefresh = body.forceRefresh || false;

    const result = await buildBusinessDNA(user.id, locationId, {
      forceRefresh,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to build Business DNA" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      dna: result.dna,
      summary: result.dna ? generateBusinessSummary(result.dna) : null,
    });
  } catch (error) {
    console.error("[Business DNA POST] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
