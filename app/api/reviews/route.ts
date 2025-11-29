/**
 * Reviews API Route
 * Uses secure handler with Zod validation
 */

import { reviewsQuerySchema } from "@/lib/api/schemas";
import { ApiError, ErrorCode, withSecureApi } from "@/lib/api/secure-handler";
import { createClient } from "@/lib/supabase/server";
import { applySafeSearchFilter } from "@/lib/utils/secure-search";
import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Infer the query type from the schema
type ReviewsQuery = z.infer<typeof reviewsQuerySchema>;

// Define the review type for proper typing
interface ReviewLocation {
  id: string;
  location_name: string;
  address: string | null;
  user_id: string;
}

export const GET = withSecureApi<unknown, ReviewsQuery>(
  async (_request, { user, query: params }) => {
    const supabase = await createClient();

    // Query params are already validated by Zod schema
    const {
      page,
      pageSize,
      rating,
      sentiment,
      status,
      locationId,
      search: searchQuery,
      dateFrom,
      dateTo,
      export: exportFormat,
    } = params;

    const isCsvExport = exportFormat === "csv";
    const offset = (page - 1) * pageSize;

    // User is guaranteed to exist since requireAuth defaults to true
    if (!user) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }

    // Build query with count for pagination
    let dbQuery = supabase
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
      dbQuery = dbQuery.eq("rating", rating);
    }

    if (sentiment) {
      dbQuery = dbQuery.eq("sentiment", sentiment);
    }

    if (status) {
      if (status === "pending") {
        dbQuery = dbQuery.or("has_reply.is.null,has_reply.eq.false");
      } else if (status === "replied") {
        dbQuery = dbQuery.eq("has_reply", true);
      } else {
        dbQuery = dbQuery.eq("status", status);
      }
    }

    if (locationId) {
      dbQuery = dbQuery.eq("location_id", locationId);
    }

    if (dateFrom) {
      dbQuery = dbQuery.gte("review_date", dateFrom);
    }

    if (dateTo) {
      dbQuery = dbQuery.lte("review_date", dateTo);
    }

    if (searchQuery) {
      try {
        dbQuery = applySafeSearchFilter(dbQuery, searchQuery, [
          "review_text",
          "comment",
          "reviewer_name",
        ]);
      } catch (searchError) {
        console.warn("Invalid search input detected:", searchError);
      }
    }

    dbQuery = dbQuery.order("review_date", {
      ascending: false,
      nullsFirst: false,
    });
    dbQuery = dbQuery.range(offset, offset + pageSize - 1);

    const { data: reviews, error, count } = await dbQuery;

    if (error) {
      console.error("[Reviews API] Database error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });

      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        "Failed to fetch reviews",
        500,
      );
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform data properly - use explicit typing
    const transformedReviews = (reviews || []).map((r) => {
      // Handle gmb_locations - it can be an array or single object
      const locations = r.gmb_locations as
        | ReviewLocation
        | ReviewLocation[]
        | null;
      let location: ReviewLocation | null = null;
      if (Array.isArray(locations)) {
        location = locations[0] || null;
      } else if (locations) {
        location = locations;
      }

      const locationName = location?.location_name || "Unknown Location";
      const reviewText = (
        ((r as Record<string, unknown>).comment as string) ||
        r.review_text ||
        ""
      ).trim();
      const replyText =
        r.reply_text ||
        ((r as Record<string, unknown>).review_reply as string) ||
        ((r as Record<string, unknown>).response_text as string) ||
        "";

      return {
        id: r.id,
        review_id: r.review_id,
        reviewer_name: r.reviewer_name || "Anonymous",
        rating: r.rating || 0,
        comment: reviewText,
        review_text: reviewText,
        reply_text: replyText,
        review_reply: replyText,
        response_text: replyText,
        has_reply: Boolean(replyText || r.has_reply),
        review_date: r.review_date,
        created_at: r.created_at,
        replied_at:
          ((r as Record<string, unknown>).replied_at as string) ||
          ((r as Record<string, unknown>).responded_at as string) ||
          null,
        ai_sentiment:
          ((r as Record<string, unknown>).ai_sentiment as string) || null,
        location_id: r.location_id,
        external_review_id:
          ((r as Record<string, unknown>).external_review_id as string) || null,
        gmb_account_id: r.gmb_account_id,
        status: r.status,
        updated_at: r.updated_at,
        location_name: locationName,
      };
    });

    // Handle CSV export
    if (isCsvExport) {
      const escapeCsv = (value: unknown): string => {
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

    // Return JSON response
    return NextResponse.json({
      success: true,
      data: {
        reviews: transformedReviews,
        pagination: {
          total: totalCount,
          page,
          pageSize,
          totalPages,
          hasNextPage,
          hasPreviousPage,
        },
      },
    });
  },
  {
    querySchema: reviewsQuerySchema,
    requireAuth: true,
  },
);
