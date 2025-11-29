/**
 * GMB Locations API Route
 * Uses secure handler with optimized batched queries (no N+1)
 */

import { ApiError, ErrorCode, withSecureApi } from "@/lib/api/secure-handler";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ============================================================================
// Types
// ============================================================================

interface LocationRecord {
  id: string;
  metadata: unknown;
  response_rate?: number | null;
  last_synced_at?: string | null;
  updated_at?: string | null;
  gmb_accounts?: { is_active: boolean };
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeMetadata(rawMetadata: unknown): Record<string, unknown> {
  if (!rawMetadata) {
    return {};
  }

  if (typeof rawMetadata === "string") {
    try {
      return JSON.parse(rawMetadata) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (typeof rawMetadata === "object") {
    return { ...(rawMetadata as Record<string, unknown>) };
  }

  return {};
}

// ============================================================================
// GET Handler - Fetch locations with pending counts (batched, no N+1)
// ============================================================================

export const GET = withSecureApi(
  async (_request, { user }) => {
    const supabase = await createClient();

    if (!user) {
      throw new ApiError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required",
        401,
      );
    }

    // -------------------------------------------------------------------------
    // QUERY 1: Fetch all locations with active accounts (JOIN)
    // -------------------------------------------------------------------------
    const { data: locations, error: locationsError } = await supabase
      .from("gmb_locations")
      .select("*, gmb_accounts!inner(is_active)")
      .eq("user_id", user.id)
      .eq("gmb_accounts.is_active", true);

    if (locationsError) {
      throw new ApiError(
        ErrorCode.DATABASE_ERROR,
        "Failed to load locations",
        500,
      );
    }

    if (!locations || locations.length === 0) {
      return NextResponse.json({ locations: [] });
    }

    // -------------------------------------------------------------------------
    // QUERY 2 & 3: Batch fetch pending reviews & questions (Promise.all)
    // This avoids N+1 by fetching ALL pending items in 2 queries total
    // -------------------------------------------------------------------------
    const locationIds = locations.map((loc) => loc.id);

    const [pendingReviewsResult, pendingQuestionsResult] = await Promise.all([
      supabase
        .from("gmb_reviews")
        .select("location_id, has_reply")
        .in("location_id", locationIds)
        .or("has_reply.eq.false,has_reply.is.null"),
      supabase
        .from("gmb_questions")
        .select("location_id, answer_status")
        .in("location_id", locationIds)
        .in("answer_status", ["pending", "unanswered"]),
    ]);

    // Log errors but don't fail the request - partial data is acceptable
    if (pendingReviewsResult.error) {
      console.error(
        "[GMB Locations] Reviews query failed:",
        pendingReviewsResult.error.message,
      );
    }

    if (pendingQuestionsResult.error) {
      console.error(
        "[GMB Locations] Questions query failed:",
        pendingQuestionsResult.error.message,
      );
    }

    // -------------------------------------------------------------------------
    // AGGREGATE: Build lookup maps for O(1) access
    // -------------------------------------------------------------------------
    const pendingReviewsMap = new Map<string, number>();
    const pendingQuestionsMap = new Map<string, number>();

    for (const review of pendingReviewsResult.data ?? []) {
      const locationId = review.location_id;
      if (!locationId) continue;
      pendingReviewsMap.set(
        locationId,
        (pendingReviewsMap.get(locationId) ?? 0) + 1,
      );
    }

    for (const question of pendingQuestionsResult.data ?? []) {
      const locationId = question.location_id;
      if (!locationId) continue;
      pendingQuestionsMap.set(
        locationId,
        (pendingQuestionsMap.get(locationId) ?? 0) + 1,
      );
    }

    // -------------------------------------------------------------------------
    // TRANSFORM: Enrich locations with pending counts (no additional queries)
    // -------------------------------------------------------------------------
    const enriched = (locations as LocationRecord[]).map((location) => {
      const metadata = normalizeMetadata(location.metadata);

      metadata.pendingReviews = pendingReviewsMap.get(location.id) ?? 0;
      metadata.pendingQuestions = pendingQuestionsMap.get(location.id) ?? 0;
      metadata.responseRate ??= location.response_rate ?? null;
      metadata.last_sync ??=
        location.last_synced_at ?? location.updated_at ?? null;

      return {
        ...location,
        metadata,
      };
    });

    return NextResponse.json({ locations: enriched });
  },
  {
    requireAuth: true,
  },
);
