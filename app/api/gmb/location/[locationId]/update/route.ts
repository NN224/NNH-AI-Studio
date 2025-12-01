import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/gmb/helpers";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const GBP_LOC_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

export async function PATCH(
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

    // Get request body
    const body = await request.json();
    const { updateMask, location, validateOnly = false } = body;

    if (!updateMask || !location) {
      return NextResponse.json(
        { error: "updateMask and location are required" },
        { status: 400 },
      );
    }

    // Get location from database
    const { data: dbLocation, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*, gmb_accounts(id, account_id)")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !dbLocation) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    const accountId = dbLocation.gmb_account_id;
    const locationResource = dbLocation.location_id; // Already in format: locations/{id}

    // Get valid access token
    const accessToken = await getValidAccessToken(supabase, accountId);

    // Update location using Business Information API
    const url = new URL(`${GBP_LOC_BASE}/${locationResource}`);
    url.searchParams.set("updateMask", updateMask);
    if (validateOnly) {
      url.searchParams.set("validateOnly", "true");
    }

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(location),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: "Failed to update location", details: errorData },
        { status: response.status },
      );
    }

    const updatedLocation = await response.json();

    // Update location in database with new metadata
    await supabase
      .from("gmb_locations")
      .update({
        location_name: updatedLocation.title || dbLocation.location_name,
        address: updatedLocation.storefrontAddress
          ? `${(updatedLocation.storefrontAddress.addressLines || []).join(", ")}${
              updatedLocation.storefrontAddress.locality
                ? `, ${updatedLocation.storefrontAddress.locality}`
                : ""
            }${updatedLocation.storefrontAddress.administrativeArea ? `, ${updatedLocation.storefrontAddress.administrativeArea}` : ""}${
              updatedLocation.storefrontAddress.postalCode
                ? ` ${updatedLocation.storefrontAddress.postalCode}`
                : ""
            }`
          : dbLocation.address,
        phone: updatedLocation.phoneNumbers?.primaryPhone || dbLocation.phone,
        website: updatedLocation.websiteUri || dbLocation.website,
        category:
          updatedLocation.categories?.primaryCategory?.displayName ||
          dbLocation.category,
        metadata: {
          ...((dbLocation.metadata as any) || {}),
          ...updatedLocation,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId);

    return NextResponse.json({
      success: true,
      location: updatedLocation,
    });
  } catch (error: any) {
    gmbLogger.error(
      "[Location Update API] Error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
