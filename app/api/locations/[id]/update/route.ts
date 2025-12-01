import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const locationId = params.id;
    const body = await request.json();

    // Verify user owns this location
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("id, user_id")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found or access denied" },
        { status: 404 },
      );
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    // Basic info
    if (body.name !== undefined) {
      if (body.name.trim().length < 3) {
        return NextResponse.json(
          { error: "Name must be at least 3 characters" },
          { status: 400 },
        );
      }
      updates.location_name = body.name;
      updates.title = body.name;
    }

    if (body.description !== undefined) {
      updates.description = body.description;
    }

    if (body.category !== undefined) {
      updates.primary_category = body.category;
      updates.category = body.category;
    }

    // Contact info
    if (body.phone !== undefined) {
      updates.phone = body.phone;
    }

    if (body.website !== undefined) {
      updates.website = body.website;
    }

    if (body.email !== undefined) {
      updates.email = body.email;
    }

    // Address
    if (body.address !== undefined) {
      const addr = body.address;
      updates.address = {
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        addressLines: [addr.street],
        locality: addr.city,
        administrativeArea: addr.state,
        postalCode: addr.zip,
        regionCode: addr.country,
      };
    }

    // Social Media Links
    if (body.social !== undefined) {
      updates.social = body.social;
    }

    // Attributes
    if (body.attributes !== undefined) {
      updates.attributes = body.attributes;
    }

    // Update in Supabase
    const { data: updatedLocation, error: updateError } = await supabase
      .from("gmb_locations")
      .update(updates)
      .eq("id", locationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      apiLogger.error(
        "[Update Location] DB Error",
        updateError instanceof Error
          ? updateError
          : new Error(String(updateError)),
        { locationId, userId: user.id },
      );
      return NextResponse.json(
        { error: "Failed to update location" },
        { status: 500 },
      );
    }

    // TODO: Sync with Google Business Profile API (Phase 2)
    // await updateGoogleBusinessProfile(locationId, updates);

    return NextResponse.json(updatedLocation);
  } catch (error) {
    apiLogger.error(
      "[Update Location] Error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.id },
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
