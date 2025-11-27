"use server";

import {
  CacheBucket,
  publishSyncProgress,
  refreshCache,
  type SyncProgressEvent,
} from "@/lib/cache/cache-manager";
import {
  buildLocationResourceName,
  getValidAccessToken,
  GMB_CONSTANTS,
} from "@/lib/gmb/helpers";
import type {
  LocationData,
  QuestionData,
  ReviewData,
} from "@/lib/gmb/sync-types";
import { logAction } from "@/lib/monitoring/audit";
import { trackSyncResult } from "@/lib/monitoring/metrics";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { runSyncTransactionWithRetry } from "@/lib/supabase/transactions";
import { randomUUID } from "crypto";

const GBP_LOC_BASE = GMB_CONSTANTS.GBP_LOC_BASE;
const REVIEWS_BASE = GMB_CONSTANTS.GMB_V4_BASE;
const QANDA_BASE = GMB_CONSTANTS.QANDA_BASE;
const POSTS_BASE = GMB_CONSTANTS.GMB_V4_BASE; // Posts use v4 API (localPosts endpoint)
const MEDIA_BASE = GMB_CONSTANTS.GMB_V4_BASE; // Media uses v4 API

// Rate limiting configuration
const MAX_CONCURRENT_REQUESTS = 5; // Max parallel requests to Google API
const REQUEST_DELAY_MS = 200; // Delay between batches to avoid rate limiting

// Token refresh configuration
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // Refresh token 5 minutes before expiry

/**
 * Token manager to handle automatic refresh during long-running sync operations
 */
class TokenManager {
  private token: string;
  private tokenExpiresAt: number;
  private supabase: Awaited<ReturnType<typeof createClient>>;
  private accountId: string;

  constructor(
    initialToken: string,
    expiresInSeconds: number,
    supabase: Awaited<ReturnType<typeof createClient>>,
    accountId: string,
  ) {
    this.token = initialToken;
    this.tokenExpiresAt =
      Date.now() + expiresInSeconds * 1000 - TOKEN_REFRESH_BUFFER_MS;
    this.supabase = supabase;
    this.accountId = accountId;
  }

  async getToken(): Promise<string> {
    // Check if token needs refresh
    if (Date.now() >= this.tokenExpiresAt) {
      console.warn("[GMB Sync] Token expired or expiring soon, refreshing...");
      try {
        this.token = await getValidAccessToken(this.supabase, this.accountId);
        // Assume new token is valid for 1 hour
        this.tokenExpiresAt =
          Date.now() + 3600 * 1000 - TOKEN_REFRESH_BUFFER_MS;
        console.warn("[GMB Sync] Token refreshed successfully");
      } catch (error) {
        console.error("[GMB Sync] Failed to refresh token:", error);
        throw new Error("Failed to refresh access token during sync");
      }
    }
    return this.token;
  }
}

/**
 * Execute promises with concurrency limit to avoid Google API rate limiting
 * @param items - Array of items to process
 * @param fn - Async function to execute for each item
 * @param concurrency - Maximum concurrent executions (default: 5)
 */
async function withConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = MAX_CONCURRENT_REQUESTS,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Remove completed promises
      const completed = executing.filter((p) => {
        let resolved = false;
        p.then(() => {
          resolved = true;
        }).catch(() => {
          resolved = true;
        });
        return resolved;
      });
      executing.splice(0, completed.length);

      // Add small delay between batches to be safe
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  // Wait for remaining promises
  await Promise.all(executing);
  return results;
}

type SyncStage =
  | "init"
  | "locations_fetch"
  | "reviews_fetch"
  | "questions_fetch"
  | "posts_fetch"
  | "media_fetch"
  | "insights_fetch"
  | "transaction"
  | "cache_refresh"
  | "complete";

const BASE_STAGES: SyncStage[] = [
  "init",
  "locations_fetch",
  "reviews_fetch",
  "questions_fetch",
  "posts_fetch",
  "media_fetch",
  "insights_fetch",
  "transaction",
  "cache_refresh",
  "complete",
];

// Performance Insights API base (v4)
const INSIGHTS_BASE = GMB_CONSTANTS.GMB_V4_BASE;

function createProgressEmitter(options: {
  userId: string;
  accountId: string;
  includeQuestions: boolean;
  includePosts?: boolean;
  includeMedia?: boolean;
  includeInsights?: boolean;
}) {
  let activeSyncId: string = randomUUID();
  let stageOrder: SyncStage[] = [...BASE_STAGES];

  // Filter stages based on options
  if (!options.includeQuestions) {
    stageOrder = stageOrder.filter((stage) => stage !== "questions_fetch");
  }
  if (!options.includePosts) {
    stageOrder = stageOrder.filter((stage) => stage !== "posts_fetch");
  }
  if (!options.includeMedia) {
    stageOrder = stageOrder.filter((stage) => stage !== "media_fetch");
  }
  if (!options.includeInsights) {
    stageOrder = stageOrder.filter((stage) => stage !== "insights_fetch");
  }

  const totalStages = stageOrder.length;

  const emit = (
    stage: SyncStage,
    status: SyncProgressEvent["status"],
    extra?: {
      message?: string;
      counts?: Record<string, number | undefined>;
      error?: string;
    },
  ) => {
    const stageIndex = Math.max(0, stageOrder.indexOf(stage));
    const current =
      status === "completed"
        ? Math.min(stageIndex + 1, totalStages)
        : stage === "complete" && status === "error"
          ? totalStages
          : stageIndex;
    const percentage = Math.max(
      0,
      Math.min(100, Math.round((current / totalStages) * 100)),
    );

    publishSyncProgress({
      syncId: activeSyncId,
      accountId: options.accountId,
      userId: options.userId,
      stage,
      status,
      current,
      total: totalStages,
      percentage,
      message: extra?.message,
      counts: extra?.counts,
      error: extra?.error,
      timestamp: new Date().toISOString(),
    });
  };

  return {
    emit,
    stageOrder,
    updateSyncId(id?: string | null) {
      if (id) {
        activeSyncId = id;
      }
    },
    getSyncId() {
      return activeSyncId;
    },
  };
}

function mapStarRating(value?: string | number | null) {
  if (typeof value === "number") {
    return value;
  }

  const starMap: Record<string, number> = {
    STAR_ONE: 1,
    STAR_TWO: 2,
    STAR_THREE: 3,
    STAR_FOUR: 4,
    STAR_FIVE: 5,
    STAR_ZERO: 0,
  };

  if (value && typeof value === "string" && starMap[value.toUpperCase()]) {
    return starMap[value.toUpperCase()];
  }

  if (typeof value === "string") {
    const match = value.match(/(\d)/);
    if (match) {
      return Number(match[1]);
    }
  }

  return 0;
}

function resolveLocationResource(
  accountResource: string,
  googleLocationId: string,
) {
  if (!googleLocationId) return null;
  if (googleLocationId.startsWith("accounts/")) {
    return googleLocationId;
  }

  return buildLocationResourceName(
    accountResource.replace(/^accounts\//, ""),
    googleLocationId,
  );
}

type GoogleAddress = {
  addressLines?: string[];
  locality?: string;
  administrativeArea?: string;
  postalCode?: string;
  country?: string;
};

function formatAddress(address?: GoogleAddress | null) {
  if (!address) return null;
  const segments = [
    Array.isArray(address.addressLines) ? address.addressLines.join(", ") : "",
    address.locality,
    address.administrativeArea,
    address.postalCode,
    address.country,
  ]
    .filter(Boolean)
    .join(", ");

  return segments || null;
}

export async function fetchLocationsDataForSync(
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<LocationData[]> {
  const locations: LocationData[] = [];
  let nextPageToken: string | undefined;
  const nowIso = new Date().toISOString();

  const locationsTimerStart = Date.now();

  do {
    const url = new URL(`${GBP_LOC_BASE}/${accountResource}/locations`);
    // OPTIMIZED: Only request essential fields to reduce memory usage and response size
    // Removed: regularHours,specialHours,moreHours,serviceItems,labels (rarely used, can be fetched on-demand)
    url.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,openInfo,metadata,latlng",
    );
    url.searchParams.set("pageSize", "50"); // Reduced from 100 to prevent memory issues
    url.searchParams.set("alt", "json");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error?.message || "Failed to fetch locations from Google",
      );
    }

    const payload = await response.json();
    const googleLocations = payload.locations || [];

    for (const rawLocation of googleLocations) {
      const googleLocationId = rawLocation.name;
      if (!googleLocationId) continue;

      const normalized = googleLocationId.replace(/[^a-zA-Z0-9]/g, "_");
      const address = formatAddress(rawLocation.storefrontAddress);
      const phone =
        rawLocation.phoneNumbers?.primaryPhone ||
        rawLocation.phoneNumbers?.additionalPhones?.[0] ||
        null;
      const category =
        rawLocation.categories?.primaryCategory?.displayName || null;
      const rating =
        rawLocation.metadata?.starRating ??
        rawLocation.profile?.overallStarRating ??
        null;
      const reviewCount =
        rawLocation.metadata?.totalReviewCount ??
        rawLocation.profile?.reviewCount ??
        null;
      const latitude = rawLocation.latlng?.latitude ?? null;
      const longitude = rawLocation.latlng?.longitude ?? null;
      const profileCompleteness =
        rawLocation.metadata?.profileCompleteness ?? null;
      const isActive = rawLocation.openInfo?.status !== "CLOSED_PERMANENTLY";
      const status =
        rawLocation.openInfo?.status || rawLocation.metadata?.status || null;

      locations.push({
        gmb_account_id: gmbAccountId,
        user_id: userId,
        location_id: googleLocationId,
        normalized_location_id: normalized,
        location_name: rawLocation.title || "Untitled Location",
        address,
        phone,
        website: rawLocation.websiteUri || null,
        category,
        rating,
        review_count: reviewCount,
        latitude,
        longitude,
        profile_completeness: profileCompleteness,
        is_active: isActive,
        status,
        metadata: rawLocation,
        last_synced_at: nowIso,
      });
    }

    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  console.warn(
    "[GMB Sync v2] fetchLocations completed in",
    Date.now() - locationsTimerStart,
    "ms",
  );
  return locations;
}

export async function fetchReviewsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<ReviewData[]> {
  const reviewsTimerStart = Date.now();

  // ⚡ OPTIMIZED: Parallel fetching with concurrency limit to avoid rate limiting
  const fetchReviewsForLocation = async (location: LocationData) => {
    const locationReviews: ReviewData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    let nextPageToken: string | undefined;
    do {
      const url = new URL(`${REVIEWS_BASE}/${locationResource}/reviews`);
      url.searchParams.set("pageSize", "50");
      if (nextPageToken) {
        url.searchParams.set("pageToken", nextPageToken);
      }

      try {
        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.warn("[GMB Sync v2] Reviews fetch failed", {
            location: location.location_id,
            error: errorData,
          });
          break;
        }

        const payload = await response.json();
        const googleReviews = payload.reviews || [];

        for (const review of googleReviews) {
          const reviewId = review.reviewId || review.name?.split("/").pop();
          if (!reviewId) continue;

          locationReviews.push({
            user_id: userId,
            location_id: undefined,
            google_location_id: location.location_id,
            gmb_account_id: gmbAccountId,
            review_id: reviewId,
            reviewer_name: review.reviewer?.displayName || "Anonymous",
            reviewer_display_name: review.reviewer?.displayName || null,
            reviewer_photo: review.reviewer?.profilePhotoUrl || null,
            rating: mapStarRating(review.starRating),
            review_text: review.comment || null,
            review_date: review.createTime || new Date().toISOString(),
            reply_text: review.reviewReply?.comment || null,
            reply_date: review.reviewReply?.updateTime || null,
            has_reply: Boolean(review.reviewReply),
            status: review.reviewReply ? "responded" : "pending",
            sentiment: review.commentSummary?.positiveRatio
              ? review.commentSummary.positiveRatio > 0.5
                ? "positive"
                : "neutral"
              : null,
            google_name: review.name || null,
            review_url: null,
          });
        }

        nextPageToken = payload.nextPageToken;
      } catch (error) {
        console.error(
          `[GMB Sync v2] Error fetching reviews for ${location.location_id}:`,
          error,
        );
        break;
      }
    } while (nextPageToken);

    return locationReviews;
  };

  // Use concurrency limit to avoid rate limiting (max 5 parallel requests)
  const reviewsByLocation = await withConcurrencyLimit(
    locations,
    fetchReviewsForLocation,
  );
  const allReviews = reviewsByLocation.flat();

  console.warn(
    "[GMB Sync v2] fetchReviews completed in",
    Date.now() - reviewsTimerStart,
    "ms (rate-limited parallel execution)",
  );
  return allReviews;
}

export async function fetchQuestionsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<QuestionData[]> {
  const questionsTimerStart = Date.now();

  // ⚡ OPTIMIZED: Parallel fetching with concurrency limit
  const fetchQuestionsForLocation = async (location: LocationData) => {
    const locationQuestions: QuestionData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${QANDA_BASE}/${locationResource}/questions`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn("[GMB Sync v2] Questions fetch failed", {
          location: location.location_id,
          error: errorData,
        });
        return [];
      }

      const payload = await response.json();
      const googleQuestions = payload.questions || [];

      for (const question of googleQuestions) {
        const questionId = question.name?.split("/").pop();
        if (!questionId) continue;

        const topAnswer = question.topAnswers?.[0] || null;
        const status = topAnswer?.text ? "answered" : "unanswered";

        locationQuestions.push({
          user_id: userId,
          location_id: undefined,
          google_location_id: location.location_id,
          gmb_account_id: gmbAccountId,
          question_id: questionId,
          author_name: question.author?.displayName || "Anonymous",
          author_display_name: question.author?.displayName || null,
          author_profile_photo_url: question.author?.profilePhotoUrl || null,
          author_type: question.author?.type || "CUSTOMER",
          question_text: question.text || "",
          question_date: question.createTime || new Date().toISOString(),
          answer_text: topAnswer?.text || null,
          answer_date: topAnswer?.updateTime || null,
          answer_author: topAnswer?.author?.displayName || null,
          answer_id: topAnswer?.name?.split("/").pop() || null,
          upvote_count: question.upvoteCount || 0,
          total_answer_count: question.totalAnswerCount || 0,
          status,
          google_resource_name: question.name || null,
        });
      }
    } catch (error) {
      console.error(
        `[GMB Sync v2] Error fetching questions for ${location.location_id}:`,
        error,
      );
    }

    return locationQuestions;
  };

  // Use concurrency limit to avoid rate limiting
  const questionsByLocation = await withConcurrencyLimit(
    locations,
    fetchQuestionsForLocation,
  );
  const allQuestions = questionsByLocation.flat();

  console.warn(
    "[GMB Sync v2] fetchQuestions completed in",
    Date.now() - questionsTimerStart,
    "ms (rate-limited parallel execution)",
  );
  return allQuestions;
}

export async function fetchPostsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<any[]> {
  const postsTimerStart = Date.now();

  // ⚡ OPTIMIZED: Parallel fetching with concurrency limit
  const fetchPostsForLocation = async (location: LocationData) => {
    const locationPosts: any[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${POSTS_BASE}/${locationResource}/localPosts`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn("[GMB Sync v2] Posts fetch failed", {
          location: location.location_id,
          status: response.status,
        });
        return [];
      }

      const payload = await response.json();
      const googlePosts = payload.localPosts || [];

      for (const post of googlePosts) {
        const postId = post.name?.split("/").pop();
        if (!postId) continue;

        locationPosts.push({
          user_id: userId,
          gmb_account_id: gmbAccountId,
          google_location_id: location.location_id,
          post_id: postId,
          post_type: post.topicType || "STANDARD",
          title: post.summary || null,
          content: post.languageCode || null,
          media_urls:
            post.media
              ?.map((m: any) => m.googleUrl || m.sourceUrl)
              .filter(Boolean) || [],
          event_title: post.event?.title || null,
          event_start_date: post.event?.schedule?.startDate || null,
          event_end_date: post.event?.schedule?.endDate || null,
          offer_code: post.offer?.couponCode || null,
          offer_url: post.offer?.redeemOnlineUrl || null,
          call_to_action: post.callToAction?.actionType || null,
          call_to_action_url: post.callToAction?.url || null,
          created_at: post.createTime || new Date().toISOString(),
          updated_at: post.updateTime || new Date().toISOString(),
          state: post.state || "LIVE",
          google_name: post.name || null,
        });
      }
    } catch (error) {
      console.error(
        `[GMB Sync v2] Error fetching posts for ${location.location_id}:`,
        error,
      );
    }

    return locationPosts;
  };

  // Use concurrency limit to avoid rate limiting
  const postsByLocation = await withConcurrencyLimit(
    locations,
    fetchPostsForLocation,
  );
  const allPosts = postsByLocation.flat();

  console.warn(
    "[GMB Sync v2] fetchPosts completed in",
    Date.now() - postsTimerStart,
    "ms (rate-limited parallel execution)",
  );
  return allPosts;
}

export async function fetchMediaDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<any[]> {
  const mediaTimerStart = Date.now();

  // ⚡ OPTIMIZED: Parallel fetching with concurrency limit
  const fetchMediaForLocation = async (location: LocationData) => {
    const locationMedia: any[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${MEDIA_BASE}/${locationResource}/media`;
      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn("[GMB Sync v2] Media fetch failed", {
          location: location.location_id,
          status: response.status,
        });
        return [];
      }

      const payload = await response.json();
      const googleMedia = payload.mediaItems || [];

      for (const item of googleMedia) {
        const mediaId = item.name?.split("/").pop();
        if (!mediaId) continue;

        locationMedia.push({
          user_id: userId,
          gmb_account_id: gmbAccountId,
          google_location_id: location.location_id,
          media_id: mediaId,
          media_format: item.mediaFormat || "PHOTO",
          source_url: item.sourceUrl || null,
          google_url: item.googleUrl || null,
          thumbnail_url: item.thumbnailUrl || null,
          description: item.description || null,
          location_association: item.locationAssociation?.category || null,
          create_time: item.createTime || new Date().toISOString(),
          google_name: item.name || null,
        });
      }
    } catch (error) {
      console.error(
        `[GMB Sync v2] Error fetching media for ${location.location_id}:`,
        error,
      );
    }

    return locationMedia;
  };

  // Use concurrency limit to avoid rate limiting
  const mediaByLocation = await withConcurrencyLimit(
    locations,
    fetchMediaForLocation,
  );
  const allMedia = mediaByLocation.flat();

  console.warn(
    "[GMB Sync v2] fetchMedia completed in",
    Date.now() - mediaTimerStart,
    "ms (rate-limited parallel execution)",
  );
  return allMedia;
}

export interface InsightsData {
  user_id: string;
  location_id: string;
  gmb_account_id: string;
  metric_date: string;
  views_search: number | null;
  views_maps: number | null;
  website_clicks: number | null;
  phone_calls: number | null;
  direction_requests: number | null;
  photo_views: number | null;
  total_searches: number | null;
  direct_searches: number | null;
  discovery_searches: number | null;
  branded_searches: number | null;
  metadata: Record<string, unknown> | null;
}

export async function fetchInsightsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<InsightsData[]> {
  const insightsTimerStart = Date.now();

  // Calculate date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  // ⚡ OPTIMIZED: Parallel fetching with concurrency limit
  const fetchInsightsForLocation = async (location: LocationData) => {
    const locationInsights: InsightsData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      // Use the reportInsights endpoint (v4 API)
      const endpoint = `${INSIGHTS_BASE}/${locationResource}:reportInsights`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locationNames: [locationResource],
          basicRequest: {
            metricRequests: [
              { metric: "QUERIES_DIRECT" },
              { metric: "QUERIES_INDIRECT" },
              { metric: "QUERIES_CHAIN" },
              { metric: "VIEWS_MAPS" },
              { metric: "VIEWS_SEARCH" },
              { metric: "ACTIONS_WEBSITE" },
              { metric: "ACTIONS_PHONE" },
              { metric: "ACTIONS_DRIVING_DIRECTIONS" },
              { metric: "PHOTOS_VIEWS_MERCHANT" },
              { metric: "PHOTOS_VIEWS_CUSTOMERS" },
            ],
            timeRange: {
              startTime: `${formatDate(startDate)}T00:00:00Z`,
              endTime: `${formatDate(endDate)}T23:59:59Z`,
            },
          },
        }),
      });

      if (!response.ok) {
        console.warn("[GMB Sync v2] Insights fetch failed", {
          location: location.location_id,
          status: response.status,
        });
        return [];
      }

      const payload = await response.json();
      const locationReports = payload.locationMetrics || [];

      for (const report of locationReports) {
        const metricValues = report.metricValues || [];

        // Aggregate metrics into a single record per location
        const metrics: Record<string, number> = {};
        for (const mv of metricValues) {
          const metricName = mv.metric;
          const totalValue = mv.totalValue?.value || 0;
          metrics[metricName] = totalValue;
        }

        locationInsights.push({
          user_id: userId,
          location_id: location.location_id,
          gmb_account_id: gmbAccountId,
          metric_date: formatDate(endDate),
          views_search: metrics["VIEWS_SEARCH"] || null,
          views_maps: metrics["VIEWS_MAPS"] || null,
          website_clicks: metrics["ACTIONS_WEBSITE"] || null,
          phone_calls: metrics["ACTIONS_PHONE"] || null,
          direction_requests: metrics["ACTIONS_DRIVING_DIRECTIONS"] || null,
          photo_views:
            (metrics["PHOTOS_VIEWS_MERCHANT"] || 0) +
              (metrics["PHOTOS_VIEWS_CUSTOMERS"] || 0) || null,
          total_searches:
            (metrics["QUERIES_DIRECT"] || 0) +
              (metrics["QUERIES_INDIRECT"] || 0) +
              (metrics["QUERIES_CHAIN"] || 0) || null,
          direct_searches: metrics["QUERIES_DIRECT"] || null,
          discovery_searches: metrics["QUERIES_INDIRECT"] || null,
          branded_searches: metrics["QUERIES_CHAIN"] || null,
          metadata: payload,
        });
      }
    } catch (error) {
      console.error(
        `[GMB Sync v2] Error fetching insights for ${location.location_id}:`,
        error,
      );
    }

    return locationInsights;
  };

  // Use concurrency limit to avoid rate limiting
  const insightsByLocation = await withConcurrencyLimit(
    locations,
    fetchInsightsForLocation,
  );
  const allInsights = insightsByLocation.flat();

  console.warn(
    "[GMB Sync v2] fetchInsights completed in",
    Date.now() - insightsTimerStart,
    "ms (rate-limited parallel execution)",
  );
  return allInsights;
}

export async function performTransactionalSync(
  accountId: string,
  includeQuestions = true,
  includePosts = false,
  includeMedia = false,
  includeInsights = true, // Enable insights by default
  isInternalCall = false,
) {
  const supabase = await createClient();
  const operationStart = Date.now();

  let userId: string;

  if (isInternalCall) {
    // For internal worker calls, use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Try by ID first
    let { data: accountData, error: accountLookupError } = await adminClient
      .from("gmb_accounts")
      .select("user_id, id, account_id")
      .eq("id", accountId)
      .maybeSingle();

    // If not found, try by account_id
    if (!accountData) {
      const { data: accountData2 } = await adminClient
        .from("gmb_accounts")
        .select("user_id, id, account_id")
        .eq("account_id", accountId)
        .maybeSingle();

      if (accountData2?.user_id) {
        accountData = accountData2;
        accountLookupError = null;
      }
    }

    // If not found, try one more time with special characters removed
    // For Google-format account IDs like "accounts/123456789"
    if (!accountData) {
      const normalizedId = accountId.replace(/[\W_]+/g, "");
      const { data: accountData2 } = await adminClient
        .from("gmb_accounts")
        .select("user_id, id, account_id")
        .filter("account_id", "ilike", `%${normalizedId}%`)
        .maybeSingle();

      if (accountData2?.user_id) {
        accountData = accountData2;
        accountLookupError = null;
      }
    }

    if (accountLookupError || !accountData?.user_id) {
      throw new Error("Account not found for internal call");
    }
    userId = accountData.user_id;
  } else {
    // For user calls, verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("Not authenticated");
    }
    userId = user.id;
  }

  // Use admin client for internal calls to bypass RLS
  const dbClient = isInternalCall ? createAdminClient() : supabase;

  const { data: account, error: accountError } = await dbClient
    .from("gmb_accounts")
    .select("id, user_id, account_id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (accountError || !account) {
    console.error("[GMB Sync] Account lookup failed:", accountError);
    throw new Error("GMB account not found");
  }

  const progressEmitter = createProgressEmitter({
    userId,
    accountId,
    includeQuestions,
    includePosts,
    includeMedia,
    includeInsights,
  });

  progressEmitter.emit("init", "running", {
    message: "Starting Google Business sync",
  });

  let currentStage: SyncStage = "init";

  try {
    // Use TokenManager to handle automatic token refresh during long-running sync
    const initialToken = await getValidAccessToken(supabase, accountId);
    const tokenManager = new TokenManager(
      initialToken,
      3600,
      supabase,
      accountId,
    );

    currentStage = "locations_fetch";
    const locations = await fetchLocationsDataForSync(
      account.account_id,
      accountId,
      userId,
      await tokenManager.getToken(), // Get fresh token if needed
    );
    progressEmitter.emit("locations_fetch", "completed", {
      counts: { locations: locations.length },
      message: `Fetched ${locations.length} locations`,
    });

    currentStage = "reviews_fetch";
    const reviews = await fetchReviewsDataForSync(
      locations,
      account.account_id,
      accountId,
      userId,
      await tokenManager.getToken(), // Get fresh token if needed
    );
    progressEmitter.emit("reviews_fetch", "completed", {
      counts: { reviews: reviews.length },
      message: `Fetched ${reviews.length} reviews`,
    });

    let questions: QuestionData[] = [];
    if (includeQuestions) {
      currentStage = "questions_fetch";
      questions = await fetchQuestionsDataForSync(
        locations,
        account.account_id,
        accountId,
        userId,
        await tokenManager.getToken(), // Get fresh token if needed
      );
      progressEmitter.emit("questions_fetch", "completed", {
        counts: { questions: questions.length },
        message: `Fetched ${questions.length} questions`,
      });
    }

    let posts: any[] = [];
    if (includePosts) {
      currentStage = "posts_fetch";
      posts = await fetchPostsDataForSync(
        locations,
        account.account_id,
        accountId,
        userId,
        await tokenManager.getToken(), // Get fresh token if needed
      );
      progressEmitter.emit("posts_fetch", "completed", {
        counts: { posts: posts.length },
        message: `Fetched ${posts.length} posts`,
      });
    }

    let media: any[] = [];
    if (includeMedia) {
      currentStage = "media_fetch";
      media = await fetchMediaDataForSync(
        locations,
        account.account_id,
        accountId,
        userId,
        await tokenManager.getToken(), // Get fresh token if needed
      );
      progressEmitter.emit("media_fetch", "completed", {
        counts: { media: media.length },
        message: `Fetched ${media.length} media items`,
      });
    }

    let insights: InsightsData[] = [];
    if (includeInsights) {
      currentStage = "insights_fetch";
      insights = await fetchInsightsDataForSync(
        locations,
        account.account_id,
        accountId,
        userId,
        await tokenManager.getToken(), // Get fresh token if needed
      );
      progressEmitter.emit("insights_fetch", "completed", {
        counts: { insights: insights.length },
        message: `Fetched ${insights.length} performance metrics`,
      });
    }

    currentStage = "transaction";
    progressEmitter.emit("transaction", "running", {
      message: "Applying transactional sync",
    });
    const transactionResult = await runSyncTransactionWithRetry(
      supabase,
      {
        accountId,
        locations,
        reviews,
        questions,
        posts: includePosts ? posts : undefined,
        media: includeMedia ? media : undefined,
        insights: includeInsights ? insights : undefined,
      },
      3,
    );
    progressEmitter.updateSyncId(transactionResult.sync_id);
    progressEmitter.emit("transaction", "completed", {
      counts: {
        locations: transactionResult.locations_synced,
        reviews: transactionResult.reviews_synced,
        questions: transactionResult.questions_synced,
        posts: transactionResult.posts_synced || 0,
        media: transactionResult.media_synced || 0,
        insights: transactionResult.insights_synced || 0,
      },
      message: "Database transaction committed",
    });

    currentStage = "cache_refresh";
    progressEmitter.emit("cache_refresh", "running", {
      message: "Refreshing dashboard caches",
    });
    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, userId);
    progressEmitter.emit("cache_refresh", "completed", {
      message: "Cache refreshed",
    });

    progressEmitter.emit("complete", "completed", {
      message: "Sync completed successfully",
    });

    const durationMs = Date.now() - operationStart;
    await logAction("sync", "gmb_account", accountId, {
      status: "success",
      took_ms: durationMs,
      counts: {
        locations: transactionResult.locations_synced,
        reviews: transactionResult.reviews_synced,
        questions: transactionResult.questions_synced,
      },
    });
    await trackSyncResult(userId, true, durationMs);

    return {
      ...transactionResult,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    progressEmitter.emit(currentStage, "error", {
      message,
      error: message,
    });
    progressEmitter.emit("complete", "error", {
      message,
      error: message,
    });
    const durationMs = Date.now() - operationStart;
    await logAction("sync", "gmb_account", accountId, {
      status: "failed",
      stage: currentStage,
      took_ms: durationMs,
      error: message,
    });
    await trackSyncResult(userId ?? null, false, durationMs);
    throw error;
  }
}
