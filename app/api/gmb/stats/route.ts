import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/gmb/stats
 * Returns the total count of GMB data in the database
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get counts from database
    const [
      { count: locationsCount },
      { count: reviewsCount },
      { count: questionsCount },
      { count: mediaCount },
    ] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_media")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

    return NextResponse.json({
      locations: locationsCount || 0,
      reviews: reviewsCount || 0,
      questions: questionsCount || 0,
      media: mediaCount || 0,
    });
  } catch (error) {
    gmbLogger.error(
      "Failed to fetch GMB stats",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    );
  }
}
