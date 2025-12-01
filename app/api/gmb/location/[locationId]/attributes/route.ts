import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/gmb/helpers";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const GBP_LOC_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1";

// GET - Fetch location attributes
export async function GET(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { locationId } = params;

    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*, gmb_accounts(id, is_active)")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return errorResponse("NOT_FOUND", "Location not found", 404);
    }

    // Check if the location belongs to an active account
    const account = location.gmb_accounts as any;
    if (!account?.is_active) {
      return errorResponse(
        "FORBIDDEN",
        "Cannot access attributes for inactive accounts",
        403,
      );
    }

    const accountId = location.gmb_account_id;
    const locationResource = location.location_id;

    const accessToken = await getValidAccessToken(supabase, accountId);

    // Note: In Google Business Profile API v1, attributes are part of the location object itself,
    // not a separate endpoint. We fetch the location with attributes in readMask.
    const url = new URL(`${GBP_LOC_BASE}/${locationResource}`);
    url.searchParams.set("readMask", "attributes");

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      gmbLogger.error(
        "Failed to fetch attributes from location",
        new Error(`HTTP ${response.status}`),
        {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: url.toString(),
          locationId,
          accountId,
        },
      );
      return errorResponse(
        "API_ERROR",
        errorData.error?.message || "Failed to fetch attributes from Google",
        response.status,
        errorData,
      );
    }

    const locationData = await response.json();
    // Attributes are included in the location object
    return successResponse({
      attributes: locationData.attributes || [],
    });
  } catch (error: any) {
    gmbLogger.error(
      "Attributes API error (fetch location attributes)",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    return errorResponse(
      "INTERNAL_ERROR",
      error.message || "Failed to fetch attributes",
      500,
    );
  }
}

// PATCH - Update location attributes
export async function PATCH(
  request: NextRequest,
  { params }: { params: { locationId: string } },
) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const { locationId } = params;
    const body = await request.json();
    const { attributeMask, attributes } = body;

    if (!attributeMask || !attributes) {
      return errorResponse(
        "MISSING_FIELDS",
        "attributeMask and attributes are required",
        400,
      );
    }

    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("*, gmb_accounts(id, is_active)")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      return errorResponse("NOT_FOUND", "Location not found", 404);
    }

    // Check if the location belongs to an active account
    const account = location.gmb_accounts as any;
    if (!account?.is_active) {
      return errorResponse(
        "FORBIDDEN",
        "Cannot update attributes for inactive accounts",
        403,
      );
    }

    const accountId = location.gmb_account_id;
    const locationResource = location.location_id;

    const accessToken = await getValidAccessToken(supabase, accountId);

    const url = new URL(`${GBP_LOC_BASE}/${locationResource}/attributes`);
    url.searchParams.set("attributeMask", attributeMask);

    const response = await fetch(url.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `${locationResource}/attributes`,
        attributes,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return errorResponse(
        "API_ERROR",
        errorData.error?.message || "Failed to update attributes on Google",
        response.status,
        errorData,
      );
    }

    const data = await response.json();
    return successResponse({ attributes: data });
  } catch (error: any) {
    gmbLogger.error(
      "Attributes update API error",
      error instanceof Error ? error : new Error(String(error)),
      { locationId: params.locationId },
    );
    return errorResponse(
      "INTERNAL_ERROR",
      error.message || "Failed to update attributes",
      500,
    );
  }
}
