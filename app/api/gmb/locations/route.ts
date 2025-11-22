import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function normalizeMetadata(rawMetadata: unknown) {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === "string") {
    try {
      return JSON.parse(rawMetadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof rawMetadata === "object") {
    return { ...(rawMetadata as Record<string, unknown>) };
  }

  return {};
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: locations, error: locationsError } = await supabase
    .from("gmb_locations")
    .select("*, gmb_accounts!inner(is_active)")
    .eq("user_id", user.id)
    .eq("gmb_accounts.is_active", true);

  if (locationsError) {
    console.error(
      "[GET /api/gmb/locations] Failed to fetch locations",
      locationsError,
    );
    return NextResponse.json(
      { error: "Failed to load locations" },
      { status: 500 },
    );
  }

  if (!locations || locations.length === 0) {
    return NextResponse.json({ locations: [] });
  }

  const locationIds = locations.map((loc) => loc.id);

  const [pendingReviewsResult, pendingQuestionsResult] = await Promise.all([
    supabase
      .from("gmb_reviews")
      .select("location_id, has_reply")
      .in("location_id", locationIds)
      .or("has_reply.eq.false,has_reply.is.null"),
    supabase
      .from("gmb_questions")
      .select("location_id, answer_status")
      .in("location_id", locationIds)
      .in("answer_status", ["pending", "unanswered"]),
  ]);

  if (pendingReviewsResult.error) {
    console.error(
      "[GET /api/gmb/locations] Failed to load pending reviews",
      pendingReviewsResult.error,
    );
  }

  if (pendingQuestionsResult.error) {
    console.error(
      "[GET /api/gmb/locations] Failed to load pending questions",
      pendingQuestionsResult.error,
    );
  }

  const pendingReviewsMap = new Map<string, number>();
  const pendingQuestionsMap = new Map<string, number>();

  for (const review of pendingReviewsResult.data ?? []) {
    const locationId = review.location_id;
    if (!locationId) continue;
    pendingReviewsMap.set(
      locationId,
      (pendingReviewsMap.get(locationId) ?? 0) + 1,
    );
  }

  for (const question of pendingQuestionsResult.data ?? []) {
    const locationId = question.location_id;
    if (!locationId) continue;
    pendingQuestionsMap.set(
      locationId,
      (pendingQuestionsMap.get(locationId) ?? 0) + 1,
    );
  }

  const enriched = locations.map((location) => {
    const metadata = normalizeMetadata(location.metadata);

    metadata.pendingReviews = pendingReviewsMap.get(location.id) ?? 0;
    metadata.pendingQuestions = pendingQuestionsMap.get(location.id) ?? 0;
    metadata.responseRate ??= location.response_rate ?? null;
    metadata.last_sync ??=
      location.last_synced_at ?? location.updated_at ?? null;

    return {
      ...location,
      metadata,
    };
  });

  return NextResponse.json({
    locations: enriched,
  });
}
