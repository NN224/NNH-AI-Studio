import { getValidAccessToken } from "@/lib/gmb/helpers";
import { logAction } from "@/lib/monitoring/audit";
import { createClient } from "@/lib/supabase/server";
import {
  GoogleLocation,
  LocationAttribute,
  LocationDetailResponse,
  LocationUpdateRequest,
  LocationWithAccount,
} from "@/lib/types/location-detail-api";
import { apiLogger } from "@/lib/utils/logger";
import { locationUpdateSchema } from "@/lib/validations/schemas";
import { validateBody } from "@/middleware/validate-request";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GBP_LOC_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID required" },
        { status: 400 },
      );
    }

    // Get location from database
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*, gmb_accounts(id, account_id)")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    // Type check the location
    const typedLocation = location as unknown as LocationWithAccount;
    const accountId = typedLocation.gmb_account_id;
    // const accountResource = `accounts/${typedLocation.gmb_accounts.account_id}`; // Unused for now
    const locationResource = typedLocation.location_id; // Already in format: locations/{id}

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, accountId);

    // Fetch full location details with expanded readMask (includes attributes)
    const url = new URL(`${GBP_LOC_BASE}/${locationResource}`);
    const readMask =
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels,relationshipData,attributes";
    url.searchParams.set("readMask", readMask);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to fetch location details", details: errorData },
        { status: response.status },
      );
    }

    const locationData = (await response.json()) as GoogleLocation;

    // Extract attributes from location data (attributes are included in location object via readMask)
    // Note: In Google Business Profile API v1, attributes are part of the location object, not a separate endpoint
    const attributes: LocationAttribute[] = locationData.attributes || [];

    // Get Google-updated information if available
    let googleUpdated: GoogleLocation | null = null;
    try {
      const googleUpdatedUrl = new URL(
        `${GBP_LOC_BASE}/${locationResource}:getGoogleUpdated`,
      );
      googleUpdatedUrl.searchParams.set("readMask", readMask);
      const googleUpdatedResponse = await fetch(googleUpdatedUrl.toString(), {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (googleUpdatedResponse.ok) {
        const googleUpdatedData = await googleUpdatedResponse.json();
        googleUpdated = googleUpdatedData as GoogleLocation;
      }
    } catch (error) {
      apiLogger.warn(
        "[Location Details API] Failed to get Google-updated info",
        {
          locationId,
          error: String(error),
        },
      );
    }

    const locationResponse: LocationDetailResponse = {
      location: locationData,
      attributes,
      googleUpdated,
      gmb_account_id: typedLocation.gmb_account_id,
    };

    return NextResponse.json(locationResponse);
  } catch (error: unknown) {
    apiLogger.error(
      "[Location Details API] Error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID required" },
        { status: 400 },
      );
    }

    const bodyResult = await validateBody<LocationUpdateRequest>(
      request,
      locationUpdateSchema,
    );
    if (!bodyResult.success) {
      return bodyResult.response;
    }
    const payload = bodyResult.data;

    const updateData: Record<string, unknown> = {};

    if (payload.name !== undefined) {
      updateData.location_name = payload.name;
    }
    if (payload.address !== undefined) {
      updateData.address = payload.address;
    }
    if (payload.phone !== undefined) {
      updateData.phone = payload.phone;
    }
    if (payload.website !== undefined) {
      updateData.website = payload.website;
    }
    if (payload.category !== undefined) {
      updateData.category = payload.category;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        {
          error:
            "No valid fields provided. Expected one of: name, address, phone, website, category.",
        },
        { status: 400 },
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("gmb_locations")
      .update(updateData)
      .eq("id", locationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      apiLogger.error(
        "[PUT /api/locations/:id] Update error",
        error instanceof Error ? error : new Error(String(error)),
        { locationId, userId: user.id },
      );
      await logAction("location_update", "gmb_location", locationId, {
        status: "failed",
        reason: error.message,
      });
      return NextResponse.json(
        { error: "Failed to update location" },
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    await logAction("location_update", "gmb_location", locationId, {
      status: "success",
      changed_fields: Object.keys(updateData),
    });

    return NextResponse.json({
      data,
      message: "Location updated successfully",
    });
  } catch (error: unknown) {
    apiLogger.error(
      "[PUT /api/locations/:id] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    await logAction(
      "location_update",
      "gmb_location",
      params.locationId || null,
      {
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { locationId } = params;
    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID required" },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from("gmb_locations")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (error) {
      apiLogger.error(
        "[DELETE /api/locations/:id] Delete error",
        error instanceof Error ? error : new Error(String(error)),
        { locationId, userId: user.id },
      );
      await logAction("location_delete", "gmb_location", locationId, {
        status: "failed",
        reason: error.message,
      });
      return NextResponse.json(
        { error: "Failed to delete location" },
        { status: 500 },
      );
    }

    await logAction("location_delete", "gmb_location", locationId, {
      status: "success",
    });

    return NextResponse.json({
      success: true,
      message: "Location deleted successfully",
    });
  } catch (error: unknown) {
    apiLogger.error(
      "[DELETE /api/locations/:id] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    await logAction(
      "location_delete",
      "gmb_location",
      params.locationId || null,
      {
        status: "failed",
        reason: error instanceof Error ? error.message : String(error),
      },
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
