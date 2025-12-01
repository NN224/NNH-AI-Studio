// Locations Export API
// Exports locations data to CSV format with filters support

import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api/auth-middleware";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { applySafeSearchFilter } from "@/lib/utils/secure-search";

export const dynamic = "force-dynamic";

/**
 * CSV Export Handler
 * Exports locations to CSV format with support for filters
 */
async function handler(request: Request, user: any): Promise<Response> {
  try {
    const supabase = await createClient();

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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
    const format = searchParams.get("format") || "csv"; // csv, json (future)

    // Get specific location IDs if provided (for bulk export of selected locations)
    const locationIdsParam = searchParams.get("locationIds");
    const locationIds = locationIdsParam ? locationIdsParam.split(",") : null;

    // Get active GMB accounts
    const { data: activeAccounts } = await supabase
      .from("gmb_accounts")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    const activeAccountIds = activeAccounts?.map((acc) => acc.id) || [];

    if (activeAccountIds.length === 0) {
      return new NextResponse("No locations found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Build query - fetch ALL locations (no pagination for export)
    let query = supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_name,
        address,
        phone,
        website,
        rating,
        review_count,
        status,
        category,
        metadata,
        created_at,
        updated_at
      `,
      )
      .eq("user_id", user.id)
      .in("gmb_account_id", activeAccountIds)
      .eq("is_active", true);

    // If specific location IDs provided, filter by them
    if (locationIds && locationIds.length > 0) {
      // Validate UUIDs
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validIds = locationIds.filter((id) => uuidRegex.test(id));

      if (validIds.length > 0) {
        query = query.in("id", validIds);
      }
    }

    // Apply filters with secure search implementation
    if (search) {
      try {
        // Use the secure search filter utility that validates and escapes input
        query = applySafeSearchFilter(query, search, [
          "location_name",
          "address",
        ]);
      } catch (error) {
        // If search validation fails, log and continue without search filter
        console.warn("Invalid search input detected:", error);
        // Continue without applying search to prevent breaking the query
      }
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category !== "all") {
      query = query.eq("category", category);
    }

    // Order by created_at descending
    query = query.order("created_at", { ascending: false });

    const { data: locationsData, error: dbError } = await query;

    if (dbError) {
      console.error("[GET /api/locations/export] DB Error:", {
        error: dbError.message,
        code: dbError.code,
        userId: user.id,
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json(
        {
          error: "Database error",
          message: "Failed to export locations. Please try again later.",
          code: "LOCATIONS_EXPORT_ERROR",
        },
        { status: 500 },
      );
    }

    if (!locationsData || locationsData.length === 0) {
      return new NextResponse("No locations found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    // Process locations data
    const processedLocations = (locationsData || []).map((loc: any) => {
      const metadata = (loc.metadata as Record<string, any> | null) || {};
      const lastSync =
        metadata.last_sync ||
        metadata.lastSync ||
        loc.updated_at ||
        loc.created_at;

      return {
        id: loc.id || "",
        name: loc.location_name || "Untitled Location",
        address: loc.address || "N/A",
        phone: loc.phone || "N/A",
        website: loc.website || "",
        rating: Number(loc.rating) || 0,
        reviewCount: Number(loc.review_count) || 0,
        status: loc.status || "pending",
        category: loc.category || "General",
        created_at: loc.created_at
          ? new Date(loc.created_at).toISOString()
          : "",
        last_synced: lastSync ? new Date(lastSync).toISOString() : "",
      };
    });

    // Generate CSV
    if (format === "csv") {
      // CSV Headers
      const headers = [
        "ID",
        "Name",
        "Address",
        "Phone",
        "Website",
        "Rating",
        "Review Count",
        "Status",
        "Category",
        "Created At",
        "Last Synced",
      ];

      // Escape CSV value (handle commas, quotes, newlines)
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Build CSV rows
      const csvRows = [
        headers.join(","), // Header row
        ...processedLocations.map((loc) =>
          [
            escapeCSV(loc.id),
            escapeCSV(loc.name),
            escapeCSV(loc.address),
            escapeCSV(loc.phone),
            escapeCSV(loc.website),
            escapeCSV(loc.rating),
            escapeCSV(loc.reviewCount),
            escapeCSV(loc.status),
            escapeCSV(loc.category),
            escapeCSV(loc.created_at),
            escapeCSV(loc.last_synced),
          ].join(","),
        ),
      ];

      const csvContent = csvRows.join("\n");

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const filename = `locations-export-${timestamp}.csv`;

      // Convert headers object to Record<string, string>
      const headersObj: Record<string, string> = {};
      if (rateLimitHeaders) {
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
          if (typeof value === "string") {
            headersObj[key] = value;
          }
        });
      }

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          ...headersObj,
        },
      });
    }

    // JSON format (future)
    return NextResponse.json(
      {
        error: "Format not supported",
        message: "Only CSV format is currently supported",
      },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[GET /api/locations/export] Unexpected error:", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to export locations. Please try again later.",
        code: "LOCATIONS_EXPORT_ERROR",
      },
      { status: 500 },
    );
  }
}

export const GET = withAuth(handler);
