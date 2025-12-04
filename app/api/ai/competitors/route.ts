/**
 * 🏆 COMPETITOR MONITORING API
 *
 * GET  /api/ai/competitors - Get competitor comparison
 * POST /api/ai/competitors - Add new competitor
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  compareWithCompetitors,
  addCompetitor,
  monitorCompetitors,
} from "@/lib/services/competitor-service";

/**
 * GET - Get competitor comparison data
 */
export async function GET(request: NextRequest) {
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

    // Get location_id from query params
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("location_id") || undefined;

    // Get comparison data
    const comparison = await compareWithCompetitors(user.id, locationId);

    // Get recent alerts
    const alerts = await monitorCompetitors(user.id, locationId);

    return NextResponse.json({
      success: true,
      comparison,
      alerts,
    });
  } catch (error) {
    console.error("Error in competitors GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST - Add new competitor to track
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { location_id, name, place_id, rating, total_reviews } = body;

    if (!location_id || !name || !place_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const result = await addCompetitor(user.id, location_id, {
      name,
      placeId: place_id,
      rating: rating || 0,
      totalReviews: total_reviews || 0,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Competitor added successfully",
    });
  } catch (error) {
    console.error("Error in competitors POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
