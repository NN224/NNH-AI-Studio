/**
 * GMB Sync Counts API
 * Returns the count of synced items for an account
 */

import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get("accountId");

    if (!accountId) {
      return NextResponse.json(
        { error: "accountId required" },
        { status: 400 },
      );
    }

    // Get counts for all synced items
    const [
      { count: locationsCount },
      { count: reviewsCount },
      { count: postsCount },
      { count: questionsCount },
      { count: mediaCount },
    ] = await Promise.all([
      supabase
        .from("gmb_locations")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("gmb_account_id", accountId),
      supabase
        .from("gmb_reviews")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("gmb_account_id", accountId),
      supabase
        .from("gmb_posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("gmb_questions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("gmb_account_id", accountId),
      supabase
        .from("gmb_media")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("gmb_account_id", accountId),
    ]);

    return NextResponse.json({
      locationsCount: locationsCount || 0,
      reviewsCount: reviewsCount || 0,
      postsCount: postsCount || 0,
      questionsCount: questionsCount || 0,
      mediaCount: mediaCount || 0,
    });
  } catch (error) {
    gmbLogger.error(
      "Failed to fetch sync counts",
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
