/**
 * Location data transformation utilities
 * Extracted from use-locations.ts for better maintainability
 */

import { Location } from "@/components/locations/location-types";
import { mapLocationCoordinates } from "@/lib/utils/location-coordinates";

// ============================================================================
// Type Coercion Utilities
// ============================================================================

export function coerceNumber(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function coerceString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return undefined;
}

export function normalizeLocationStatus(status: unknown): Location["status"] {
  const value = (status ?? "").toString().toLowerCase();
  if (value.includes("suspend")) return "suspended";
  if (
    value.includes("verify") ||
    value.includes("active") ||
    value.includes("published")
  ) {
    return "verified";
  }
  return "pending";
}

// ============================================================================
// Metadata Parsing
// ============================================================================

export function parseMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === "object") return metadata as Record<string, unknown>;
  if (typeof metadata === "string") {
    try {
      const parsed = JSON.parse(metadata);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Silently fail - invalid JSON
    }
  }
  return {};
}

// ============================================================================
// Image Extraction
// ============================================================================

export function extractImageFromMetadata(
  metadata: Record<string, unknown>,
  preferredKeys: string[],
): string | undefined {
  for (const key of preferredKeys) {
    const segments = key.split(".");
    let value: unknown = metadata;
    for (const segment of segments) {
      if (value == null) break;
      value = (value as Record<string, unknown>)?.[segment];
    }

    const url =
      typeof value === "string"
        ? value
        : typeof value === "object" && value !== null
          ? (((value as Record<string, unknown>).url as string | undefined) ??
            ((value as Record<string, unknown>).src as string | undefined) ??
            ((value as Record<string, unknown>).value as string | undefined))
          : undefined;
    const parsed = coerceString(url);
    if (parsed) {
      return parsed;
    }
  }
  return undefined;
}

export function extractFirstMediaUrl(
  metadata: Record<string, unknown>,
): string | undefined {
  const mediaCollections = [
    metadata.mediaItems,
    metadata.media,
    metadata.photos,
    metadata.gallery,
    metadata.images,
  ];

  for (const collection of mediaCollections) {
    if (Array.isArray(collection)) {
      for (const item of collection) {
        const candidate =
          coerceString(item?.coverUrl) ??
          coerceString(item?.cover_photo_url) ??
          coerceString(item?.photoUrl) ??
          coerceString(item?.url) ??
          coerceString(item?.thumbnailUrl) ??
          coerceString(item?.imageUrl);
        if (candidate) {
          return candidate;
        }
      }
    }
  }
  return undefined;
}

// ============================================================================
// Image URL Candidates
// ============================================================================

export const LOGO_CANDIDATES = [
  "logoImageUrl",
  "logo_image_url",
  "logoUrl",
  "logo.url",
  "logo.src",
  "logo.value",
  "branding.logoUrl",
  "branding.logo.url",
  "branding.logo.src",
  "brandLogo",
  "brand_logo",
  "profile.logoUrl",
  "profile.logo_url",
  "profile.logo.url",
  "profile.logo.src",
  "profile.logoImageUrl",
  "profile.branding.logoUrl",
  "customBranding.logoImageUrl",
  "customBranding.logoUrl",
  "customBranding.logo.url",
  "customBranding.logo_src",
] as const;

export const COVER_CANDIDATES = [
  "coverImageUrl",
  "cover_image_url",
  "coverPhotoUrl",
  "cover_photo_url",
  "coverPhoto",
  "cover_photo",
  "coverPhoto.url",
  "coverPhoto.src",
  "cover.url",
  "cover.src",
  "profile.coverPhotoUrl",
  "profile.cover_photo_url",
  "profile.coverPhoto.url",
  "profile.coverPhoto.src",
  "profile.cover.url",
  "profile.cover.src",
  "branding.coverImageUrl",
  "branding.cover_url",
  "branding.cover.url",
  "branding.cover.src",
  "branding.heroImageUrl",
  "branding.hero_image_url",
  "branding.hero.url",
  "branding.hero.src",
  "customBranding.coverImageUrl",
  "customBranding.coverUrl",
  "customBranding.cover.url",
  "customBranding.cover_src",
] as const;

// ============================================================================
// Location Transformation
// ============================================================================

export interface TransformLocationOptions {
  fallbackLogoUrl?: string;
  fallbackCoverUrl?: string;
  pendingReviewsMap: Map<string, number>;
  pendingQuestionsMap: Map<string, number>;
}

export function transformRawLocation(
  loc: Record<string, unknown>,
  options: TransformLocationOptions,
): Location {
  const {
    fallbackLogoUrl,
    fallbackCoverUrl,
    pendingReviewsMap,
    pendingQuestionsMap,
  } = options;

  const metadata = parseMetadata(loc.metadata);
  const rating = coerceNumber(loc.rating) ?? coerceNumber(metadata.rating);
  const reviewCount =
    coerceNumber(loc.review_count) ?? coerceNumber(metadata.reviewCount) ?? 0;
  const healthScore =
    coerceNumber(loc.health_score) ??
    coerceNumber(metadata.healthScore) ??
    coerceNumber(metadata.health_score);

  const coordinates = mapLocationCoordinates(loc);

  const rawInsights = (metadata.insights_json ||
    metadata.insights ||
    {}) as Record<string, unknown>;

  const insights = {
    views: coerceNumber(rawInsights.views) ?? 0,
    viewsTrend: coerceNumber(rawInsights.viewsTrend) ?? 0,
    clicks: coerceNumber(rawInsights.clicks) ?? 0,
    clicksTrend: coerceNumber(rawInsights.clicksTrend) ?? 0,
    calls: coerceNumber(rawInsights.calls) ?? 0,
    callsTrend: coerceNumber(rawInsights.callsTrend) ?? 0,
    directions: coerceNumber(rawInsights.directions) ?? 0,
    directionsTrend: coerceNumber(rawInsights.directionsTrend) ?? 0,
    weeklyGrowth: coerceNumber(rawInsights.weeklyGrowth) ?? 0,
    pendingReviews: coerceNumber(rawInsights.pendingReviews),
    responseRate: coerceNumber(rawInsights.responseRate),
  };

  const photos =
    coerceNumber(metadata.mediaCount) ??
    coerceNumber(metadata.photos) ??
    undefined;
  const posts =
    coerceNumber(metadata.postsCount) ??
    coerceNumber(metadata.posts) ??
    undefined;

  const rawAttributes =
    Array.isArray(metadata.serviceItems) && metadata.serviceItems.length > 0
      ? metadata.serviceItems
      : Array.isArray(metadata.attributes)
        ? metadata.attributes
        : [];

  const attributes = Array.isArray(rawAttributes)
    ? rawAttributes
        .map((item: unknown) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return (
              (obj.name as string) ??
              (obj.label as string) ??
              (obj.value as string) ??
              (obj.description as string) ??
              null
            );
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  const locationId = String(loc.id);

  const pendingReviewsCount =
    pendingReviewsMap.get(locationId) ??
    coerceNumber(loc.pending_reviews) ??
    coerceNumber(metadata.pendingReviews) ??
    coerceNumber(metadata.pending_review_count) ??
    insights.pendingReviews ??
    0;

  const pendingQuestionsCount =
    pendingQuestionsMap.get(locationId) ??
    coerceNumber(loc.pending_questions) ??
    coerceNumber(metadata.pendingQuestions) ??
    coerceNumber(metadata.pending_question_count) ??
    coerceNumber(metadata.unansweredQuestions) ??
    0;

  const responseRate =
    coerceNumber(loc.response_rate) ??
    coerceNumber(metadata.responseRate) ??
    coerceNumber(metadata.response_rate) ??
    insights.responseRate;

  const ratingTrend =
    coerceNumber(metadata.ratingTrend) ?? coerceNumber(metadata.rating_trend);

  const lastSync =
    (loc.last_sync as string) ||
    (metadata.last_sync as string) ||
    (metadata.lastSync as string) ||
    (metadata.lastSyncedAt as string) ||
    (loc.updated_at as string) ||
    null;

  const logoImageUrl =
    coerceString(loc.logo_image_url ?? loc.logoImageUrl) ??
    extractImageFromMetadata(metadata, [...LOGO_CANDIDATES]) ??
    extractFirstMediaUrl(metadata) ??
    fallbackLogoUrl;

  const coverImageUrl =
    coerceString(
      loc.cover_photo_url ?? loc.cover_image_url ?? loc.coverImageUrl,
    ) ??
    extractImageFromMetadata(metadata, [...COVER_CANDIDATES]) ??
    extractFirstMediaUrl(metadata) ??
    fallbackCoverUrl;

  const isActive =
    typeof loc.is_active === "boolean"
      ? loc.is_active
      : metadata.is_active !== false;
  const hasIssues =
    (pendingReviewsCount ?? 0) > 0 || (pendingQuestionsCount ?? 0) > 0;

  const reviewsMetadata = metadata.reviews as
    | Record<string, unknown>
    | undefined;
  const lastReviewAt =
    (loc.last_review_at as string) ||
    (metadata.lastReviewAt as string) ||
    (reviewsMetadata?.lastReviewAt as string) ||
    null;

  return {
    id: locationId,
    name: (loc.location_name as string) || "Unnamed Location",
    address: (loc.address as string) || undefined,
    phone: (loc.phone as string) || undefined,
    website: (loc.website as string) || undefined,
    rating,
    reviewCount,
    status: normalizeLocationStatus(loc.status),
    isActive: isActive as boolean,
    hasIssues,
    pendingReviews: pendingReviewsCount ?? 0,
    pendingQuestions: pendingQuestionsCount ?? 0,
    lastReviewAt,
    category: (loc.category as string) || undefined,
    coordinates,
    healthScore: healthScore ?? undefined,
    photos,
    posts,
    visibility: coerceNumber(metadata.visibilityScore) ?? undefined,
    lastSync,
    insights,
    responseRate: responseRate ?? undefined,
    ratingTrend: ratingTrend ?? undefined,
    metadata,
    attributes,
    autoReplyEnabled:
      typeof metadata.autoReplyEnabled === "boolean"
        ? metadata.autoReplyEnabled
        : undefined,
    qnaEnabled:
      typeof metadata.qnaEnabled === "boolean"
        ? metadata.qnaEnabled
        : undefined,
    profileProtection:
      typeof metadata.profileProtection === "boolean"
        ? metadata.profileProtection
        : undefined,
    coverImageUrl: coverImageUrl ?? fallbackCoverUrl ?? null,
    logoImageUrl: logoImageUrl ?? fallbackLogoUrl ?? null,
  };
}

/**
 * Transform array of raw location data to Location objects
 */
export function transformLocations(
  data: Record<string, unknown>[],
  options: TransformLocationOptions,
): Location[] {
  return data
    .filter((loc) => loc?.id && String(loc.id).trim() !== "")
    .map((loc) => transformRawLocation(loc, options));
}
