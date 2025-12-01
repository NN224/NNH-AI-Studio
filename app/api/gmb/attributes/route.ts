import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, successResponse } from "@/lib/utils/api-response";
import { getValidAccessToken, GMB_CONSTANTS } from "@/lib/gmb/helpers";
import { gmbLogger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

const BUSINESS_INFORMATION_BASE = GMB_CONSTANTS.BUSINESS_INFORMATION_BASE;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const searchParams = request.nextUrl.searchParams;
    const locationId = searchParams.get("locationId");
    const categoryName = searchParams.get("categoryName");
    const regionCode =
      searchParams.get("regionCode") || searchParams.get("country") || "US";
    const languageCode = searchParams.get("languageCode") || "en";
    const showAll = searchParams.get("showAll") === "true";
    const pageSize = searchParams.get("pageSize") || "200";
    const pageToken = searchParams.get("pageToken");

    // Validate: need either locationId, categoryName, or showAll
    if (!locationId && !categoryName && !showAll) {
      return errorResponse(
        "BAD_REQUEST",
        "Either locationId, categoryName, or showAll=true is required",
        400,
      );
    }

    // Get active GMB account
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (accountError) {
      gmbLogger.error(
        "Failed to load Google account for attributes",
        accountError instanceof Error
          ? accountError
          : new Error(String(accountError)),
        { userId: user.id },
      );
      return errorResponse(
        "DATABASE_ERROR",
        "Failed to load Google account",
        500,
        accountError,
      );
    }

    if (!account) {
      return successResponse({
        attributeMetadata: [],
        message: "No active Google account connected",
      });
    }

    const accessToken = await getValidAccessToken(supabase, account.id);

    // Build the correct attributes.list endpoint
    const url = new URL(`${BUSINESS_INFORMATION_BASE}/attributes`);

    // Option 1: Get attributes for specific location
    if (locationId) {
      // Get location resource name from database
      const { data: location } = await supabase
        .from("gmb_locations")
        .select("location_id")
        .eq("id", locationId)
        .eq("user_id", user.id)
        .single();

      if (location?.location_id) {
        url.searchParams.set("parent", location.location_id);
      }
    }

    // Option 2: Get attributes for category
    if (categoryName && !locationId) {
      // Ensure category name is in format: categories/{category_id}
      const formattedCategory = categoryName.startsWith("categories/")
        ? categoryName
        : `categories/${categoryName}`;
      url.searchParams.set("categoryName", formattedCategory);
    }

    // Option 3: Get all attributes
    if (showAll) {
      url.searchParams.set("showAll", "true");
    }

    // Required parameters when not using parent
    if (!locationId) {
      url.searchParams.set("regionCode", regionCode);
      url.searchParams.set("languageCode", languageCode);
    }

    // Pagination
    url.searchParams.set("pageSize", pageSize);
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    console.log("[Attributes API] Fetching from:", url.toString());

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorData: any = {};
      try {
        errorData = errorText ? JSON.parse(errorText) : {};
      } catch {
        errorData = { message: errorText };
      }

      gmbLogger.error(
        "Attributes API Google response error",
        new Error(`HTTP ${response.status}`),
        {
          status: response.status,
          errorData,
          url: url.toString(),
        },
      );

      if (response.status === 404) {
        return successResponse({
          attributeMetadata: [],
          message: "No attributes found for the specified parameters",
        });
      }

      if (response.status === 401) {
        return errorResponse(
          "AUTH_EXPIRED",
          "Authentication expired. Please reconnect your Google account.",
          401,
          errorData,
        );
      }

      return errorResponse(
        "GOOGLE_API_ERROR",
        errorData.error?.message ||
          errorData.message ||
          "Failed to fetch attributes",
        response.status,
        errorData,
      );
    }

    const data = await response.json();
    const attributeMetadata = Array.isArray(data.attributeMetadata)
      ? data.attributeMetadata
      : [];

    console.log(
      `[Attributes API] Successfully fetched ${attributeMetadata.length} attributes`,
    );

    return successResponse({
      attributeMetadata,
      nextPageToken: data.nextPageToken || null,
      totalCount: attributeMetadata.length,
    });
  } catch (error: any) {
    gmbLogger.error(
      "Attributes API error",
      error instanceof Error ? error : new Error(String(error)),
    );

    return errorResponse(
      "INTERNAL_ERROR",
      error?.message || "Failed to fetch attributes",
      500,
    );
  }
}
