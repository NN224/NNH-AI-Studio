import { PAGINATION, VALIDATION } from "@/lib/config/constants";
import { logAction } from "@/lib/monitoring/audit";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { addCoordinatesToLocations } from "@/lib/utils/location-coordinates";
import { applySafeSearchFilter } from "@/lib/utils/secure-search";
import { NextRequest, NextResponse } from "next/server";

interface LocationData {
  status?: string;
  category?: string;
}

interface LocationUpdateData {
  location_name?: string;
  address?: string;
  phone?: string | null;
  website?: string | null;
  category?: string;
  updated_at?: string;
}

export const dynamic = "force-dynamic";

// GET - Fetch locations with filters
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

    // ✅ SECURITY: Rate limiting
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

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");
    const sortOrder = searchParams.get("sortOrder") || "asc";

    // Input validation using centralized constants
    const page = Math.max(
      PAGINATION.DEFAULT_PAGE,
      parseInt(searchParams.get("page") || String(PAGINATION.DEFAULT_PAGE), 10),
    );
    // Support both 'pageSize' and 'limit' parameters for backward compatibility
    const limitParam =
      searchParams.get("limit") ||
      searchParams.get("pageSize") ||
      String(PAGINATION.DEFAULT_PAGE_SIZE);
    const pageSize = Math.min(
      PAGINATION.MAX_PAGE_SIZE,
      Math.max(PAGINATION.MIN_PAGE_SIZE, parseInt(limitParam, 10)),
    );

    // Validate sortBy
    const validSortFields = [
      "location_name",
      "rating",
      "review_count",
      "created_at",
      "updated_at",
    ];
    const sortBy = validSortFields.includes(
      searchParams.get("sortBy") || "location_name",
    )
      ? searchParams.get("sortBy") || "location_name"
      : "location_name";

    // Build query
    let query = supabase
      .from("gmb_locations")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // SECURITY: Apply filters with secure search utility
    if (search) {
      try {
        // Use the secure search filter utility that validates and escapes input
        query = applySafeSearchFilter(query, search, [
          "location_name",
          "address",
        ]);
      } catch {
        // If search validation fails, continue without search filter
        // Invalid input is silently ignored to prevent query breakage
      }
    }

    if (category && category !== "all") {
      query = query.eq("category", category);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === "asc" });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      // Log DB errors for debugging
      console.error("[Locations API] DB Error:", error.message);

      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to fetch locations. Please try again later.",
          code: "LOCATIONS_FETCH_ERROR",
        },
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

    // Add coordinates field to each location (convert latitude/longitude to coordinates object)
    const locationsWithCoordinates = addCoordinatesToLocations(data || []);

    // Calculate aggregations for filter counts (optional - only if aggregations param is set)
    const includeAggregations = searchParams.get("aggregations") === "true";
    let aggregations = undefined;

    if (includeAggregations) {
      // Fetch all locations for aggregation (not just the current page)
      const { data: allLocations } = await supabase
        .from("gmb_locations")
        .select("status, category")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (allLocations) {
        // Calculate status counts
        const statusCounts: Record<string, number> = {};
        const categoryCounts: Record<string, number> = {};

        allLocations.forEach((loc: LocationData) => {
          // Count by status
          const status = loc.status || "unknown";
          statusCounts[status] = (statusCounts[status] || 0) + 1;

          // Count by category
          if (loc.category) {
            categoryCounts[loc.category] =
              (categoryCounts[loc.category] || 0) + 1;
          }
        });

        aggregations = {
          statuses: statusCounts,
          categories: categoryCounts,
        };
      }
    }

    return NextResponse.json(
      {
        data: locationsWithCoordinates,
        total: count || 0,
        page,
        pageSize,
        hasMore: (count || 0) > page * pageSize,
        ...(aggregations && { aggregations }),
      },
      {
        headers: responseHeaders,
      },
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Locations API] Unexpected error:", err.message);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

// POST - Create new location
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // SECURITY: Rate limiting
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Request body must be valid JSON",
          code: "INVALID_JSON",
        },
        { status: 400 },
      );
    }
    const { name, address, phone, website, category } = body;

    // Input validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Location name is required and must be a non-empty string",
          code: "VALIDATION_ERROR",
          field: "name",
        },
        { status: 400 },
      );
    }

    if (name.length > VALIDATION.LOCATION_NAME_MAX) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Location name must be ${VALIDATION.LOCATION_NAME_MAX} characters or less`,
          code: "VALIDATION_ERROR",
          field: "name",
        },
        { status: 400 },
      );
    }

    if (
      !address ||
      typeof address !== "string" ||
      address.trim().length === 0
    ) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Address is required and must be a non-empty string",
          code: "VALIDATION_ERROR",
          field: "address",
        },
        { status: 400 },
      );
    }

    if (address.length > VALIDATION.ADDRESS_MAX) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Address must be ${VALIDATION.ADDRESS_MAX} characters or less`,
          code: "VALIDATION_ERROR",
          field: "address",
        },
        { status: 400 },
      );
    }

    // Optional field validation
    if (
      phone &&
      (typeof phone !== "string" || phone.length > VALIDATION.PHONE_MAX)
    ) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Phone must be a string with maximum ${VALIDATION.PHONE_MAX} characters`,
          code: "VALIDATION_ERROR",
          field: "phone",
        },
        { status: 400 },
      );
    }

    if (
      website &&
      (typeof website !== "string" || !website.match(/^https?:\/\/.+/))
    ) {
      return NextResponse.json(
        {
          error: "Validation error",
          message:
            "Website must be a valid URL starting with http:// or https://",
          code: "VALIDATION_ERROR",
          field: "website",
        },
        { status: 400 },
      );
    }

    if (
      category &&
      (typeof category !== "string" ||
        category.length > VALIDATION.CATEGORY_MAX)
    ) {
      return NextResponse.json(
        {
          error: "Validation error",
          message: `Category must be a string with maximum ${VALIDATION.CATEGORY_MAX} characters`,
          code: "VALIDATION_ERROR",
          field: "category",
        },
        { status: 400 },
      );
    }

    // Get active GMB account
    const { data: accounts } = await supabase
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!accounts) {
      return NextResponse.json(
        { error: "No active GMB account found" },
        { status: 400 },
      );
    }

    // Insert location
    const { data: location, error: insertError } = await supabase
      .from("gmb_locations")
      .insert({
        user_id: user.id,
        gmb_account_id: accounts.id,
        location_name: name,
        address: address,
        phone: phone || null,
        website: website || null,
        category: category || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      await logAction("location_create", "gmb_location", null, {
        status: "failed",
        reason: insertError.message,
      });
      console.error("[Locations API] Insert error:", insertError.message);

      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to create location. Please try again later.",
          code: "LOCATION_CREATE_ERROR",
        },
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

    await logAction("location_create", "gmb_location", location.id, {
      status: "success",
      user_id: user.id,
    });

    return NextResponse.json(
      {
        data: location,
        message: "Location created successfully",
      },
      {
        status: 201,
        headers: responseHeaders,
      },
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logAction("location_create", "gmb_location", null, {
      status: "failed",
      reason: err.message,
    });
    console.error("[Locations API] Unexpected error:", err.message);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred. Please try again later.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

// PUT - Update location
export async function PUT(request: NextRequest) {
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
    const locationId = searchParams.get("id");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const { name, address, phone, website, category } = body;

    // Update location
    const updateData: LocationUpdateData = {};
    if (name) updateData.location_name = name;
    if (address) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (website !== undefined) updateData.website = website;
    if (category !== undefined) updateData.category = category;

    const { data: location, error: updateError } = await supabase
      .from("gmb_locations")
      .update(updateData)
      .eq("id", locationId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("[Locations API] Update error:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update location" },
        { status: 500 },
      );
    }

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ data: location });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Locations API] PUT error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE - Delete location
export async function DELETE(request: NextRequest) {
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
    const locationId = searchParams.get("id");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 },
      );
    }

    // Soft delete (set is_active to false)
    const { error: deleteError } = await supabase
      .from("gmb_locations")
      .update({ is_active: false })
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[Locations API] Delete error:", deleteError.message);
      return NextResponse.json(
        { error: "Failed to delete location" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("[Locations API] DELETE error:", err.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
