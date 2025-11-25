"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getValidAccessToken,
  buildLocationResourceName,
  GMB_CONSTANTS,
} from "@/lib/gmb/helpers";
import type {
  LocationData,
  ReviewData,
  QuestionData,
} from "@/lib/gmb/sync-types";
import { runSyncTransactionWithRetry } from "@/lib/supabase/transactions";
import {
  CacheBucket,
  refreshCache,
  publishSyncProgress,
  type SyncProgressEvent,
} from "@/lib/cache/cache-manager";
import { logAction } from "@/lib/monitoring/audit";
import { trackSyncResult } from "@/lib/monitoring/metrics";
import { randomUUID } from "crypto";

const GBP_LOC_BASE = GMB_CONSTANTS.GBP_LOC_BASE;
const REVIEWS_BASE = GMB_CONSTANTS.GMB_V4_BASE;
const QANDA_BASE = GMB_CONSTANTS.QANDA_BASE;
const POSTS_BASE = GMB_CONSTANTS.GBP_LOC_BASE; // Posts use same base as locations

type SyncStage =
  | "init"
  | "locations_fetch"
  | "reviews_fetch"
  | "questions_fetch"
  | "posts_fetch"
  | "media_fetch"
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
  "transaction",
  "cache_refresh",
  "complete",
];

function createProgressEmitter(options: {
  userId: string;
  accountId: string;
  includeQuestions: boolean;
  includePosts?: boolean;
  includeMedia?: boolean;
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
    url.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,phoneNumbers,websiteUri,categories,profile,regularHours,specialHours,moreHours,serviceItems,openInfo,metadata,latlng,labels",
    );
    url.searchParams.set("pageSize", "100");
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
  const reviews: ReviewData[] = [];
  const reviewsTimerStart = Date.now();

  for (const location of locations) {
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) continue;

    let nextPageToken: string | undefined;
    do {
      const url = new URL(`${REVIEWS_BASE}/${locationResource}/reviews`);
      url.searchParams.set("pageSize", "50");
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

        reviews.push({
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
    } while (nextPageToken);
  }

  console.warn(
    "[GMB Sync v2] fetchReviews completed in",
    Date.now() - reviewsTimerStart,
    "ms",
  );
  return reviews;
}

export async function fetchQuestionsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<QuestionData[]> {
  const questions: QuestionData[] = [];
  const questionsTimerStart = Date.now();

  for (const location of locations) {
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) continue;

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
      continue;
    }

    const payload = await response.json();
    const googleQuestions = payload.questions || [];

    for (const question of googleQuestions) {
      const questionId = question.name?.split("/").pop();
      if (!questionId) continue;

      const topAnswer = question.topAnswers?.[0] || null;
      const status = topAnswer?.text ? "answered" : "unanswered";

      questions.push({
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
  }

  console.warn(
    "[GMB Sync v2] fetchQuestions completed in",
    Date.now() - questionsTimerStart,
    "ms",
  );
  return questions;
}

export async function fetchPostsDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<any[]> {
  const posts: any[] = [];
  const postsTimerStart = Date.now();

  for (const location of locations) {
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) continue;

    try {
      // Fetch local posts for this location
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
        continue;
      }

      const payload = await response.json();
      const googlePosts = payload.localPosts || [];

      for (const post of googlePosts) {
        const postId = post.name?.split("/").pop();
        if (!postId) continue;

        posts.push({
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
      console.warn("[GMB Sync v2] Error fetching posts", {
        location: location.location_id,
        error,
      });
    }
  }

  console.warn(
    "[GMB Sync v2] fetchPosts completed in",
    Date.now() - postsTimerStart,
    "ms",
  );
  return posts;
}

export async function fetchMediaDataForSync(
  locations: LocationData[],
  accountResource: string,
  gmbAccountId: string,
  userId: string,
  accessToken: string,
): Promise<any[]> {
  const media: any[] = [];
  const mediaTimerStart = Date.now();

  for (const location of locations) {
    const locationResource = resolveLocationResource(
      accountResource,
      location.location_id,
    );
    if (!locationResource) continue;

    try {
      // Fetch media items for this location
      const endpoint = `${POSTS_BASE}/${locationResource}/media`;
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
        continue;
      }

      const payload = await response.json();
      const googleMedia = payload.mediaItems || [];

      for (const item of googleMedia) {
        const mediaId = item.name?.split("/").pop();
        if (!mediaId) continue;

        media.push({
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
      console.warn("[GMB Sync v2] Error fetching media", {
        location: location.location_id,
        error,
      });
    }
  }

  console.warn(
    "[GMB Sync v2] fetchMedia completed in",
    Date.now() - mediaTimerStart,
    "ms",
  );
  return media;
}

export async function performTransactionalSync(
  accountId: string,
  includeQuestions = true,
  includePosts = false,
  includeMedia = false,
) {
  const supabase = await createClient();
  const operationStart = Date.now();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Not authenticated");
  }

  const { data: account, error: accountError } = await supabase
    .from("gmb_accounts")
    .select("id, user_id, account_id")
    .eq("id", accountId)
    .eq("user_id", user.id)
    .single();

  if (accountError || !account) {
    throw new Error("GMB account not found");
  }

  const progressEmitter = createProgressEmitter({
    userId: user.id,
    accountId,
    includeQuestions,
    includePosts,
    includeMedia,
  });

  progressEmitter.emit("init", "running", {
    message: "Starting Google Business sync",
  });

  let currentStage: SyncStage = "init";

  try {
    const accessToken = await getValidAccessToken(supabase, accountId);

    currentStage = "locations_fetch";
    const locations = await fetchLocationsDataForSync(
      account.account_id,
      accountId,
      user.id,
      accessToken,
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
      user.id,
      accessToken,
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
        user.id,
        accessToken,
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
        user.id,
        accessToken,
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
        user.id,
        accessToken,
      );
      progressEmitter.emit("media_fetch", "completed", {
        counts: { media: media.length },
        message: `Fetched ${media.length} media items`,
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
      },
      message: "Database transaction committed",
    });

    currentStage = "cache_refresh";
    progressEmitter.emit("cache_refresh", "running", {
      message: "Refreshing dashboard caches",
    });
    await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, user.id);
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
    await trackSyncResult(user.id, true, durationMs);

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
    await trackSyncResult(user?.id ?? null, false, durationMs);
    throw error;
  }
}
