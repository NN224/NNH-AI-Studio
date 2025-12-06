"use server";

import {
  publishSyncProgress,
  type SyncProgressEvent,
} from "@/lib/cache/cache-manager";
import { invalidateGMBCache } from "@/lib/cache/gmb-cache";
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
import { API_TIMEOUTS, fetchWithTimeout } from "@/lib/utils/error-handling";
import { gmbLogger } from "@/lib/utils/logger";
import { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SYNC_TIMEOUTS } from "@/lib/config/timeouts";

const GBP_LOC_BASE = GMB_CONSTANTS.GBP_LOC_BASE;
const REVIEWS_BASE = GMB_CONSTANTS.GMB_V4_BASE;
const QANDA_BASE = GMB_CONSTANTS.QANDA_BASE;
const POSTS_BASE = GMB_CONSTANTS.GMB_V4_BASE;
const MEDIA_BASE = GMB_CONSTANTS.GMB_V4_BASE;

// Rate limiting configuration
const MAX_CONCURRENT_REQUESTS = 5;
const REQUEST_DELAY_MS = 200;

// Token refresh configuration - استخدام القيمة الموحدة
const TOKEN_REFRESH_BUFFER_MS = SYNC_TIMEOUTS.TOKEN_REFRESH_BUFFER;

// Sync timeout configuration - استخدام القيمة الموحدة
const SYNC_TIMEOUT_MS = SYNC_TIMEOUTS.TOTAL_SYNC;

// Create a timeout controller for sync operations
function createSyncTimeout(ms: number = SYNC_TIMEOUT_MS) {
  let timeoutId: NodeJS.Timeout | null = null;
  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Sync operation timed out after ${ms / 1000} seconds`));
    }, ms);
  });

  return {
    promise,
    clear: () => {
      if (timeoutId) clearTimeout(timeoutId);
    },
  };
}

/**
 * Token manager to handle automatic refresh during long-running sync operations
 * ✅ تحسينات:
 * - Exponential backoff (1s, 2s, 4s, 8s, 16s)
 * - 5 محاولات بدلاً من 2
 * - Proactive refresh قبل 10 دقائق من الانتهاء
 */
class TokenManager {
  private token: string;
  private tokenExpiresAt: number;
  private supabase: SupabaseClient;
  private accountId: string;

  constructor(
    initialToken: string,
    expiresInSeconds: number,
    supabase: SupabaseClient,
    accountId: string,
  ) {
    this.token = initialToken;
    this.tokenExpiresAt =
      Date.now() + expiresInSeconds * 1000 - TOKEN_REFRESH_BUFFER_MS;
    this.supabase = supabase;
    this.accountId = accountId;
  }

  async getToken(): Promise<string> {
    if (Date.now() >= this.tokenExpiresAt) {
      gmbLogger.warn("Token expired or expiring soon, refreshing...", {
        accountId: this.accountId,
      });
      
      // ✅ استخدام exponential backoff retry
      this.token = await this.refreshTokenWithRetry();
      this.tokenExpiresAt =
        Date.now() + 3600 * 1000 - TOKEN_REFRESH_BUFFER_MS;
      
      gmbLogger.info("Token refreshed successfully", {
        accountId: this.accountId,
      });
    }
    return this.token;
  }

  /**
   * ✅ جديد: Refresh token مع exponential backoff
   */
  private async refreshTokenWithRetry(maxAttempts: number = 5): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const newToken = await getValidAccessToken(
          this.supabase,
          this.accountId,
        );
        
        if (newToken) {
          gmbLogger.info("Token refresh successful", {
            accountId: this.accountId,
            attempt: attempt + 1,
          });
          return newToken;
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // حساب exponential backoff delay: 1s, 2s, 4s, 8s, 16s (max 30s)
        const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
        
        gmbLogger.warn(
          `Token refresh failed (attempt ${attempt + 1}/${maxAttempts})`,
          {
            accountId: this.accountId,
            nextRetryIn: `${delay}ms`,
            error: lastError.message,
          },
        );

        // لا ننتظر في المحاولة الأخيرة
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // فشلت جميع المحاولات
    gmbLogger.error(
      "Token refresh failed after all retry attempts",
      lastError || new Error("Unknown error"),
      { accountId: this.accountId, attempts: maxAttempts },
    );

    throw new Error(
      `Failed to refresh access token after ${maxAttempts} attempts: ${lastError?.message}`,
    );
  }
}

async function withConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = MAX_CONCURRENT_REQUESTS,
): Promise<R[]> {
  const results: R[] = [];
  const errors: Error[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = fn(item)
      .then((result) => {
        results.push(result);
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        errors.push(err);
        gmbLogger.warn("Concurrent task failed", { error: err.message });
      });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      // Clean up completed promises
      executing.length = 0;
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
    }
  }

  await Promise.all(executing);

  if (errors.length > 0) {
    gmbLogger.warn("Some concurrent tasks failed", {
      totalErrors: errors.length,
      firstError: errors[0]?.message,
    });
  }

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

const PERFORMANCE_BASE = GMB_CONSTANTS.PERFORMANCE_BASE;

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

// Basic types for Google API responses to avoid 'any'
interface GooglePost {
  name: string;
  topicType?: string;
  summary?: string;
  languageCode?: string;
  media?: Array<{ googleUrl?: string; sourceUrl?: string }>;
  event?: {
    title?: string;
    schedule?: { startDate?: string; endDate?: string };
  };
  offer?: { couponCode?: string; redeemOnlineUrl?: string };
  callToAction?: { actionType?: string; url?: string };
  createTime?: string;
  updateTime?: string;
  state?: string;
}

interface GoogleMediaItem {
  name: string;
  mediaFormat?: string;
  sourceUrl?: string;
  googleUrl?: string;
  thumbnailUrl?: string;
  description?: string;
  locationAssociation?: { category?: string };
  createTime?: string;
}

interface UnifiedPostData {
  user_id: string;
  gmb_account_id: string;
  google_location_id: string;
  post_id: string;
  post_type: string;
  title: string | null;
  content: string | null;
  media_urls: string[];
  event_title: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  offer_code: string | null;
  offer_url: string | null;
  call_to_action: string | null;
  call_to_action_url: string | null;
  created_at: string;
  updated_at: string;
  state: string;
  google_name: string | null;
}

interface UnifiedMediaData {
  user_id: string;
  gmb_account_id: string;
  google_location_id: string;
  media_id: string;
  media_format: string;
  source_url: string | null;
  google_url: string | null;
  thumbnail_url: string | null;
  description: string | null;
  location_association: string | null;
  create_time: string;
  google_name: string | null;
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
    url.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,openInfo,metadata,latlng",
    );
    url.searchParams.set("pageSize", "50");
    url.searchParams.set("alt", "json");
    if (nextPageToken) {
      url.searchParams.set("pageToken", nextPageToken);
    }

    const response = await fetchWithTimeout(
      url.toString(),
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      },
      API_TIMEOUTS.GOOGLE_API,
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      gmbLogger.error(
        "Failed to fetch locations from Google",
        new Error(`HTTP ${response.status}`),
        {
          status: response.status,
          errorData,
          accountId: gmbAccountId,
        },
      );
      throw new Error(
        (errorData as { error?: { message?: string } })?.error?.message ||
          `Failed to fetch locations from Google: HTTP ${response.status}`,
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
        last_sync: nowIso, // Also set for compatibility
      });
    }

    nextPageToken = payload.nextPageToken;
  } while (nextPageToken);

  gmbLogger.info("fetchLocations completed", {
    durationMs: Date.now() - locationsTimerStart,
  });
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
        const response = await fetchWithTimeout(
          url.toString(),
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              Accept: "application/json",
            },
          },
          API_TIMEOUTS.GOOGLE_API,
        );

        if (!response.ok) {
          const errorData = await response.json().catch((e) => {
            gmbLogger.debug("Failed to parse reviews error response", {
              error: e,
            });
            return {};
          });
          gmbLogger.warn("Reviews fetch failed", {
            locationId: location.location_id,
            status: response.status,
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
        gmbLogger.error(
          "Error fetching reviews",
          error instanceof Error ? error : new Error(String(error)),
          { locationId: location.location_id },
        );
        break;
      }
    } while (nextPageToken);

    return locationReviews;
  };

  const reviewsByLocation = await withConcurrencyLimit(
    locations,
    fetchReviewsForLocation,
  );
  const allReviews = reviewsByLocation.flat();

  gmbLogger.info("fetchReviews completed", {
    durationMs: Date.now() - reviewsTimerStart,
    count: allReviews.length,
  });
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

  const fetchQuestionsForLocation = async (location: LocationData) => {
    const locationQuestions: QuestionData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${QANDA_BASE}/${locationResource}/questions`;
      const response = await fetchWithTimeout(
        endpoint,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        API_TIMEOUTS.GOOGLE_API,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        gmbLogger.warn("Questions fetch failed", {
          locationId: location.location_id,
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
      gmbLogger.error(
        "Error fetching questions",
        error instanceof Error ? error : new Error(String(error)),
        { locationId: location.location_id },
      );
    }

    return locationQuestions;
  };

  const questionsByLocation = await withConcurrencyLimit(
    locations,
    fetchQuestionsForLocation,
  );
  const allQuestions = questionsByLocation.flat();

  gmbLogger.info("fetchQuestions completed", {
    durationMs: Date.now() - questionsTimerStart,
    count: allQuestions.length,
  });
  return allQuestions;
}

export async function fetchPostsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<UnifiedPostData[]> {
  const postsTimerStart = Date.now();

  const fetchPostsForLocation = async (location: LocationData) => {
    const locationPosts: UnifiedPostData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${POSTS_BASE}/${locationResource}/localPosts`;
      const response = await fetchWithTimeout(
        endpoint,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        API_TIMEOUTS.GOOGLE_API,
      );

      if (!response.ok) {
        gmbLogger.warn("Posts fetch failed", {
          locationId: location.location_id,
          status: response.status,
        });
        return [];
      }

      const payload = await response.json();
      const googlePosts: GooglePost[] = payload.localPosts || [];

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
              ?.map(
                (m: { googleUrl?: string; sourceUrl?: string }) =>
                  m.googleUrl || m.sourceUrl,
              )
              .filter((url): url is string => Boolean(url)) || [],
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
      gmbLogger.error(
        "Error fetching posts",
        error instanceof Error ? error : new Error(String(error)),
        { locationId: location.location_id },
      );
    }

    return locationPosts;
  };

  const postsByLocation = await withConcurrencyLimit(
    locations,
    fetchPostsForLocation,
  );
  const allPosts = postsByLocation.flat();

  gmbLogger.info("fetchPosts completed", {
    durationMs: Date.now() - postsTimerStart,
    count: allPosts.length,
  });
  return allPosts;
}

export async function fetchMediaDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<UnifiedMediaData[]> {
  const mediaTimerStart = Date.now();

  const fetchMediaForLocation = async (location: LocationData) => {
    const locationMedia: UnifiedMediaData[] = [];
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) return [];

    try {
      const endpoint = `${MEDIA_BASE}/${locationResource}/media`;
      const response = await fetchWithTimeout(
        endpoint,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        API_TIMEOUTS.GOOGLE_API,
      );

      if (!response.ok) {
        gmbLogger.warn("Media fetch failed", {
          locationId: location.location_id,
          status: response.status,
        });
        return [];
      }

      const payload = await response.json();
      const googleMedia: GoogleMediaItem[] = payload.mediaItems || [];

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
      gmbLogger.error(
        "Error fetching media",
        error instanceof Error ? error : new Error(String(error)),
        { locationId: location.location_id },
      );
    }

    return locationMedia;
  };

  const mediaByLocation = await withConcurrencyLimit(
    locations,
    fetchMediaForLocation,
  );
  const allMedia = mediaByLocation.flat();

  gmbLogger.info("fetchMedia completed", {
    durationMs: Date.now() - mediaTimerStart,
    count: allMedia.length,
  });
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

const PERFORMANCE_METRICS = [
  "BUSINESS_IMPRESSIONS_DESKTOP_MAPS",
  "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH",
  "BUSINESS_IMPRESSIONS_MOBILE_MAPS",
  "BUSINESS_IMPRESSIONS_MOBILE_SEARCH",
  "BUSINESS_CONVERSATIONS",
  "BUSINESS_DIRECTION_REQUESTS",
  "CALL_CLICKS",
  "WEBSITE_CLICKS",
  "BUSINESS_BOOKINGS",
  "BUSINESS_FOOD_ORDERS",
] as const;

export async function fetchInsightsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<InsightsData[]> {
  // const insightsTimerStart = Date.now(); // Removed unused var

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const fetchInsightsForLocation = async (location: LocationData) => {
    const locationInsights: InsightsData[] = [];
    const cleanLocationId = location.location_id.replace(
      /^(accounts\/[^/]+\/)?locations\//,
      "",
    );
    const endpoint = `${PERFORMANCE_BASE}/locations/${cleanLocationId}:fetchMultiDailyMetricsTimeSeries`;

    try {
      const url = new URL(endpoint);
      url.searchParams.set(
        "dailyRange.startDate.year",
        startDate.getFullYear().toString(),
      );
      url.searchParams.set(
        "dailyRange.startDate.month",
        (startDate.getMonth() + 1).toString(),
      );
      url.searchParams.set(
        "dailyRange.startDate.day",
        startDate.getDate().toString(),
      );
      url.searchParams.set(
        "dailyRange.endDate.year",
        endDate.getFullYear().toString(),
      );
      url.searchParams.set(
        "dailyRange.endDate.month",
        (endDate.getMonth() + 1).toString(),
      );
      url.searchParams.set(
        "dailyRange.endDate.day",
        endDate.getDate().toString(),
      );

      PERFORMANCE_METRICS.forEach((metric) => {
        url.searchParams.append("dailyMetrics", metric);
      });

      const response = await fetchWithTimeout(
        url.toString(),
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
        API_TIMEOUTS.GOOGLE_API,
      );

      if (!response.ok) {
        return [];
      }

      const payload = await response.json();
      const multiDailyMetricTimeSeries =
        payload.multiDailyMetricTimeSeries || [];

      const metrics: Record<string, number> = {};

      for (const series of multiDailyMetricTimeSeries) {
        const metricName = series.dailyMetric;
        const dailyValues = series.timeSeries?.datedValues || [];
        let total = 0;
        for (const dv of dailyValues) {
          total += parseInt(dv.value || "0", 10);
        }
        metrics[metricName] = total;
      }

      const viewsSearch =
        (metrics["BUSINESS_IMPRESSIONS_DESKTOP_SEARCH"] || 0) +
        (metrics["BUSINESS_IMPRESSIONS_MOBILE_SEARCH"] || 0);
      const viewsMaps =
        (metrics["BUSINESS_IMPRESSIONS_DESKTOP_MAPS"] || 0) +
        (metrics["BUSINESS_IMPRESSIONS_MOBILE_MAPS"] || 0);

      locationInsights.push({
        user_id: userId,
        location_id: location.location_id,
        gmb_account_id: gmbAccountId,
        metric_date: formatDate(endDate),
        views_search: viewsSearch || null,
        views_maps: viewsMaps || null,
        website_clicks: metrics["WEBSITE_CLICKS"] || null,
        phone_calls: metrics["CALL_CLICKS"] || null,
        direction_requests: metrics["BUSINESS_DIRECTION_REQUESTS"] || null,
        photo_views: null,
        total_searches: viewsSearch + viewsMaps || null,
        direct_searches: null,
        discovery_searches: null,
        branded_searches: null,
        metadata: {
          api_version: "performance_v1",
          raw_metrics: metrics,
          date_range: {
            start: formatDate(startDate),
            end: formatDate(endDate),
          },
        },
      });
    } catch (error) {
      gmbLogger.error(
        "Error fetching insights",
        error instanceof Error ? error : new Error(String(error)),
        { locationId: location.location_id },
      );
    }

    return locationInsights;
  };

  const insightsByLocation = await withConcurrencyLimit(
    locations,
    fetchInsightsForLocation,
  );
  return insightsByLocation.flat();
}

export async function performTransactionalSync(
  accountId: string,
  includeQuestions = true,
  includePosts = false,
  includeMedia = false,
  includeInsights = true,
  isInternalCall = false,
) {
  const supabase = await createClient();
  const operationStart = Date.now();

  let userId: string;

  if (isInternalCall) {
    const adminClient = createAdminClient();

    let { data: accountData, error: accountLookupError } = await adminClient
      .from("gmb_accounts")
      .select("user_id, id, account_id")
      .eq("id", accountId)
      .maybeSingle();

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
      throw new Error("Account not found for internal GMB sync call");
    }
    userId = accountData.user_id;
  } else {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error("User not authenticated for GMB sync");
    }
    userId = user.id;
  }

  // ✅ CORRECTED: Select the right client for DB operations
  // If internal, use adminClient (bypass RLS). If user, use supabase (standard).
  const dbClient = isInternalCall ? createAdminClient() : supabase;

  const { data: account, error: accountError } = await dbClient
    .from("gmb_accounts")
    .select("id, user_id, account_id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .single();

  if (accountError || !account) {
    gmbLogger.error(
      "Account lookup failed",
      accountError instanceof Error
        ? accountError
        : new Error(String(accountError)),
      { accountId },
    );
    throw new Error(`GMB account not found: ${accountId}`);
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
  const syncTimeout = createSyncTimeout();

  try {
    // Race between sync operation and timeout
    const result = await Promise.race([
      (async () => {
        const initialToken = await getValidAccessToken(dbClient, accountId);
        const tokenManager = new TokenManager(
          initialToken,
          3600,
          dbClient,
          accountId,
        );

        currentStage = "locations_fetch";
        const locations = await fetchLocationsDataForSync(
          account.account_id,
          accountId,
          userId,
          await tokenManager.getToken(),
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
          await tokenManager.getToken(),
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
            await tokenManager.getToken(),
          );
          progressEmitter.emit("questions_fetch", "completed", {
            counts: { questions: questions.length },
            message: `Fetched ${questions.length} questions`,
          });
        }

        let posts: UnifiedPostData[] = [];
        if (includePosts) {
          currentStage = "posts_fetch";
          posts = await fetchPostsDataForSync(
            locations,
            account.account_id,
            accountId,
            userId,
            await tokenManager.getToken(),
          );
          progressEmitter.emit("posts_fetch", "completed", {
            counts: { posts: posts.length },
            message: `Fetched ${posts.length} posts`,
          });
        }

        let media: UnifiedMediaData[] = [];
        if (includeMedia) {
          currentStage = "media_fetch";
          media = await fetchMediaDataForSync(
            locations,
            account.account_id,
            accountId,
            userId,
            await tokenManager.getToken(),
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
            await tokenManager.getToken(),
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
          dbClient,
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

        // ✅ Use centralized cache invalidation
        await invalidateGMBCache(userId);

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
      })(), // End of async function
      syncTimeout.promise,
    ]);

    // Clear timeout if sync completed successfully
    syncTimeout.clear();
    return result;
  } catch (error) {
    // Clear timeout on error
    syncTimeout.clear();

    // Standardize error messages
    const message =
      error instanceof Error ? error.message : "GMB sync failed: Unknown error";
    progressEmitter.emit(currentStage, "error", {
      message,
      error: message,
    });
    progressEmitter.emit("complete", "error", {
      message,
      error: message,
    });
    const durationMs = Date.now() - operationStart;

    // Log standardized error
    await logAction("sync", "gmb_account", accountId, {
      status: "failed",
      stage: currentStage,
      took_ms: durationMs,
      error: message,
      error_type:
        error instanceof Error && error.message.includes("timeout")
          ? "timeout"
          : "sync_error",
    });
    await trackSyncResult(userId ?? null, false, durationMs);
    throw error;
  }
}
