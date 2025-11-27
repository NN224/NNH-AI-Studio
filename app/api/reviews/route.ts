import { createClient } from "@/lib/supabase/server";
import { applySafeSearchFilter } from "@/lib/utils/secure-search";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching reviews for user:", user.id);

    const { searchParams } = new URL(request.url);

    // Parse filter parameters
    const rating = searchParams.get("rating");
    const sentiment = searchParams.get("sentiment");
    const status = searchParams.get("status");
    const locationId = searchParams.get("locationId");
    const searchQuery = searchParams.get("search");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const exportFormat = searchParams.get("export");
    const isCsvExport = exportFormat === "csv";

    // Parse pagination parameters
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // Validate pagination parameters
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(Math.max(1, pageSize), 100); // Max 100 items per page
    const offset = (validPage - 1) * validPageSize;

    // Build query with count for pagination
    // Note: Using actual DB column names (review_text not comment, sentiment not ai_sentiment)
    let query = supabase
      .from("gmb_reviews")
      .select(
        `
        id,
        review_id,
        reviewer_name,
        rating,
        review_text,
        reply_text,
        has_reply,
        review_date,
        reply_date,
        sentiment,
        location_id,
        gmb_account_id,
        status,
        created_at,
        updated_at,
        gmb_locations (
          id,
          location_name,
          address,
          user_id
        )
      `,
        { count: "exact" },
      )
      .not("gmb_locations.user_id", "is", null)
      .eq("gmb_locations.user_id", user.id);

    // Apply server-side filters
    if (rating) {
      query = query.eq("rating", parseInt(rating));
    }

    if (sentiment) {
      query = query.eq("sentiment", sentiment);
    }

    if (status) {
      // Map status to database conditions
      if (status === "pending") {
        query = query.or("has_reply.is.null,has_reply.eq.false");
      } else if (status === "replied") {
        query = query.eq("has_reply", true);
      } else {
        query = query.eq("status", status);
      }
    }

    if (locationId) {
      query = query.eq("location_id", locationId);
    }

    // Date range filtering
    if (dateFrom) {
      query = query.gte("review_date", dateFrom);
    }

    if (dateTo) {
      query = query.lte("review_date", dateTo);
    }

    // Server-side search filtering with secure implementation
    if (searchQuery) {
      try {
        // Use the secure search filter utility that validates and escapes input
        query = applySafeSearchFilter(query, searchQuery, [
          "review_text",
          "comment",
          "reviewer_name",
        ]);
      } catch (error) {
        // If search validation fails, log and continue without search filter
        console.warn("Invalid search input detected:", error);
        // Continue without applying search to prevent breaking the query
      }
    }

    // Order by review date (newest first)
    query = query.order("review_date", { ascending: false, nullsFirst: false });

    // Apply pagination with range
    query = query.range(offset, offset + validPageSize - 1);

    const { data: reviews, error, count } = await query;

    if (error) {
      console.error("Supabase query error:", error);
      console.error("Full error object:", JSON.stringify(error, null, 2));
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      console.error("Error details:", error.details);
      console.error("Error hint:", error.hint);

      return NextResponse.json(
        {
          error: "Failed to fetch reviews",
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        },
        { status: 500 },
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / validPageSize);
    const hasNextPage = validPage < totalPages;
    const hasPreviousPage = validPage > 1;

    console.log(
      `Found ${reviews?.length || 0} reviews (page ${validPage} of ${totalPages}, total: ${totalCount})`,
    );

    // Transform data properly - handle both 'comment' and 'review_text' fields
    const transformedReviews = (reviews || []).map((r: any) => {
      // Handle gmb_locations - it can be an array or single object
      let location = null;
      if (Array.isArray(r.gmb_locations)) {
        location = r.gmb_locations[0];
      } else if (r.gmb_locations) {
        location = r.gmb_locations;
      }

      // Extract location name - use location_name (the actual column name)
      const locationName = location?.location_name || "Unknown Location";

      // Get review text - prefer 'comment' field, fallback to 'review_text'
      const reviewText = (r.comment || r.review_text || "").trim();

      // Get reply text from any of the possible fields
      const replyText = r.reply_text || r.review_reply || r.response_text || "";

      return {
        id: r.id,
        review_id: r.review_id,
        reviewer_name: r.reviewer_name || "Anonymous",
        rating: r.rating || 0,
        comment: reviewText,
        review_text: reviewText,
        reply_text: replyText,
        review_reply: replyText, // Include for backward compatibility
        response_text: replyText, // Include for backward compatibility
        has_reply: Boolean(replyText || r.has_reply),
        review_date: r.review_date,
        created_at: r.created_at,
        replied_at: r.replied_at || r.responded_at,
        ai_sentiment: r.ai_sentiment,
        location_id: r.location_id,
        external_review_id: r.external_review_id,
        gmb_account_id: r.gmb_account_id,
        status: r.status,
        updated_at: r.updated_at,
        location_name: locationName,
      };
    });

    if (isCsvExport) {
      const escapeCsv = (value: unknown) => {
        if (value === null || value === undefined) {
          return '""';
        }
        const stringValue = String(value);
        const escaped = stringValue.replace(/"/g, '""');
        return `"${escaped}"`;
      };

      const headerRow = [
        "Review ID",
        "Reviewer",
        "Rating",
        "Comment",
        "Status",
        "Location",
        "Review Date",
        "Reply",
      ];

      const csvRows = transformedReviews.map((review) => [
        escapeCsv(review.id),
        escapeCsv(review.reviewer_name),
        escapeCsv(review.rating),
        escapeCsv(review.comment),
        escapeCsv(review.status ?? "pending"),
        escapeCsv(review.location_name),
        escapeCsv(review.review_date ?? ""),
        escapeCsv(review.reply_text ?? ""),
      ]);

      const csvContent = [headerRow, ...csvRows]
        .map((row) => row.join(","))
        .join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="reviews-export.csv"',
        },
      });
    }

    return NextResponse.json({
      reviews: transformedReviews,
      pagination: {
        total: totalCount,
        page: validPage,
        pageSize: validPageSize,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error: any) {
    console.error("API route error:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
