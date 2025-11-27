import type {
  LocationData,
  QuestionData,
  ReviewData,
} from "@/lib/gmb/sync-types";
import type { InsightsData } from "@/server/actions/gmb-sync";
import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

export interface SyncTransactionPayload {
  accountId: string;
  locations: LocationData[];
  reviews: ReviewData[];
  questions: QuestionData[];
  // Note: We intentionally keep these payloads untyped here because this module
  // only forwards them to the database RPC. The exact shape is defined and
  // validated within the SQL function `sync_gmb_data_transactional`.
  // This allows server/actions to evolve post/media shapes without breaking
  // this transport layer.
  posts?: unknown[];
  media?: unknown[];
  insights?: InsightsData[];
}

export interface SyncTransactionResult {
  success: boolean;
  sync_id: string;
  locations_synced: number;
  reviews_synced: number;
  questions_synced: number;
  posts_synced?: number;
  media_synced?: number;
  insights_synced?: number;
}

const RPC_NAME = "sync_gmb_data_transactional";

// Batch size limits to prevent payload size issues
const BATCH_SIZE = {
  locations: 50,
  reviews: 100,
  questions: 100,
  posts: 50,
  media: 50,
  insights: 50,
};

function logTransactionStep(step: string, details?: Record<string, unknown>) {
  console.warn(`[GMB Sync][${step}]`, details ?? {});
}

/**
 * Split an array into batches of specified size
 */
function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

function formatRpcError(error: PostgrestError | null) {
  if (!error) return "Unknown RPC failure";
  return `${error.message}${error.details ? ` :: ${error.details}` : ""}`;
}

async function executeRpc(
  supabase: SupabaseClient,
  payload: SyncTransactionPayload,
): Promise<SyncTransactionResult> {
  const start = performance.now();

  // Split large payloads into batches to prevent payload size issues
  const locationBatches = splitIntoBatches(
    payload.locations,
    BATCH_SIZE.locations,
  );
  const reviewBatches = splitIntoBatches(payload.reviews, BATCH_SIZE.reviews);
  const questionBatches = splitIntoBatches(
    payload.questions,
    BATCH_SIZE.questions,
  );
  const postBatches = splitIntoBatches(payload.posts || [], BATCH_SIZE.posts);
  const mediaBatches = splitIntoBatches(payload.media || [], BATCH_SIZE.media);

  logTransactionStep("rpc:start", {
    rpc: RPC_NAME,
    accountId: payload.accountId,
    batches: {
      locations: locationBatches.length,
      reviews: reviewBatches.length,
      questions: questionBatches.length,
      posts: postBatches.length,
      media: mediaBatches.length,
    },
  });

  const totalResult: SyncTransactionResult = {
    success: true,
    sync_id: "",
    locations_synced: 0,
    reviews_synced: 0,
    questions_synced: 0,
    posts_synced: 0,
    media_synced: 0,
  };

  // Process locations first (required for foreign keys)
  for (let i = 0; i < locationBatches.length; i++) {
    const batch = locationBatches[i];
    logTransactionStep("batch:locations", {
      batch: i + 1,
      total: locationBatches.length,
      size: batch.length,
    });

    const { data, error } = await supabase.rpc(RPC_NAME, {
      p_account_id: payload.accountId,
      p_locations: batch,
      p_reviews: i === 0 ? reviewBatches[0] || [] : [], // Only first batch includes reviews
      p_questions: i === 0 ? questionBatches[0] || [] : [],
      p_posts: i === 0 ? postBatches[0] || [] : [],
      p_media: i === 0 ? mediaBatches[0] || [] : [],
    });

    if (error) {
      throw new Error(formatRpcError(error));
    }

    if (data) {
      const batchResult = data as SyncTransactionResult;
      totalResult.sync_id = batchResult.sync_id;
      totalResult.locations_synced += batchResult.locations_synced;
      if (i === 0) {
        totalResult.reviews_synced = batchResult.reviews_synced;
        totalResult.questions_synced = batchResult.questions_synced;
        totalResult.posts_synced = batchResult.posts_synced || 0;
        totalResult.media_synced = batchResult.media_synced || 0;
      }
    }
  }

  // Process remaining review batches
  for (let i = 1; i < reviewBatches.length; i++) {
    const batch = reviewBatches[i];
    logTransactionStep("batch:reviews", {
      batch: i + 1,
      total: reviewBatches.length,
      size: batch.length,
    });

    const { data, error } = await supabase.rpc(RPC_NAME, {
      p_account_id: payload.accountId,
      p_locations: [],
      p_reviews: batch,
      p_questions: [],
      p_posts: [],
      p_media: [],
    });

    if (error) {
      console.error("[GMB Sync] Review batch failed:", error);
    } else if (data) {
      totalResult.reviews_synced += (
        data as SyncTransactionResult
      ).reviews_synced;
    }
  }

  // Process remaining question batches
  for (let i = 1; i < questionBatches.length; i++) {
    const batch = questionBatches[i];
    logTransactionStep("batch:questions", {
      batch: i + 1,
      total: questionBatches.length,
      size: batch.length,
    });

    const { data, error } = await supabase.rpc(RPC_NAME, {
      p_account_id: payload.accountId,
      p_locations: [],
      p_reviews: [],
      p_questions: batch,
      p_posts: [],
      p_media: [],
    });

    if (error) {
      console.error("[GMB Sync] Question batch failed:", error);
    } else if (data) {
      totalResult.questions_synced += (
        data as SyncTransactionResult
      ).questions_synced;
    }
  }

  const duration = performance.now() - start;
  logTransactionStep("rpc:end", {
    durationMs: Math.round(duration),
    totalResult,
  });

  // Save insights separately in batches
  let insightsSynced = 0;
  if (payload.insights && payload.insights.length > 0) {
    const insightBatches = splitIntoBatches(
      payload.insights,
      BATCH_SIZE.insights,
    );

    for (let i = 0; i < insightBatches.length; i++) {
      const batch = insightBatches[i];
      try {
        const { error: insightsError } = await supabase
          .from("gmb_performance_metrics")
          .upsert(
            batch.map((insight) => ({
              user_id: insight.user_id,
              location_id: insight.location_id,
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
            })),
            { onConflict: "location_id,metric_date" },
          );

        if (insightsError) {
          console.error(
            "[GMB Sync] Failed to save insights batch:",
            insightsError,
          );
        } else {
          insightsSynced += batch.length;
        }
      } catch (insightsErr) {
        console.error("[GMB Sync] Error saving insights batch:", insightsErr);
      }
    }
  }

  return {
    ...totalResult,
    insights_synced: insightsSynced,
  };
}

export async function runSyncTransactionWithRetry(
  supabase: SupabaseClient,
  payload: SyncTransactionPayload,
  maxRetries = 3,
) {
  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < maxRetries) {
    try {
      attempt += 1;
      logTransactionStep("retry:attempt", {
        attempt,
        accountId: payload.accountId,
      });
      return await executeRpc(supabase, payload);
    } catch (error) {
      lastError = error;
      logTransactionStep("retry:error", { attempt, error });
      if (attempt >= maxRetries) {
        break;
      }

      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10_000);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
