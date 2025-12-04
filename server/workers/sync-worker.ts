/**
 * ============================================================================
 * Sync Worker - Event-Driven Queue Processor
 * ============================================================================
 *
 * This worker processes sync jobs from the queue in a micro-jobs architecture.
 * Each job type is processed independently, making the sync more resilient
 * and preventing database timeouts.
 *
 * Job Types:
 * - discovery_locations: Fetches locations and fans out child jobs
 * - sync_reviews: Syncs reviews for a specific location
 * - sync_insights: Syncs insights/metrics for a specific location
 * - sync_posts: Syncs posts for a specific location
 * - sync_media: Syncs media for a specific location
 *
 * @security Uses createAdminClient for all operations (service_role)
 */

import {
  fetchInsightsDataForSync,
  fetchLocationsDataForSync,
  fetchMediaDataForSync,
  fetchPostsDataForSync,
  fetchReviewsDataForSync,
  type InsightsData,
} from "@/server/actions/gmb-sync";
import {
  fanOutLocationJobs,
  type SyncQueueItem,
  updateJobStatus,
} from "@/server/actions/sync-queue";
import type {
  LocationData,
  ReviewData,
  SyncJobMetadata,
  SyncJobType,
} from "@/lib/gmb/sync-types";
import { getValidAccessToken } from "@/lib/gmb/helpers";
import { createAdminClient } from "@/lib/supabase/server";
import { syncLogger } from "@/lib/utils/logger";

/**
 * Process result from a sync job
 */
export interface ProcessJobResult {
  success: boolean;
  jobId: string;
  jobType: SyncJobType;
  error?: string;
  itemsProcessed?: number;
  childJobsCreated?: number;
}

/**
 * Main job processor - routes to appropriate handler based on job type.
 *
 * @param job - The queue item to process (with typed metadata)
 * @returns Processing result
 */
export async function processSyncJob(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const { job_type: jobType } = metadata;

  syncLogger.info("Processing sync job", {
    jobId,
    jobType,
    accountId: metadata.accountId,
    locationId: metadata.locationId,
  });

  try {
    // Get access token for API calls
    const accessToken = await getValidAccessToken(null, metadata.accountId);

    // Route to appropriate handler
    switch (jobType) {
      case "discovery_locations":
        return await processDiscoveryLocations(job, accessToken);

      case "sync_reviews":
        return await processSyncReviews(job, accessToken);

      case "sync_insights":
        return await processSyncInsights(job, accessToken);

      case "sync_posts":
        return await processSyncPosts(job, accessToken);

      case "sync_media":
        return await processSyncMedia(job, accessToken);

      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    syncLogger.error(
      "Sync job failed",
      error instanceof Error ? error : new Error(String(error)),
      {
        jobId,
        jobType,
        accountId: metadata.accountId,
        locationId: metadata.locationId,
      },
    );

    // FAIL-SAFE: Update job to failed status instead of crashing
    await updateJobStatus(jobId, "failed", errorMessage);

    return {
      success: false,
      jobId,
      jobType,
      error: errorMessage,
    };
  }
}

/**
 * Process discovery_locations job:
 * 1. Fetch locations from Google API
 * 2. Upsert locations to database
 * 3. Fan out sync_reviews and sync_insights jobs for each location
 */
async function processDiscoveryLocations(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
  accessToken: string,
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const admin = createAdminClient();

  // Get the account details
  const { data: account, error: accountError } = await admin
    .from("gmb_accounts")
    .select("account_id, user_id")
    .eq("id", metadata.accountId)
    .single();

  if (accountError || !account) {
    throw new Error(`Account not found: ${metadata.accountId}`);
  }

  // Fetch locations from Google API
  syncLogger.info("Fetching locations from Google API", {
    jobId,
    accountId: metadata.accountId,
  });

  const locations = await fetchLocationsDataForSync(
    account.account_id,
    metadata.accountId,
    metadata.userId,
    accessToken,
  );

  syncLogger.info("Fetched locations", {
    jobId,
    count: locations.length,
  });

  if (locations.length === 0) {
    // No locations found - complete job
    await updateJobStatus(jobId, "completed");
    return {
      success: true,
      jobId,
      jobType: "discovery_locations",
      itemsProcessed: 0,
      childJobsCreated: 0,
    };
  }

  // Upsert locations to database
  const locationUpserts = locations.map((loc) => ({
    gmb_account_id: loc.gmb_account_id,
    user_id: loc.user_id,
    location_id: loc.location_id,
    normalized_location_id: loc.normalized_location_id,
    location_name: loc.location_name,
    address: loc.address,
    phone: loc.phone,
    website: loc.website,
    category: loc.category,
    rating: loc.rating,
    review_count: loc.review_count,
    latitude: loc.latitude,
    longitude: loc.longitude,
    profile_completeness: loc.profile_completeness,
    is_active: loc.is_active,
    status: loc.status,
    metadata: loc.metadata,
    last_synced_at: loc.last_synced_at,
    updated_at: new Date().toISOString(),
  }));

  const { data: upsertedLocations, error: upsertError } = await admin
    .from("gmb_locations")
    .upsert(locationUpserts, {
      onConflict: "location_id",
      ignoreDuplicates: false,
    })
    .select("id, location_id");

  if (upsertError) {
    throw new Error(`Failed to upsert locations: ${upsertError.message}`);
  }

  syncLogger.info("Upserted locations", {
    jobId,
    count: upsertedLocations?.length || 0,
  });

  // Build location map for fan-out
  const locationMap =
    upsertedLocations?.map((loc: { id: string; location_id: string }) => ({
      locationId: loc.id,
      googleLocationId: loc.location_id,
    })) || [];

  // Fan out sync_reviews and sync_insights jobs for each location
  const fanOutResult = await fanOutLocationJobs(
    locationMap,
    ["sync_reviews", "sync_insights"],
    {
      userId: metadata.userId,
      accountId: metadata.accountId,
      googleAccountId: account.account_id,
    },
    jobId,
  );

  // Mark job as completed
  await updateJobStatus(jobId, "completed");

  return {
    success: true,
    jobId,
    jobType: "discovery_locations",
    itemsProcessed: locations.length,
    childJobsCreated: fanOutResult.jobsCreated,
  };
}

/**
 * Process sync_reviews job:
 * 1. Fetch reviews for the specific location
 * 2. Upsert reviews to database
 * 3. Update location's last_synced_at
 */
async function processSyncReviews(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
  accessToken: string,
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const admin = createAdminClient();

  if (!metadata.googleLocationId || !metadata.googleAccountId) {
    throw new Error("Missing googleLocationId or googleAccountId for sync_reviews");
  }

  // Build minimal location data for the fetch function
  const locationData: LocationData = {
    gmb_account_id: metadata.accountId,
    user_id: metadata.userId,
    location_id: metadata.googleLocationId,
    normalized_location_id: metadata.googleLocationId.replace(/[^a-zA-Z0-9]/g, "_"),
    location_name: "",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  };

  // Fetch reviews from Google API
  syncLogger.info("Fetching reviews from Google API", {
    jobId,
    locationId: metadata.googleLocationId,
  });

  const reviews = await fetchReviewsDataForSync(
    [locationData],
    metadata.googleAccountId,
    metadata.accountId,
    metadata.userId,
    accessToken,
  );

  syncLogger.info("Fetched reviews", {
    jobId,
    count: reviews.length,
  });

  if (reviews.length > 0) {
    // Upsert reviews to database
    const reviewUpserts = reviews.map((review: ReviewData) => ({
      user_id: review.user_id,
      location_id: metadata.locationId, // Use DB location ID
      google_location_id: review.google_location_id,
      gmb_account_id: review.gmb_account_id,
      review_id: review.review_id,
      reviewer_name: review.reviewer_name,
      reviewer_display_name: review.reviewer_display_name,
      reviewer_photo: review.reviewer_photo,
      rating: review.rating,
      review_text: review.review_text,
      review_date: review.review_date,
      reply_text: review.reply_text,
      reply_date: review.reply_date,
      has_reply: review.has_reply,
      status: review.status,
      sentiment: review.sentiment,
      google_name: review.google_name,
      review_url: review.review_url,
      updated_at: new Date().toISOString(),
    }));

    const { error: reviewError } = await admin
      .from("gmb_reviews")
      .upsert(reviewUpserts, {
        onConflict: "review_id",
        ignoreDuplicates: false,
      });

    if (reviewError) {
      throw new Error(`Failed to upsert reviews: ${reviewError.message}`);
    }
  }

  // Update location's last_synced_at
  if (metadata.locationId) {
    await admin
      .from("gmb_locations")
      .update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.locationId);
  }

  // Mark job as completed
  await updateJobStatus(jobId, "completed");

  return {
    success: true,
    jobId,
    jobType: "sync_reviews",
    itemsProcessed: reviews.length,
  };
}

/**
 * Process sync_insights job:
 * 1. Fetch insights/metrics for the specific location
 * 2. Upsert insights to database
 */
async function processSyncInsights(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
  accessToken: string,
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const admin = createAdminClient();

  if (!metadata.googleLocationId || !metadata.googleAccountId) {
    throw new Error("Missing googleLocationId or googleAccountId for sync_insights");
  }

  // Build minimal location data for the fetch function
  const locationData: LocationData = {
    gmb_account_id: metadata.accountId,
    user_id: metadata.userId,
    location_id: metadata.googleLocationId,
    normalized_location_id: metadata.googleLocationId.replace(/[^a-zA-Z0-9]/g, "_"),
    location_name: "",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  };

  // Fetch insights from Google API
  syncLogger.info("Fetching insights from Google API", {
    jobId,
    locationId: metadata.googleLocationId,
  });

  const insights = await fetchInsightsDataForSync(
    [locationData],
    metadata.googleAccountId,
    metadata.accountId,
    metadata.userId,
    accessToken,
  );

  syncLogger.info("Fetched insights", {
    jobId,
    count: insights.length,
  });

  if (insights.length > 0) {
    // Upsert insights to database
    const insightUpserts = insights.map((insight: InsightsData) => ({
      user_id: insight.user_id,
      location_id: metadata.locationId || insight.location_id,
      gmb_account_id: insight.gmb_account_id,
      metric_date: insight.metric_date,
      views_search: insight.views_search,
      views_maps: insight.views_maps,
      website_clicks: insight.website_clicks,
      phone_calls: insight.phone_calls,
      direction_requests: insight.direction_requests,
      photo_views: insight.photo_views,
      total_searches: insight.total_searches,
      direct_searches: insight.direct_searches,
      discovery_searches: insight.discovery_searches,
      branded_searches: insight.branded_searches,
      metadata: insight.metadata,
      updated_at: new Date().toISOString(),
    }));

    const { error: insightsError } = await admin
      .from("gmb_insights")
      .upsert(insightUpserts, {
        onConflict: "location_id,metric_date",
        ignoreDuplicates: false,
      });

    if (insightsError) {
      // Log but don't fail - insights table might have different constraints
      syncLogger.warn("Failed to upsert insights (non-critical)", {
        error: insightsError.message,
        jobId,
      });
    }
  }

  // Mark job as completed
  await updateJobStatus(jobId, "completed");

  return {
    success: true,
    jobId,
    jobType: "sync_insights",
    itemsProcessed: insights.length,
  };
}

/**
 * Process sync_posts job:
 * 1. Fetch posts for the specific location
 * 2. Upsert posts to database
 */
async function processSyncPosts(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
  accessToken: string,
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const admin = createAdminClient();

  if (!metadata.googleLocationId || !metadata.googleAccountId) {
    throw new Error("Missing googleLocationId or googleAccountId for sync_posts");
  }

  // Build minimal location data for the fetch function
  const locationData: LocationData = {
    gmb_account_id: metadata.accountId,
    user_id: metadata.userId,
    location_id: metadata.googleLocationId,
    normalized_location_id: metadata.googleLocationId.replace(/[^a-zA-Z0-9]/g, "_"),
    location_name: "",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  };

  // Fetch posts from Google API
  syncLogger.info("Fetching posts from Google API", {
    jobId,
    locationId: metadata.googleLocationId,
  });

  const posts = await fetchPostsDataForSync(
    [locationData],
    metadata.googleAccountId,
    metadata.accountId,
    metadata.userId,
    accessToken,
  );

  syncLogger.info("Fetched posts", {
    jobId,
    count: posts.length,
  });

  if (posts.length > 0) {
    // Upsert posts to database
    const postUpserts = posts.map((post) => ({
      user_id: post.user_id,
      location_id: metadata.locationId,
      gmb_account_id: post.gmb_account_id,
      google_location_id: post.google_location_id,
      post_id: post.post_id,
      post_type: post.post_type,
      title: post.title,
      content: post.content,
      media_urls: post.media_urls,
      event_title: post.event_title,
      event_start_date: post.event_start_date,
      event_end_date: post.event_end_date,
      offer_code: post.offer_code,
      offer_url: post.offer_url,
      call_to_action: post.call_to_action,
      call_to_action_url: post.call_to_action_url,
      state: post.state,
      google_name: post.google_name,
      created_at: post.created_at,
      updated_at: new Date().toISOString(),
    }));

    const { error: postsError } = await admin
      .from("gmb_posts")
      .upsert(postUpserts, {
        onConflict: "post_id",
        ignoreDuplicates: false,
      });

    if (postsError) {
      syncLogger.warn("Failed to upsert posts (non-critical)", {
        error: postsError.message,
        jobId,
      });
    }
  }

  // Mark job as completed
  await updateJobStatus(jobId, "completed");

  return {
    success: true,
    jobId,
    jobType: "sync_posts",
    itemsProcessed: posts.length,
  };
}

/**
 * Process sync_media job:
 * 1. Fetch media items for the specific location
 * 2. Upsert media to database
 */
async function processSyncMedia(
  job: SyncQueueItem & { metadata: SyncJobMetadata },
  accessToken: string,
): Promise<ProcessJobResult> {
  const { id: jobId, metadata } = job;
  const admin = createAdminClient();

  if (!metadata.googleLocationId || !metadata.googleAccountId) {
    throw new Error("Missing googleLocationId or googleAccountId for sync_media");
  }

  // Build minimal location data for the fetch function
  const locationData: LocationData = {
    gmb_account_id: metadata.accountId,
    user_id: metadata.userId,
    location_id: metadata.googleLocationId,
    normalized_location_id: metadata.googleLocationId.replace(/[^a-zA-Z0-9]/g, "_"),
    location_name: "",
    is_active: true,
    last_synced_at: new Date().toISOString(),
  };

  // Fetch media from Google API
  syncLogger.info("Fetching media from Google API", {
    jobId,
    locationId: metadata.googleLocationId,
  });

  const media = await fetchMediaDataForSync(
    [locationData],
    metadata.googleAccountId,
    metadata.accountId,
    metadata.userId,
    accessToken,
  );

  syncLogger.info("Fetched media", {
    jobId,
    count: media.length,
  });

  if (media.length > 0) {
    // Upsert media to database
    const mediaUpserts = media.map((item) => ({
      user_id: item.user_id,
      location_id: metadata.locationId,
      gmb_account_id: item.gmb_account_id,
      google_location_id: item.google_location_id,
      media_id: item.media_id,
      media_format: item.media_format,
      source_url: item.source_url,
      google_url: item.google_url,
      thumbnail_url: item.thumbnail_url,
      description: item.description,
      location_association: item.location_association,
      google_name: item.google_name,
      created_at: item.create_time,
      updated_at: new Date().toISOString(),
    }));

    const { error: mediaError } = await admin
      .from("gmb_media")
      .upsert(mediaUpserts, {
        onConflict: "media_id",
        ignoreDuplicates: false,
      });

    if (mediaError) {
      syncLogger.warn("Failed to upsert media (non-critical)", {
        error: mediaError.message,
        jobId,
      });
    }
  }

  // Mark job as completed
  await updateJobStatus(jobId, "completed");

  return {
    success: true,
    jobId,
    jobType: "sync_media",
    itemsProcessed: media.length,
  };
}
