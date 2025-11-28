"use serve   r";

import { getValidAccessToken, GMB_CONSTANTS } from "@/lib/gmb/helpers";
import { createClient } from "@/lib/supabase/server";
import type { GMBPost } from "@/lib/types/database";
import {
  buildIlikePattern,
  sanitizeSearchQuery,
} from "@/lib/utils/sanitize-search";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const GMB_V4_BASE = GMB_CONSTANTS.GMB_V4_BASE;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type CreatePostPayload = z.infer<typeof CreatePostSchema>;
type UpdatePostPayload = z.infer<typeof UpdatePostSchema>;

// Cache for location data to reduce database queries
const locationCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function buildV4LocationResource(
  accountId: string,
  locationId: string,
): string {
  const cleanAccountId = accountId.replace(/^accounts\//, "");
  const cleanLocationId = locationId.replace(
    /^(accounts\/[^/]+\/)?locations\//,
    "",
  );
  return `accounts/${cleanAccountId}/locations/${cleanLocationId}`;
}

// Validation schemas
const CreatePostSchema = z.object({
  locationId: z.string().uuid(),
  postType: z.enum(["whats_new", "event", "offer", "product"]),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1500),
  mediaUrl: z.string().url().optional(),
  ctaType: z
    .enum(["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL", "SHOP"])
    .optional(),
  ctaUrl: z.string().url().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
});

const UpdatePostSchema = z.object({
  postId: z.string().uuid(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(1500).optional(),
  mediaUrl: z.string().url().optional(),
  ctaType: z
    .enum(["BOOK", "ORDER", "LEARN_MORE", "SIGN_UP", "CALL", "SHOP"])
    .optional(),
  ctaUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
});

const FilterSchema = z.object({
  locationId: z.string().uuid().optional(),
  postType: z
    .enum(["whats_new", "event", "offer", "product", "all"])
    .optional(),
  status: z.enum(["draft", "queued", "published", "failed", "all"]).optional(),
  searchQuery: z.string().optional(),
  sortBy: z.enum(["newest", "oldest", "scheduled"]).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

/**
 * Map post type to Google's topic type
 */
function mapPostTypeToGoogle(postType: GMBPost["post_type"]): string {
  const mapping = {
    whats_new: "STANDARD",
    event: "EVENT",
    offer: "OFFER",
    // 'product' type posts are handled differently in GMB API, often as separate products.
    // For local posts, 'STANDARD' is a safe fallback.
    product: "STANDARD",
  };
  return mapping[postType] || "STANDARD";
}

function mapGoogleToPostType(googleTopicType: string): GMBPost["post_type"] {
  const mapping = {
    STANDARD: "whats_new",
    EVENT: "event",
    OFFER: "offer",
  };
  return (mapping as any)[googleTopicType] || "whats_new";
}

/**
 * Standardized error response builder
 */
function createErrorResponse(error: string, errorCode?: string) {
  return {
    success: false as const,
    error,
    ...(errorCode && { errorCode }),
  };
}

/**
 * Standardized success response builder
 */
function createSuccessResponse(message: string, data?: any) {
  return {
    success: true as const,
    message,
    ...(data && { data }),
  };
}

/**
 * Get location with caching to reduce DB queries
 */
async function getCachedLocation(
  supabase: any,
  locationId: string,
  userId: string,
) {
  const cacheKey = `${userId}-${locationId}`;
  const cached = locationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const { data: location, error: locError } = await supabase
    .from("gmb_locations")
    .select(
      `
      id,
      location_id,
      gmb_account_id,
      gmb_accounts!inner(id, account_id)
    `,
    )
    .eq("id", locationId)
    .eq("user_id", userId)
    .single();

  if (!locError && location) {
    locationCache.set(cacheKey, { data: location, timestamp: Date.now() });
  }

  return locError ? null : location;
}

// ============================================
// 1. GET POSTS WITH ADVANCED FILTERING
// ============================================
export async function getPosts(params: z.infer<typeof FilterSchema>) {
  try {
    const validatedParams = FilterSchema.parse(params);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        data: [],
        count: 0,
      };
    }

    // Build query with location join
    let query = supabase
      .from("gmb_posts")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_name,
          address
        )
      `,
        { count: "exact" },
      )
      .eq("user_id", user.id);

    // Apply filters
    if (validatedParams.locationId && validatedParams.locationId !== "all") {
      query = query.eq("location_id", validatedParams.locationId);
    }

    if (validatedParams.postType && validatedParams.postType !== "all") {
      query = query.eq("post_type", validatedParams.postType);
    }

    if (validatedParams.status && validatedParams.status !== "all") {
      query = query.eq("status", validatedParams.status);
    }

    if (validatedParams.searchQuery) {
      const sanitized = sanitizeSearchQuery(validatedParams.searchQuery);
      if (sanitized) {
        const pattern = buildIlikePattern(sanitized);
        query = query.or(`content.ilike.${pattern},title.ilike.${pattern}`);
      }
    }

    // Apply sorting
    switch (validatedParams.sortBy) {
      case "newest":
        query = query.order("published_at", {
          ascending: false,
          nullsFirst: false,
        });
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("published_at", {
          ascending: true,
          nullsFirst: false,
        });
        query = query.order("created_at", { ascending: true });
        break;
      case "scheduled":
        query = query.order("scheduled_at", {
          ascending: true,
          nullsFirst: false,
        });
        break;
      default:
        query = query.order("created_at", { ascending: false });
    }

    // Pagination
    const limit = validatedParams.limit || 50;
    const offset = validatedParams.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("[Posts] Get posts error:", error);
      return {
        success: false,
        error: error.message,
        data: [],
        count: 0,
      };
    }

    // Transform data to include location_name
    const posts = (data || []).map((post: any) => ({
      ...post,
      location_name: post.gmb_locations?.location_name,
      location_address: post.gmb_locations?.address,
    }));

    return {
      success: true,
      data: posts,
      count: count || 0,
    };
  } catch (error: any) {
    console.error("[Posts] Get posts error:", error);
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
        data: [],
        count: 0,
      };
    }
    return {
      success: false,
      error: error.message || "Failed to fetch posts",
      data: [],
      count: 0,
    };
  }
}

/**
 * Convert a date to a specific timezone and extract date/time components
 * @param date - The date to convert
 * @param timezone - IANA timezone string (e.g., 'Asia/Dubai', 'America/New_York')
 */
function getDateInTimezone(
  date: Date,
  timezone?: string,
): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} {
  // Default to UTC if no timezone provided
  const tz = timezone || "UTC";

  try {
    // Use Intl.DateTimeFormat to get components in the target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) =>
      parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

    return {
      year: getPart("year"),
      month: getPart("month"),
      day: getPart("day"),
      hours: getPart("hour"),
      minutes: getPart("minute"),
    };
  } catch {
    // Fallback to UTC if timezone is invalid
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hours: date.getUTCHours(),
      minutes: date.getUTCMinutes(),
    };
  }
}

// Unified post data interface to avoid 'any' type
interface UnifiedPostData {
  title?: string | null;
  content?: string;
  description?: string;
  post_type?: GMBPost["post_type"];
  postType?: z.infer<typeof CreatePostSchema>["postType"];
  start_date?: string | null;
  startDate?: string;
  end_date?: string | null;
  endDate?: string;
  media_url?: string | null;
  mediaUrl?: string;
  call_to_action?: string | null;
  ctaType?: string;
  call_to_action_url?: string | null;
  ctaUrl?: string;
}

// Google API request body type
interface GooglePostBody {
  languageCode: string;
  summary: string;
  topicType: string;
  event?: {
    title: string;
    schedule: {
      startDate?: { year: number; month: number; day: number };
      startTime?: { hours: number; minutes: number };
      endDate?: { year: number; month: number; day: number };
      endTime?: { hours: number; minutes: number };
    };
  };
  offer?: {
    couponCode: string;
    redeemOnlineUrl: string;
    termsConditions: string;
  };
  media?: Array<{ mediaFormat: string; sourceUrl: string }>;
  callToAction?: { actionType: string; url?: string };
}

/**
 * Builds the Google API request body from post data.
 * @param postData - The post data
 * @param locationTimezone - Optional timezone for the location (e.g., 'Asia/Dubai')
 */
function buildGooglePostBody(
  postData: GMBPost | z.infer<typeof CreatePostSchema>,
  locationTimezone?: string,
): GooglePostBody {
  // Normalize post data to unified interface
  const unified = postData as UnifiedPostData;

  const summaryText = unified.content || unified.description || "";
  const type = unified.post_type || unified.postType || "whats_new";

  const body: GooglePostBody = {
    languageCode: "en",
    summary: summaryText,
    topicType: mapPostTypeToGoogle(type),
  };

  if (type === "event" && unified.title) {
    body.event = {
      title: unified.title,
      schedule: {},
    };

    const startDateStr = unified.startDate || unified.start_date;
    if (startDateStr) {
      const startDate = new Date(startDateStr);
      const tzStart = getDateInTimezone(startDate, locationTimezone);
      body.event.schedule.startDate = {
        year: tzStart.year,
        month: tzStart.month,
        day: tzStart.day,
      };
      body.event.schedule.startTime = {
        hours: tzStart.hours,
        minutes: tzStart.minutes,
      };
    }

    const endDateStr = unified.endDate || unified.end_date;
    if (endDateStr) {
      const endDate = new Date(endDateStr);
      const tzEnd = getDateInTimezone(endDate, locationTimezone);
      body.event.schedule.endDate = {
        year: tzEnd.year,
        month: tzEnd.month,
        day: tzEnd.day,
      };
      body.event.schedule.endTime = {
        hours: tzEnd.hours,
        minutes: tzEnd.minutes,
      };
    }
  }

  if (type === "offer" && unified.title) {
    body.offer = {
      couponCode: unified.title,
      redeemOnlineUrl: unified.call_to_action_url || unified.ctaUrl || "",
      termsConditions: summaryText,
    };
  }

  const mediaUrl = unified.media_url || unified.mediaUrl;
  if (mediaUrl) {
    body.media = [
      {
        mediaFormat: "PHOTO",
        sourceUrl: mediaUrl,
      },
    ];
  }

  const ctaType = unified.call_to_action || unified.ctaType;
  const ctaUrl = unified.call_to_action_url || unified.ctaUrl;

  if (ctaType && ctaUrl) {
    body.callToAction = {
      actionType: ctaType,
      url: ctaUrl,
    };
  } else if (ctaType === "CALL") {
    // CALL action does not require a URL
    body.callToAction = { actionType: ctaType };
  }

  return body;
}

// ============================================
// 2. CREATE POST
// ============================================
export async function createPost(data: z.infer<typeof CreatePostSchema>) {
  try {
    const validatedData = CreatePostSchema.parse(data);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse("Not authenticated");
    }

    const location = await getCachedLocation(
      supabase,
      validatedData.locationId,
      user.id,
    );

    if (!location) {
      return createErrorResponse(
        "Location not found or you don't have permission to post to it.",
      );
    }

    const account =
      (Array.isArray(location.gmb_accounts)
        ? location.gmb_accounts[0]
        : location.gmb_accounts) || null;

    if (!location.gmb_account_id || !account?.account_id) {
      return createErrorResponse(
        "Linked Google account not found. Please reconnect your Google account.",
      );
    }

    if (validatedData.scheduledAt) {
      return schedulePostDraft(supabase, validatedData, user.id);
    }

    const publishOutcome = await publishPostToGoogle(supabase, validatedData, {
      locationAccountId: location.gmb_account_id,
      locationId: location.location_id,
      accountId: account.account_id,
    });

    if (!publishOutcome.success) {
      return publishOutcome.errorResponse;
    }

    return persistPublishedPost({
      supabase,
      userId: user.id,
      validatedData,
      googleResult: publishOutcome.googleResult,
      locationId: validatedData.locationId,
    });
  } catch (error: any) {
    console.error("[Posts] Create post error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    return createErrorResponse(error.message || "An unexpected error occurred");
  }
}

// ============================================
// 3. UPDATE POST
// ============================================
export async function updatePost(data: z.infer<typeof UpdatePostSchema>) {
  try {
    const validatedData = UpdatePostSchema.parse(data);
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse("Not authenticated");
    }

    const { post, errorResponse } = await fetchPostForUpdate(
      supabase,
      validatedData.postId,
      user.id,
    );

    if (errorResponse || !post) {
      return errorResponse ?? createErrorResponse("Post not found");
    }

    const updateData = buildPostUpdatePayload(validatedData);
    const { error: updateError } = await supabase
      .from("gmb_posts")
      .update(updateData)
      .eq("id", validatedData.postId);

    if (updateError) {
      console.error("[Posts] Update error:", updateError);
      return createErrorResponse("Failed to update post");
    }

    if (shouldSyncPostToGoogle(post, validatedData)) {
      await syncPostUpdateWithGoogle(supabase, post, validatedData);
    }

    revalidatePostViews();

    return createSuccessResponse("Post updated successfully");
  } catch (error: any) {
    console.error("[Posts] Update post error:", error);

    if (error instanceof z.ZodError) {
      return createErrorResponse(
        `Validation error: ${error.errors.map((e) => e.message).join(", ")}`,
      );
    }

    return createErrorResponse(error.message || "Failed to update post");
  }
}

function revalidatePostViews() {
  revalidatePath("/posts");
  revalidatePath("/dashboard");
}

async function schedulePostDraft(
  supabase: SupabaseServerClient,
  validatedData: CreatePostPayload,
  userId: string,
) {
  const { error } = await supabase.from("gmb_posts").insert({
    user_id: userId,
    location_id: validatedData.locationId,
    post_type: validatedData.postType,
    title: validatedData.title || null,
    content: validatedData.description,
    media_url: validatedData.mediaUrl || null,
    call_to_action: validatedData.ctaType || null,
    call_to_action_url: validatedData.ctaUrl || null,
    scheduled_at: validatedData.scheduledAt,
    status: "queued",
    metadata: {},
  });

  if (error) {
    console.error("[Posts] Database insert error:", error);
    return createErrorResponse("Failed to save scheduled post");
  }

  revalidatePostViews();

  return createSuccessResponse("Post scheduled successfully");
}

interface PublishContext {
  locationAccountId: string;
  locationId: string;
  accountId: string;
}

// Google post states that indicate processing
const GOOGLE_PROCESSING_STATES = ["PROCESSING", "PENDING_REVIEW", "PENDING"];
const MAX_POLLING_ATTEMPTS = 3;
const POLLING_DELAY_MS = 2000;

async function publishPostToGoogle(
  supabase: SupabaseServerClient,
  validatedData: CreatePostPayload,
  context: PublishContext,
): Promise<
  | { success: true; googleResult: GooglePostResult; isProcessing?: boolean }
  | { success: false; errorResponse: ReturnType<typeof createErrorResponse> }
> {
  try {
    const accessToken = await getValidAccessToken(
      supabase,
      context.locationAccountId,
    );
    const postData = buildGooglePostBody(validatedData);
    const locationResourceV4 = buildV4LocationResource(
      context.accountId,
      context.locationId,
    );
    const gmbApiUrl = `${GMB_V4_BASE}/${locationResourceV4}/localPosts`;

    const response = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        errorResponse: mapGoogleApiError(response.status, errorData),
      };
    }

    let googleResult = (await response.json()) as GooglePostResult;

    // Handle PROCESSING state - poll for completion
    if (
      googleResult.state &&
      GOOGLE_PROCESSING_STATES.includes(googleResult.state)
    ) {
      console.warn(
        "[Posts] Post is in PROCESSING state, polling for completion...",
      );

      const postName = googleResult.name;
      if (postName) {
        for (let attempt = 0; attempt < MAX_POLLING_ATTEMPTS; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, POLLING_DELAY_MS));

          try {
            const pollResponse = await fetch(`${GMB_V4_BASE}/${postName}`, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });

            if (pollResponse.ok) {
              const updatedResult =
                (await pollResponse.json()) as GooglePostResult;
              if (
                !GOOGLE_PROCESSING_STATES.includes(updatedResult.state || "")
              ) {
                googleResult = updatedResult;
                console.warn(
                  "[Posts] Post processing completed:",
                  updatedResult.state,
                );
                break;
              }
            }
          } catch (pollError) {
            console.warn("[Posts] Polling attempt failed:", pollError);
          }
        }
      }

      // If still processing after polling, return with flag
      if (
        googleResult.state &&
        GOOGLE_PROCESSING_STATES.includes(googleResult.state)
      ) {
        return {
          success: true,
          googleResult,
          isProcessing: true,
        };
      }
    }

    return {
      success: true,
      googleResult,
    };
  } catch (error) {
    console.error("[Posts] Token or publish error:", error);
    return {
      success: false,
      errorResponse: createErrorResponse(
        "Failed to authenticate with Google. Please reconnect your account.",
        "AUTH_EXPIRED",
      ),
    };
  }
}

// Type for Google post response
interface GooglePostResult {
  name?: string;
  state?: string;
  topicType?: string;
  createTime?: string;
  updateTime?: string;
  [key: string]: unknown;
}

async function persistPublishedPost(params: {
  supabase: SupabaseServerClient;
  userId: string;
  validatedData: CreatePostPayload;
  googleResult: any;
  locationId: string;
}) {
  const { supabase, userId, validatedData, googleResult, locationId } = params;
  const { error } = await supabase.from("gmb_posts").insert({
    user_id: userId,
    location_id: locationId,
    provider_post_id: googleResult?.name?.split("/").pop() || null,
    post_type: validatedData.postType,
    title: validatedData.title || null,
    content: validatedData.description,
    media_url: validatedData.mediaUrl || null,
    call_to_action: validatedData.ctaType || null,
    call_to_action_url: validatedData.ctaUrl || null,
    scheduled_at: validatedData.scheduledAt || null,
    published_at: googleResult ? new Date().toISOString() : null,
    status: "published",
    metadata: googleResult || {},
  });

  if (error) {
    console.error("[Posts] Database insert error:", error);
    if (googleResult) {
      return createSuccessResponse(
        "Post published on Google but failed to save to database",
      );
    }
    return createErrorResponse("Failed to save post");
  }

  revalidatePostViews();

  return createSuccessResponse("Post published successfully");
}

function mapGoogleApiError(status: number, errorData: any) {
  if (status === 401) {
    return createErrorResponse(
      "Authentication expired. Please reconnect your Google account.",
      "AUTH_EXPIRED",
    );
  }

  if (status === 403) {
    return createErrorResponse(
      "Permission denied. Please check your Google Business Profile permissions.",
      "PERMISSION_DENIED",
    );
  }

  if (status === 429) {
    return createErrorResponse(
      "Too many requests. Please try again later.",
      "RATE_LIMIT",
    );
  }

  console.error("[Posts] API error:", errorData);
  return createErrorResponse(
    errorData?.error?.message || "Failed to create post on Google",
  );
}

async function fetchPostForUpdate(
  supabase: SupabaseServerClient,
  postId: string,
  userId: string,
): Promise<{
  post?: any;
  errorResponse?: ReturnType<typeof createErrorResponse>;
}> {
  const { data: post, error } = await supabase
    .from("gmb_posts")
    .select(
      `
      *,
      gmb_locations!inner(
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(id, account_id)
      )
    `,
    )
    .eq("id", postId)
    .eq("user_id", userId)
    .single();

  if (error || !post) {
    return { errorResponse: createErrorResponse("Post not found") };
  }

  return { post };
}

function buildPostUpdatePayload(validatedData: UpdatePostPayload) {
  const updateData: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (validatedData.title !== undefined) updateData.title = validatedData.title;
  if (validatedData.description !== undefined)
    updateData.content = validatedData.description;
  if (validatedData.mediaUrl !== undefined)
    updateData.media_url = validatedData.mediaUrl;
  if (validatedData.ctaType !== undefined)
    updateData.call_to_action = validatedData.ctaType;
  if (validatedData.ctaUrl !== undefined)
    updateData.call_to_action_url = validatedData.ctaUrl;
  if (validatedData.scheduledAt !== undefined) {
    updateData.scheduled_at = validatedData.scheduledAt;
    updateData.status = validatedData.scheduledAt ? "queued" : "draft";
  }

  return updateData;
}

function shouldSyncPostToGoogle(post: any, validatedData: UpdatePostPayload) {
  return (
    post.status === "published" &&
    post.provider_post_id &&
    (validatedData.description !== undefined ||
      validatedData.mediaUrl !== undefined ||
      validatedData.ctaType !== undefined ||
      validatedData.ctaUrl !== undefined ||
      validatedData.title !== undefined)
  );
}

async function syncPostUpdateWithGoogle(
  supabase: SupabaseServerClient,
  post: any,
  validatedData: UpdatePostPayload,
) {
  const location = Array.isArray(post.gmb_locations)
    ? post.gmb_locations[0]
    : post.gmb_locations;
  const account =
    (Array.isArray(location?.gmb_accounts)
      ? location.gmb_accounts[0]
      : location?.gmb_accounts) || null;

  if (
    !location?.gmb_account_id ||
    !account?.account_id ||
    !post.provider_post_id
  ) {
    return;
  }

  try {
    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );
    const locationResourceV4 = buildV4LocationResource(
      account.account_id,
      location.location_id,
    );
    const postResourceUrl = new URL(
      `${GMB_V4_BASE}/${locationResourceV4}/localPosts/${post.provider_post_id}`,
    );

    const postBody = buildGooglePostBody({
      ...post,
      ...validatedData,
    } as GMBPost);
    const updateMask = buildUpdateMask(post, validatedData);

    if (updateMask.length > 0) {
      postResourceUrl.searchParams.set("updateMask", updateMask.join(","));
    }

    const response = await fetch(postResourceUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postBody),
    });

    if (!response.ok) {
      console.error("[Posts] Failed to update post on Google");
    }
  } catch (error) {
    console.error("[Posts] Error updating post on Google:", error);
  }
}

function buildUpdateMask(post: any, validatedData: UpdatePostPayload) {
  const mask: string[] = [];

  if (validatedData.description) mask.push("summary");
  if (validatedData.mediaUrl) mask.push("media");
  if (validatedData.ctaType) mask.push("callToAction");

  if (
    validatedData.title &&
    (post.post_type === "event" || post.post_type === "offer")
  ) {
    if (post.post_type === "event") {
      mask.push("event");
    }
    if (post.post_type === "offer") {
      mask.push("offer");
    }
  }

  return mask;
}

// ============================================
// 4. DELETE POST
// ============================================
export async function deletePost(postId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          gmb_accounts!inner(id, account_id)
        )
      `,
      )
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !post) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    const location = Array.isArray(post.gmb_locations)
      ? post.gmb_locations[0]
      : post.gmb_locations;
    const account =
      (Array.isArray(location?.gmb_accounts)
        ? location.gmb_accounts[0]
        : location?.gmb_accounts) || null;

    // Delete from Google if published
    if (
      post.status === "published" &&
      post.provider_post_id &&
      location?.gmb_account_id &&
      account?.account_id
    ) {
      try {
        const accessToken = await getValidAccessToken(
          supabase,
          location.gmb_account_id,
        );
        const locationResourceV4 = buildV4LocationResource(
          account.account_id,
          location.location_id,
        );
        const gmbApiUrl = `${GMB_V4_BASE}/${locationResourceV4}/localPosts/${post.provider_post_id}`;

        const response = await fetch(gmbApiUrl, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok && response.status !== 404) {
          if (response.status === 401) {
            return {
              success: false,
              error:
                "Authentication expired. Please reconnect your Google account.",
              errorCode: "AUTH_EXPIRED",
            };
          }
          console.error("[Posts] Delete API error");
          // Continue to delete from database
        }
      } catch (error) {
        console.error("[Posts] Error deleting from Google:", error);
        // Continue to delete from database
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("gmb_posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      return {
        success: false,
        error: "Failed to delete post from database",
      };
    }

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Post deleted successfully",
    };
  } catch (error: any) {
    console.error("[Posts] Delete error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete post",
    };
  }
}

// ============================================
// 5. PUBLISH POST (for drafts/queued posts)
// ============================================
export async function publishPost(postId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
      };
    }

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
      .select(
        `
        *,
        gmb_locations!inner(
          id,
          location_id,
          gmb_account_id,
          gmb_accounts!inner(id, account_id)
        )
      `,
      )
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !post) {
      return {
        success: false,
        error: "Post not found",
      };
    }

    if (post.status === "published") {
      return {
        success: false,
        error: "Post is already published",
      };
    }

    const location = Array.isArray(post.gmb_locations)
      ? post.gmb_locations[0]
      : post.gmb_locations;
    const account =
      (Array.isArray(location?.gmb_accounts)
        ? location.gmb_accounts[0]
        : location?.gmb_accounts) || null;

    if (!location?.gmb_account_id || !account?.account_id) {
      return {
        success: false,
        error:
          "Linked Google account not found. Please reconnect your Google account.",
      };
    }

    const accessToken = await getValidAccessToken(
      supabase,
      location.gmb_account_id,
    );

    // Prepare post data for Google API
    const postData = buildGooglePostBody(post);

    // Call Google Business Profile API
    const locationResourceV4 = buildV4LocationResource(
      account.account_id,
      location.location_id,
    );
    const gmbApiUrl = `${GMB_V4_BASE}/${locationResourceV4}/localPosts`;

    const response = await fetch(gmbApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return {
          success: false,
          error:
            "Authentication expired. Please reconnect your Google account.",
          errorCode: "AUTH_EXPIRED",
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error:
            "Permission denied. Please check your Google Business Profile permissions.",
          errorCode: "PERMISSION_DENIED",
        };
      }

      if (response.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please try again later.",
          errorCode: "RATE_LIMIT",
        };
      }

      console.error("[Posts] Publish API error:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Failed to publish post on Google",
      };
    }

    const result = await response.json();

    // Update post in database
    const { error: updateError } = await supabase
      .from("gmb_posts")
      .update({
        provider_post_id: result.name?.split("/").pop() || null,
        published_at: new Date().toISOString(),
        status: "published",
        metadata: result,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (updateError) {
      console.error("[Posts] Database update error:", updateError);
      // Post was published on Google, so return success
    }

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: "Post published successfully",
    };
  } catch (error: any) {
    console.error("[Posts] Publish post error:", error);
    return {
      success: false,
      error: error.message || "Failed to publish post",
    };
  }
}

// ============================================
// 6. SYNC POSTS FROM GOOGLE
// ============================================
export async function syncPostsFromGoogle(locationId?: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        synced: 0,
      };
    }

    // Get locations to sync
    let locationsQuery = supabase
      .from("gmb_locations")
      .select(
        `
        id,
        location_id,
        gmb_account_id,
        gmb_accounts!inner(id, account_id)
      `,
      )
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (locationId && locationId !== "all") {
      locationsQuery = locationsQuery.eq("id", locationId);
    }

    const { data: locations, error: locationsError } = await locationsQuery;

    if (locationsError || !locations || locations.length === 0) {
      return {
        success: false,
        error: "No locations found",
        synced: 0,
      };
    }

    let totalSynced = 0;

    for (const location of locations) {
      const account =
        (Array.isArray(location.gmb_accounts)
          ? location.gmb_accounts[0]
          : location.gmb_accounts) || null;

      if (!location.gmb_account_id || !account?.account_id) continue;

      try {
        const accessToken = await getValidAccessToken(
          supabase,
          location.gmb_account_id,
        );
        const locationResourceV4 = buildV4LocationResource(
          account.account_id,
          location.location_id,
        );
        const gmbApiUrl = `${GMB_V4_BASE}/${locationResourceV4}/localPosts`;

        const response = await fetch(gmbApiUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            return {
              success: false,
              error:
                "Authentication expired. Please reconnect your Google account.",
              errorCode: "AUTH_EXPIRED",
              synced: totalSynced,
            };
          }
          console.error(
            `[Posts] Failed to sync posts for location ${location.id}`,
          );
          continue;
        }

        const data = await response.json();
        const posts = data.localPosts || [];

        // Upsert posts
        for (const googlePost of posts) {
          const providerPostId = googlePost.name?.split("/").pop();

          if (!providerPostId) continue;

          const { error: upsertError } = await supabase
            .from("gmb_posts")
            .upsert(
              {
                user_id: user.id,
                location_id: location.id,
                provider_post_id: providerPostId,
                title: googlePost.summary?.substring(0, 200) || null,
                content: googlePost.summary || "",
                post_type: mapGoogleToPostType(googlePost.topicType),
                status: "published",
                published_at: googlePost.createTime || new Date().toISOString(),
                metadata: googlePost,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "provider_post_id",
                ignoreDuplicates: false,
              },
            );

          if (!upsertError) {
            totalSynced++;
          }
        }
      } catch (error) {
        console.error(`[Posts] Error syncing location ${location.id}:`, error);
        continue;
      }
    }

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return {
      success: true,
      message: `Synced ${totalSynced} posts`,
      synced: totalSynced,
    };
  } catch (error: any) {
    console.error("[Posts] Sync posts error:", error);
    return {
      success: false,
      error: error.message || "Failed to sync posts",
      synced: 0,
    };
  }
}

// ============================================
// 7. GET POST STATISTICS
// ============================================
type PostStatsContext = {
  supabase?: Awaited<ReturnType<typeof createClient>>;
  userId?: string;
};

export async function getPostStats(
  locationId?: string,
  context?: PostStatsContext,
) {
  try {
    const supabase = context?.supabase ?? (await createClient());
    let resolvedUserId = context?.userId;

    if (!resolvedUserId) {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: "Not authenticated",
          stats: null,
        };
      }
      resolvedUserId = user.id;
    }

    let query = supabase
      .from("gmb_posts")
      .select("status, post_type, published_at, scheduled_at", {
        count: "exact",
      })
      .eq("user_id", resolvedUserId);

    if (locationId && locationId !== "all") {
      query = query.eq("location_id", locationId);
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error("[Posts] Get stats error:", error);
      return {
        success: false,
        error: error.message,
        stats: null,
      };
    }

    const stats = {
      total: posts?.length || 0,
      published: posts?.filter((p) => p.status === "published").length || 0,
      drafts: posts?.filter((p) => p.status === "draft").length || 0,
      scheduled: posts?.filter((p) => p.status === "queued").length || 0,
      failed: posts?.filter((p) => p.status === "failed").length || 0,
      whatsNew: posts?.filter((p) => p.post_type === "whats_new").length || 0,
      events: posts?.filter((p) => p.post_type === "event").length || 0,
      offers: posts?.filter((p) => p.post_type === "offer").length || 0,
      thisWeek:
        posts?.filter((p) => {
          if (!p.published_at) return false;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(p.published_at) >= weekAgo;
        }).length || 0,
    };

    return {
      success: true,
      stats,
    };
  } catch (error: any) {
    console.error("[Posts] Get stats error:", error);
    return {
      success: false,
      error: error.message || "Failed to get post statistics",
      stats: null,
    };
  }
}

// ============================================
// 8. BULK DELETE POSTS
// ============================================
export async function bulkDeletePosts(postIds: string[]) {
  try {
    if (!postIds || postIds.length === 0) {
      return {
        success: false,
        error: "No posts selected",
        deleted: 0,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        deleted: 0,
      };
    }

    let deleted = 0;
    const errors: string[] = [];

    for (const postId of postIds) {
      const result = await deletePost(postId);
      if (result.success) {
        deleted++;
      } else {
        errors.push(result.error || "Unknown error");
      }
    }

    return {
      success: deleted > 0,
      message: `Deleted ${deleted} of ${postIds.length} posts`,
      deleted,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("[Posts] Bulk delete error:", error);
    return {
      success: false,
      error: error.message || "Failed to delete posts",
      deleted: 0,
    };
  }
}

// ============================================
// 10. ARCHIVE POST (soft delete)
// ============================================
export async function archivePost(postId: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse("Not authenticated");
    }

    // Get post details
    const { data: post, error: fetchError } = await supabase
      .from("gmb_posts")
      .select("*")
      .eq("id", postId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !post) {
      return createErrorResponse("Post not found");
    }

    // Archive by updating status to a metadata field
    const { error: updateError } = await supabase
      .from("gmb_posts")
      .update({
        status: "draft",
        metadata: {
          ...post.metadata,
          archived: true,
          archivedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (updateError) {
      console.error("[Posts] Archive error:", updateError);
      return createErrorResponse("Failed to archive post");
    }

    revalidatePath("/posts");
    revalidatePath("/dashboard");

    return createSuccessResponse("Post archived successfully");
  } catch (error: any) {
    console.error("[Posts] Archive error:", error);
    return createErrorResponse(error.message || "Failed to archive post");
  }
}

// ============================================
// 11. BULK ARCHIVE POSTS
// ============================================
export async function bulkArchivePosts(postIds: string[]) {
  try {
    if (!postIds || postIds.length === 0) {
      return {
        success: false,
        error: "No posts selected",
        archived: 0,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        archived: 0,
      };
    }

    let archived = 0;
    const errors: string[] = [];

    for (const postId of postIds) {
      const result = await archivePost(postId);
      if (result.success) {
        archived++;
      } else {
        errors.push(result.error || "Unknown error");
      }
    }

    return {
      success: archived > 0,
      message: `Archived ${archived} of ${postIds.length} posts`,
      archived,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("[Posts] Bulk archive error:", error);
    return {
      success: false,
      error: error.message || "Failed to archive posts",
      archived: 0,
    };
  }
}
export async function bulkPublishPosts(postIds: string[]) {
  try {
    if (!postIds || postIds.length === 0) {
      return {
        success: false,
        error: "No posts selected",
        published: 0,
      };
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        error: "Not authenticated",
        published: 0,
      };
    }

    let published = 0;
    const errors: string[] = [];

    for (const postId of postIds) {
      const result = await publishPost(postId);
      if (result.success) {
        published++;
      } else {
        errors.push(result.error || "Unknown error");
      }
    }

    return {
      success: published > 0,
      message: `Published ${published} of ${postIds.length} posts`,
      published,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("[Posts] Bulk publish error:", error);
    return {
      success: false,
      error: error.message || "Failed to publish posts",
      published: 0,
    };
  }
}
