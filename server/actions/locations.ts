"use server";

import {
  CATEGORY_TYPE_MAP,
  TYPE_KEYWORDS,
  type GooglePlacesType,
} from "@/lib/config/google-categories";
import { logAction } from "@/lib/monitoring/audit";
import { createClient } from "@/lib/supabase/server";
import { API_TIMEOUTS, fetchWithTimeout } from "@/lib/utils/error-handling";
import { gmbLogger } from "@/lib/utils/logger";
import {
  LocationSchema,
  UpdateLocationSchema,
} from "@/lib/validations/dashboard";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { performTransactionalSync } from "./gmb-sync";

interface LocationStatsData {
  pendingReviews: number;
  pendingQuestions: number;
  lastReviewAt: string | null;
  reviewTrendPct: number;
  questionTrendPct: number;
}

/**
 * Google Places API result structure (partial)
 */
interface GooglePlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  vicinity?: string;
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: number;
      lng: number;
    };
  };
  business_status?: string;
  opening_hours?: {
    open_now?: boolean;
  };
  types?: string[];
}

/**
 * Helper function to validate GMB connection for location operations
 */
async function validateGMBConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  locationId?: string,
) {
  // Check if user has an active GMB account
  const { data: activeAccounts, error: accountsError } = await supabase
    .from("gmb_accounts")
    .select("id, is_active")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (accountsError || !activeAccounts || activeAccounts.length === 0) {
    return {
      isValid: false,
      error:
        "No active GMB account found. Please connect your Google My Business account first.",
    };
  }

  // If locationId is provided, verify the location belongs to an active GMB account
  if (locationId) {
    const { data: location, error: locError } = await supabase
      .from("gmb_locations")
      .select("gmb_account_id")
      .eq("id", locationId)
      .eq("user_id", userId)
      .single();

    if (locError || !location) {
      return {
        isValid: false,
        error: "Location not found or access denied.",
      };
    }

    // Verify the location's GMB account is still active
    const { data: account, error: accountError } = await supabase
      .from("gmb_accounts")
      .select("is_active")
      .eq("id", location.gmb_account_id)
      .eq("user_id", userId)
      .single();

    if (accountError || !account || !account.is_active) {
      return {
        isValid: false,
        error:
          "The GMB account for this location is no longer active. Please reconnect your account.",
      };
    }
  }

  return { isValid: true, error: null };
}

export async function getLocations() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    // Only log unexpected errors, not missing sessions (expected when user isn't logged in)
    if (authError && authError.name !== "AuthSessionMissingError") {
      gmbLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
    }
    return { locations: [], error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("gmb_locations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    gmbLogger.error(
      "Failed to fetch locations",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { locations: [], error: error.message };
  }

  return { locations: data || [], error: null };
}

export async function addLocation(locationData: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError && authError.name !== "AuthSessionMissingError") {
      await logAction("location_add", "gmb_location", null, {
        status: "failed",
        reason: "authentication_error",
        error_message: authError?.message,
      });
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate input data
  try {
    const validatedData = LocationSchema.parse(locationData);

    const { data: newLocation, error } = await supabase
      .from("gmb_locations")
      .insert({
        ...validatedData,
        user_id: user.id,
        is_active: true,
        rating: 0,
      })
      .select("id")
      .single();

    if (error) {
      await logAction("location_add", "gmb_location", null, {
        status: "failed",
        reason: "database_error",
        error_message: error.message,
        user_id: user.id,
      });
      return { success: false, error: error.message };
    }

    await logAction("location_add", "gmb_location", newLocation?.id, {
      status: "success",
      user_id: user.id,
    });

    revalidatePath("/locations");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      await logAction("location_add", "gmb_location", null, {
        status: "failed",
        reason: "validation_error",
        error_message: errorMessage,
        user_id: user.id,
      });
      return { success: false, error: `Validation error: ${errorMessage}` };
    }
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    await logAction("location_add", "gmb_location", null, {
      status: "failed",
      reason: "unexpected_error",
      error_message: errorMessage,
      user_id: user.id,
    });
    return { success: false, error: "Failed to add location" };
  }
}

export async function updateLocation(locationId: string, updates: unknown) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError && authError.name !== "AuthSessionMissingError") {
      await logAction("location_update", "gmb_location", locationId, {
        status: "failed",
        reason: "authentication_error",
        error_message: authError?.message,
      });
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate locationId
  if (!locationId || typeof locationId !== "string") {
    await logAction("location_update", "gmb_location", null, {
      status: "failed",
      reason: "invalid_location_id",
      user_id: user.id,
    });
    return { success: false, error: "Invalid location ID" };
  }

  // Validate GMB connection for this location
  const connectionValidation = await validateGMBConnection(
    supabase,
    user.id,
    locationId,
  );
  if (!connectionValidation.isValid) {
    await logAction("location_update", "gmb_location", locationId, {
      status: "failed",
      reason: "gmb_connection_invalid",
      error_message: connectionValidation.error,
      user_id: user.id,
    });
    return { success: false, error: connectionValidation.error };
  }

  // Validate update data
  try {
    const validatedUpdates = UpdateLocationSchema.parse(updates);

    const { error } = await supabase
      .from("gmb_locations")
      .update({
        ...validatedUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", locationId)
      .eq("user_id", user.id);

    if (error) {
      await logAction("location_update", "gmb_location", locationId, {
        status: "failed",
        reason: "database_error",
        error_message: error.message,
        user_id: user.id,
      });
      return { success: false, error: error.message };
    }

    await logAction("location_update", "gmb_location", locationId, {
      status: "success",
      changed_fields: Object.keys(validatedUpdates),
      user_id: user.id,
    });

    revalidatePath("/locations");
    revalidatePath("/dashboard");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map((e) => e.message).join(", ");
      await logAction("location_update", "gmb_location", locationId, {
        status: "failed",
        reason: "validation_error",
        error_message: errorMessage,
        user_id: user.id,
      });
      return { success: false, error: `Validation error: ${errorMessage}` };
    }
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    await logAction("location_update", "gmb_location", locationId, {
      status: "failed",
      reason: "unexpected_error",
      error_message: errorMsg,
      user_id: user.id,
    });
    return { success: false, error: "Failed to update location" };
  }
}

export async function deleteLocation(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError && authError.name !== "AuthSessionMissingError") {
      await logAction("location_delete", "gmb_location", locationId, {
        status: "failed",
        reason: "authentication_error",
        error_message: authError?.message,
      });
    }
    return { success: false, error: "Not authenticated" };
  }

  // Validate locationId
  if (!locationId || typeof locationId !== "string") {
    await logAction("location_delete", "gmb_location", null, {
      status: "failed",
      reason: "invalid_location_id",
      user_id: user.id,
    });
    return { success: false, error: "Invalid location ID" };
  }

  // Validate GMB connection for this location
  const connectionValidation = await validateGMBConnection(
    supabase,
    user.id,
    locationId,
  );
  if (!connectionValidation.isValid) {
    await logAction("location_delete", "gmb_location", locationId, {
      status: "failed",
      reason: "gmb_connection_invalid",
      error_message: connectionValidation.error,
      user_id: user.id,
    });
    return { success: false, error: connectionValidation.error };
  }

  // Soft delete: mark as inactive instead of hard delete to preserve historical data
  const { error } = await supabase
    .from("gmb_locations")
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", locationId)
    .eq("user_id", user.id);

  if (error) {
    await logAction("location_delete", "gmb_location", locationId, {
      status: "failed",
      reason: "database_error",
      error_message: error.message,
      user_id: user.id,
    });
    return { success: false, error: error.message };
  }

  await logAction("location_delete", "gmb_location", locationId, {
    status: "success",
    user_id: user.id,
  });

  revalidatePath("/locations");
  revalidatePath("/dashboard");
  return { success: true, error: null };
}

/**
 * Get location sync status and validate GMB connection
 */
export async function getLocationSyncStatus(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    if (authError && authError.name !== "AuthSessionMissingError") {
      gmbLogger.error(
        "Authentication error",
        authError instanceof Error ? authError : new Error(String(authError)),
      );
    }
    return {
      success: false,
      error: "Not authenticated",
      data: null,
    };
  }

  if (!locationId || typeof locationId !== "string") {
    return {
      success: false,
      error: "Invalid location ID",
      data: null,
    };
  }

  // Get location with GMB account info
  const { data: location, error: locError } = await supabase
    .from("gmb_locations")
    .select(
      `
      id,
      location_name,
      last_synced_at,
      is_active,
      gmb_account_id,
      gmb_accounts!inner (
        id,
        is_active,
        account_name,
        last_sync
      )
    `,
    )
    .eq("id", locationId)
    .eq("user_id", user.id)
    .single();

  if (locError || !location) {
    return {
      success: false,
      error: "Location not found",
      data: null,
    };
  }

  const lastSyncedAt = location.last_synced_at
    ? new Date(location.last_synced_at)
    : null;
  const now = new Date();
  const minutesSinceSync = lastSyncedAt
    ? Math.floor((now.getTime() - lastSyncedAt.getTime()) / (1000 * 60))
    : null;

  const gmbAccount = Array.isArray(location.gmb_accounts)
    ? location.gmb_accounts[0]
    : location.gmb_accounts;

  return {
    success: true,
    data: {
      locationId: location.id,
      locationName: location.location_name,
      lastSyncedAt,
      minutesSinceSync,
      isStale: minutesSinceSync === null || minutesSinceSync > 60, // Consider stale after 1 hour
      isActive: location.is_active,
      gmbAccountActive: gmbAccount?.is_active ?? false,
      gmbAccountName: gmbAccount?.account_name ?? null,
      canSync: location.is_active && (gmbAccount?.is_active ?? false),
    },
    error: null,
  };
}

/**
 * Validate that a location can perform GMB operations
 */
export async function validateLocationForGMBOperations(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      isValid: false,
      error: "Not authenticated",
    };
  }

  if (!locationId || typeof locationId !== "string") {
    return {
      isValid: false,
      error: "Invalid location ID",
    };
  }

  const connectionValidation = await validateGMBConnection(
    supabase,
    user.id,
    locationId,
  );
  return connectionValidation;
}

export async function getLocationStats(locationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const [
    { data: reviews, error: reviewsError },
    { data: questions, error: questionsError },
  ] = await Promise.all([
    supabase
      .from("gmb_reviews")
      .select("id,status,created_at")
      .eq("user_id", user.id)
      .eq("location_id", locationId),
    supabase
      .from("gmb_questions")
      .select("id,answer_status,created_at")
      .eq("user_id", user.id)
      .eq("location_id", locationId),
  ]);

  if (reviewsError) {
    throw new Error(reviewsError.message);
  }

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  const pendingReviews = (reviews ?? []).filter((review) => {
    const status = (review.status ?? "").toString().toLowerCase();
    return status === "pending" || status === "new";
  }).length;

  const pendingQuestions = (questions ?? []).filter((question) => {
    const answerStatus = (question.answer_status ?? "")
      .toString()
      .toLowerCase();
    return answerStatus === "pending" || answerStatus === "";
  }).length;

  const lastReviewAt = (reviews ?? []).reduce<string | null>(
    (latest, review) => {
      if (!review.created_at) return latest;
      if (!latest) return review.created_at;
      return new Date(review.created_at) > new Date(latest)
        ? review.created_at
        : latest;
    },
    null,
  );

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(thirtyDaysAgo);
  sixtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const currentReviewWindow = (reviews ?? []).filter((review) => {
    if (!review.created_at) return false;
    const created = new Date(review.created_at);
    return created >= thirtyDaysAgo;
  }).length;

  const previousReviewWindow = (reviews ?? []).filter((review) => {
    if (!review.created_at) return false;
    const created = new Date(review.created_at);
    return created >= sixtyDaysAgo && created < thirtyDaysAgo;
  }).length;

  const currentQuestionWindow = (questions ?? []).filter((question) => {
    if (!question.created_at) return false;
    const created = new Date(question.created_at);
    return created >= thirtyDaysAgo;
  }).length;

  const previousQuestionWindow = (questions ?? []).filter((question) => {
    if (!question.created_at) return false;
    const created = new Date(question.created_at);
    return created >= sixtyDaysAgo && created < thirtyDaysAgo;
  }).length;

  const reviewTrendPct = calculateTrend(
    currentReviewWindow,
    previousReviewWindow,
  );
  const questionTrendPct = calculateTrend(
    currentQuestionWindow,
    previousQuestionWindow,
  );

  const data: LocationStatsData = {
    pendingReviews,
    pendingQuestions,
    lastReviewAt,
    reviewTrendPct,
    questionTrendPct,
  };

  return { data };
}

export async function bulkSyncLocations(locationIds: string[]) {
  if (!Array.isArray(locationIds) || locationIds.length === 0) {
    throw new Error("No locations provided for sync");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: locationRow, error: locationError } = await supabase
    .from("gmb_locations")
    .select("gmb_account_id")
    .eq("user_id", user.id)
    .in("id", locationIds)
    .not("gmb_account_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (locationError) {
    throw new Error(locationError.message);
  }

  const accountId = locationRow?.gmb_account_id as string | null;
  if (!accountId) {
    throw new Error(
      "No Google Business account found for the selected locations",
    );
  }

  try {
    const result = await performTransactionalSync(
      accountId,
      true, // includeQuestions
      false, // includePosts
      false, // includeMedia
      true, // includeInsights
      false, // isInternalCall - user initiated
    );
    return result;
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Failed to sync locations",
    );
  }
}

export async function getCompetitors({
  lat,
  lng,
  categoryId,
  categoryName,
  keywords,
}: {
  lat: number;
  lng: number;
  categoryId?: string | null;
  categoryName?: string | null;
  keywords?: string[] | null;
}) {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return { competitors: [], error: "Google Maps API key not configured" };
  }

  const normalizedKeywords = Array.from(
    new Set(
      (keywords ?? []).map((value) => value.toLowerCase()).filter(Boolean),
    ),
  );
  const inferredType = derivePlacesType({
    categoryId,
    categoryName,
    keywords: normalizedKeywords,
  });

  const url = new URL(
    "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
  );
  url.searchParams.set("location", `${lat},${lng}`);
  url.searchParams.set("radius", "3000");
  url.searchParams.set("type", inferredType ?? "point_of_interest");
  if (normalizedKeywords.length > 0) {
    url.searchParams.set("keyword", normalizedKeywords.slice(0, 3).join(" "));
  }
  url.searchParams.set("key", apiKey);

  const response = await fetchWithTimeout(
    url.toString(),
    { cache: "no-store" },
    API_TIMEOUTS.GOOGLE_API,
  );

  if (!response.ok) {
    throw new Error("Failed to fetch competitor data");
  }

  const data = await response.json();

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    throw new Error(
      data.error_message || `Google Places returned status ${data.status}`,
    );
  }

  const results = Array.isArray(data.results) ? data.results : [];
  const filteredResults = filterPlacesByRelevance(results, {
    type: inferredType,
    keywordList: normalizedKeywords,
  });

  const competitors = filteredResults
    .slice(0, 10)
    .map((result: GooglePlaceResult) => ({
      placeId: result.place_id,
      name: result.name,
      rating: result.rating ?? null,
      userRatingsTotal: result.user_ratings_total ?? 0,
      address: result.vicinity ?? result.formatted_address ?? null,
      location: result.geometry?.location ?? null,
      businessStatus: result.business_status ?? null,
      openNow: result.opening_hours?.open_now ?? null,
    }));

  return { competitors };
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

// CATEGORY_TYPE_MAP and TYPE_KEYWORDS are now imported from @/lib/config/google-categories

function derivePlacesType({
  categoryId,
  categoryName,
  keywords,
}: {
  categoryId?: string | null;
  categoryName?: string | null;
  keywords?: string[];
}): GooglePlacesType | null {
  const candidates: string[] = [];

  const normalizedCategoryId = normalizeToken(categoryId);
  if (normalizedCategoryId) {
    candidates.push(normalizedCategoryId);
  }

  const normalizedCategoryName = normalizeToken(categoryName);
  if (normalizedCategoryName) {
    candidates.push(normalizedCategoryName);
  }

  (keywords ?? []).forEach((keyword) => {
    const normalized = normalizeToken(keyword);
    if (normalized) {
      candidates.push(normalized);
    }
  });

  for (const candidate of candidates) {
    const compact = candidate.replace(/\s+/g, "_");
    if (CATEGORY_TYPE_MAP[compact]) {
      return CATEGORY_TYPE_MAP[compact];
    }

    for (const entry of TYPE_KEYWORDS) {
      if (entry.keywords.some((keyword) => candidate.includes(keyword))) {
        return entry.type;
      }
    }
  }

  return null;
}

function normalizeToken(value?: string | null) {
  if (!value) return null;
  return value
    .toString()
    .toLowerCase()
    .replace(/categories\/gcid:/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function filterPlacesByRelevance(
  results: GooglePlaceResult[],
  {
    type,
    keywordList,
  }: {
    type?: string | null;
    keywordList: string[];
  },
): GooglePlaceResult[] {
  const normalizedType = type?.toLowerCase() ?? null;
  const normalizedKeywords = keywordList.map((keyword) =>
    keyword.toLowerCase(),
  );

  const filtered = results.filter((result) => {
    const types: string[] = Array.isArray(result.types)
      ? result.types.map((value: string) => value.toLowerCase())
      : [];
    const name = (result.name ?? "").toLowerCase();
    const vicinity = (
      result.vicinity ??
      result.formatted_address ??
      ""
    ).toLowerCase();

    const typeMatches = normalizedType
      ? types.includes(normalizedType) ||
        types.some((value) => value.includes(normalizedType))
      : true;

    const keywordMatches = normalizedKeywords.length
      ? normalizedKeywords.some((keyword) => {
          const sanitizedKeyword = keyword.replace(/[^a-z0-9]+/g, " ").trim();
          if (!sanitizedKeyword) return false;
          const underscored = sanitizedKeyword.replace(/\s+/g, "_");
          return (
            name.includes(sanitizedKeyword) ||
            vicinity.includes(sanitizedKeyword) ||
            types.some((value) => value.includes(underscored))
          );
        })
      : true;

    return typeMatches && keywordMatches;
  });

  return filtered.length > 0 ? filtered : results;
}
