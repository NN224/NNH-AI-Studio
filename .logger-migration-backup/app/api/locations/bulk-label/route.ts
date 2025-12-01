import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// POST - Apply labels to multiple locations
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

    const body = await request.json();
    const { locationIds, labelIds } = body;

    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        { error: "Location IDs array is required and must not be empty" },
        { status: 400 },
      );
    }

    if (!Array.isArray(labelIds) || labelIds.length === 0) {
      return NextResponse.json(
        { error: "Label IDs array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Verify all locations belong to the user
    const { data: locations, error: locationsError } = await supabase
      .from("gmb_locations")
      .select("id")
      .in("id", locationIds)
      .eq("user_id", user.id);

    if (locationsError) {
      console.error(
        "[POST /api/locations/bulk-label] Locations error:",
        locationsError,
      );
      return NextResponse.json(
        { error: "Failed to verify locations" },
        { status: 500 },
      );
    }

    if (!locations || locations.length !== locationIds.length) {
      return NextResponse.json(
        { error: "Some locations do not exist or do not belong to you" },
        { status: 403 },
      );
    }

    // Verify all labels belong to the user
    const { data: labels, error: labelsError } = await supabase
      .from("location_labels")
      .select("id")
      .in("id", labelIds)
      .eq("user_id", user.id);

    if (labelsError) {
      console.error(
        "[POST /api/locations/bulk-label] Labels error:",
        labelsError,
      );
      return NextResponse.json(
        { error: "Failed to verify labels" },
        { status: 500 },
      );
    }

    if (!labels || labels.length !== labelIds.length) {
      return NextResponse.json(
        { error: "Some labels do not exist or do not belong to you" },
        { status: 403 },
      );
    }

    // Create all location-label associations
    const associations = [];
    for (const locationId of locationIds) {
      for (const labelId of labelIds) {
        associations.push({
          location_id: locationId,
          label_id: labelId,
        });
      }
    }

    // Insert with upsert to handle duplicates gracefully
    const { error: insertError } = await supabase
      .from("location_to_labels")
      .upsert(associations, {
        onConflict: "location_id,label_id",
        ignoreDuplicates: true,
      });

    if (insertError) {
      console.error(
        "[POST /api/locations/bulk-label] Insert error:",
        insertError,
      );
      return NextResponse.json(
        { error: "Failed to apply labels" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      applied: associations.length,
      locations: locationIds.length,
      labels: labelIds.length,
    });
  } catch (error: any) {
    console.error("[POST /api/locations/bulk-label] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
