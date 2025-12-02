import { getValidAccessToken } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import { gmbLogger } from "@/lib/utils/logger";
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

    const accountId = location.gmb_account_id;
    const _accountResource = `accounts/${location.gmb_accounts.account_id}`;
    const locationResource = location.location_id; // Already in format: locations/{id}

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

    const locationData = await response.json();

    // Extract attributes from location data (attributes are included in location object via readMask)
    // Note: In Google Business Profile API v1, attributes are part of the location object, not a separate endpoint
    const attributes: Array<Record<string, unknown>> =
      locationData.attributes || [];

    // Get Google-updated information if available
    let googleUpdated: Record<string, unknown> | null = null;
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
        googleUpdated = googleUpdatedData;
      }
    } catch (error) {
      gmbLogger.warn(
        "[Location Details API] Failed to get Google-updated info",
        {
          error,
          locationId,
        },
      );
    }

    return NextResponse.json({
      location: locationData,
      attributes,
      googleUpdated,
      gmb_account_id: location.gmb_account_id, // Include accountId for sync operations
    });
  } catch (error: unknown) {
    gmbLogger.error(
      "[Location Details API] Error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
