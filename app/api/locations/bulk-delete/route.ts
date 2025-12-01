// Bulk Delete Locations API
// Soft deletes multiple locations (sets is_active = false)

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Bulk Delete Handler
 * Soft deletes multiple locations after verifying ownership
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // ✅ SECURITY: Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required. Please log in again.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    // ✅ SECURITY: Rate limiting (stricter for bulk operations)
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retry_after: rateLimitHeaders["X-RateLimit-Reset"],
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit,
        },
      );
    }

    // Parse request body
    const body = await request.json().catch(() => {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must be valid JSON",
          code: "INVALID_JSON",
        },
        { status: 400 },
      );
    });

    if (body instanceof NextResponse) {
      return body; // Return error response from JSON parse
    }

    const { locationIds } = body;

    // ✅ SECURITY: Input validation
    if (!Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json(
        {
          error: "Invalid input",
          message: "locationIds must be a non-empty array",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Limit bulk operations to prevent abuse
    if (locationIds.length > 100) {
      return NextResponse.json(
        {
          error: "Too many locations",
          message: "Maximum 100 locations allowed per bulk operation",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Validate location IDs format (UUIDs)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (
      !locationIds.every((id) => typeof id === "string" && uuidRegex.test(id))
    ) {
      return NextResponse.json(
        {
          error: "Invalid location IDs",
          message: "All location IDs must be valid UUIDs",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Verify all locations belong to the user
    const { data: userLocations, error: locationsError } = await supabase
      .from("gmb_locations")
      .select("id, location_name")
      .eq("user_id", user.id)
      .in("id", locationIds)
      .eq("is_active", true); // Only delete active locations

    if (locationsError) {
      apiLogger.error(
        "[POST /api/locations/bulk-delete] DB Error",
        locationsError instanceof Error
          ? locationsError
          : new Error(String(locationsError)),
        {
          code: (locationsError as any)?.code,
          userId: user.id,
          timestamp: new Date().toISOString(),
        },
      );
      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to verify location ownership",
        },
        { status: 500 },
      );
    }

    if (!userLocations || userLocations.length === 0) {
      return NextResponse.json(
        { error: "Not found", message: "No valid locations found to delete" },
        { status: 404 },
      );
    }

    // Check if all requested locations were found
    const foundLocationIds = userLocations.map((loc) => loc.id);
    const notFoundIds = locationIds.filter(
      (id) => !foundLocationIds.includes(id),
    );

    if (notFoundIds.length > 0 && notFoundIds.length === locationIds.length) {
      return NextResponse.json(
        {
          error: "Not found",
          message:
            "None of the requested locations belong to you or are already deleted",
        },
        { status: 404 },
      );
    }

    // Perform soft delete (set is_active = false)
    const { error: deleteError, count } = await supabase
      .from("gmb_locations")
      .update({ is_active: false })
      .eq("user_id", user.id)
      .in("id", foundLocationIds);

    if (deleteError) {
      apiLogger.error(
        "[POST /api/locations/bulk-delete] Delete Error",
        deleteError instanceof Error
          ? deleteError
          : new Error(String(deleteError)),
        {
          code: (deleteError as any)?.code,
          userId: user.id,
          locationIds: foundLocationIds,
          timestamp: new Date().toISOString(),
        },
      );
      return NextResponse.json(
        { error: "Database error", message: "Failed to delete locations" },
        { status: 500 },
      );
    }

    // Convert headers object to Record<string, string>
    const responseHeaders: Record<string, string> = {};
    if (rateLimitHeaders) {
      Object.entries(rateLimitHeaders).forEach(([key, value]) => {
        if (typeof value === "string") {
          responseHeaders[key] = value;
        }
      });
    }

    // Return success with details
    return NextResponse.json(
      {
        success: true,
        deleted: foundLocationIds.length,
        requested: locationIds.length,
        notFound: notFoundIds.length,
        message: `Successfully deleted ${foundLocationIds.length} ${foundLocationIds.length === 1 ? "location" : "locations"}`,
        ...(notFoundIds.length > 0 && {
          warning: `${notFoundIds.length} location(s) were not found or already deleted`,
        }),
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error: any) {
    apiLogger.error(
      "[POST /api/locations/bulk-delete] Unexpected error",
      error instanceof Error ? error : new Error(String(error)),
      { timestamp: new Date().toISOString() },
    );

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to delete locations. Please try again later.",
      },
      { status: 500 },
    );
  }
}
