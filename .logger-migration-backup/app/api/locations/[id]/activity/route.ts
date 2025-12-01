// Location Activity Feed API
// Fetches activity feed for a specific location from activity_logs and related tables

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Activity types that can be displayed in the feed
 */
type ActivityType = "review" | "view" | "photo" | "post" | "question";

/**
 * Activity interface for the feed
 */
export interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Map activity_type from database to ActivityType
 */
function mapActivityType(activityType: string): ActivityType {
  const typeMap: Record<string, ActivityType> = {
    review_received: "review",
    review_responded: "review",
    question_answered: "question",
    question_draft: "question",
    post_created: "post",
    post_published: "post",
    post_deleted: "post",
    post_updated: "post",
    photo_uploaded: "photo",
    media_uploaded: "photo",
    location_viewed: "view",
    profile_viewed: "view",
  };

  // Check if activity type contains keywords
  const lowerType = activityType.toLowerCase();
  if (lowerType.includes("review")) return "review";
  if (lowerType.includes("question")) return "question";
  if (lowerType.includes("post")) return "post";
  if (lowerType.includes("photo") || lowerType.includes("media"))
    return "photo";
  if (lowerType.includes("view")) return "view";

  return typeMap[activityType] || "review";
}

/**
 * Format activity message for display
 */
function formatActivityMessage(
  activityType: string,
  message: string,
  metadata: Record<string, any>,
): string {
  // Use the message as-is, or format based on type
  return message;
}

/**
 * GET - Fetch activity feed for a location
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();
    const { id: locationId } = params;

    // ✅ SECURITY: Authentication check
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Authentication required. Please log in again.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      );
    }

    // ✅ SECURITY: Rate limiting
    const { success, headers: rateLimitHeaders } = await checkRateLimit(
      user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
          retry_after: rateLimitHeaders["X-RateLimit-Reset"],
        },
        {
          status: 429,
          headers: rateLimitHeaders as HeadersInit,
        },
      );
    }

    // ✅ Input validation
    if (!locationId || typeof locationId !== "string") {
      return NextResponse.json(
        {
          error: "Validation error",
          message: "Location ID is required",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    // ✅ SECURITY: Verify location ownership
    const { data: location, error: locationError } = await supabase
      .from("gmb_locations")
      .select("id, location_name")
      .eq("id", locationId)
      .eq("user_id", user.id)
      .single();

    if (locationError || !location) {
      console.error(
        "[Location Activity API] Location not found or access denied:",
        {
          locationId,
          userId: user.id,
          error: locationError,
        },
      );
      return NextResponse.json(
        {
          error: "Not found",
          message: "Location not found or you do not have access to it",
          code: "LOCATION_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)),
    );
    const limit = pageSize;
    const offset = (page - 1) * pageSize;

    console.log("[Location Activity API] Fetching activities for location:", {
      locationId,
      userId: user.id,
      page,
      pageSize,
    });

    // Fetch activities from activity_logs where metadata contains location_id
    // Since JSONB queries in Supabase can be tricky, we'll fetch recent activities and filter in code
    // This ensures we get all relevant activities even if they're stored with different metadata keys
    const { data: allUserLogs, error: logsError } = await supabase
      .from("activity_logs")
      .select("id, activity_type, activity_message, metadata, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200); // Fetch recent 200 activities for filtering

    // Filter activities that match this location
    let filteredLogs: any[] = [];
    if (allUserLogs) {
      filteredLogs = allUserLogs
        .filter((log) => {
          const metadata = log.metadata || {};
          // Check multiple possible keys for location_id
          return (
            metadata.location_id === locationId ||
            metadata.locationId === locationId ||
            metadata.location_uuid === locationId ||
            metadata.locationUuid === locationId
          );
        })
        .slice(offset, offset + limit);
    }

    if (logsError) {
      console.error(
        "[Location Activity API] Error fetching activity logs:",
        logsError,
      );
      // Continue with empty array - we'll still get activities from other sources
    }

    // Also fetch activities from related tables (reviews, posts, media, questions)
    // These might not be in activity_logs yet, so we'll create synthetic activities

    // Get recent reviews for this location
    const { data: recentReviews, error: reviewsError } = await supabase
      .from("gmb_reviews")
      .select(
        "id, rating, reviewer_name, review_text, created_at, status, review_reply",
      )
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (reviewsError) {
      console.error(
        "[Location Activity API] Error fetching reviews:",
        reviewsError,
      );
    }

    // Get recent posts for this location
    const { data: recentPosts, error: postsError } = await supabase
      .from("gmb_posts")
      .select("id, title, status, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (postsError) {
      console.error(
        "[Location Activity API] Error fetching posts:",
        postsError,
      );
    }

    // Get recent media for this location
    const { data: recentMedia, error: mediaError } = await supabase
      .from("gmb_media")
      .select("id, type, created_at")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (mediaError) {
      console.error(
        "[Location Activity API] Error fetching media:",
        mediaError,
      );
    }

    // Get recent questions for this location
    const { data: recentQuestions, error: questionsError } = await supabase
      .from("gmb_questions")
      .select("id, question_text, created_at, answer_text, answer_status")
      .eq("location_id", locationId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (questionsError) {
      console.error(
        "[Location Activity API] Error fetching questions:",
        questionsError,
      );
    }

    // Combine all activities into a unified feed
    const activities: Activity[] = [];

    // Add activities from activity_logs
    if (filteredLogs && filteredLogs.length > 0) {
      filteredLogs.forEach((log) => {
        activities.push({
          id: log.id,
          type: mapActivityType(log.activity_type),
          title: formatActivityMessage(
            log.activity_type,
            log.activity_message,
            log.metadata || {},
          ),
          description: log.activity_message,
          timestamp: new Date(log.created_at),
          metadata: log.metadata || {},
        });
      });
    }

    // Add synthetic activities from reviews
    if (recentReviews) {
      recentReviews.forEach((review) => {
        // Only add if not already in activity_logs
        const exists = activities.some(
          (a) => a.metadata?.review_id === review.id,
        );
        if (!exists) {
          const hasReply = Boolean(
            review.review_reply && review.review_reply.trim() !== "",
          );
          activities.push({
            id: `review-${review.id}`,
            type: "review",
            title: hasReply
              ? `Review from ${review.reviewer_name} responded`
              : `New ${review.rating}-star review from ${review.reviewer_name}`,
            description: review.review_text || undefined,
            timestamp: new Date(review.created_at),
            metadata: {
              review_id: review.id,
              rating: review.rating,
              reviewer_name: review.reviewer_name,
              has_reply: hasReply,
              status: review.status,
            },
          });
        }
      });
    }

    // Add synthetic activities from posts
    if (recentPosts) {
      recentPosts.forEach((post) => {
        const exists = activities.some((a) => a.metadata?.post_id === post.id);
        if (!exists) {
          activities.push({
            id: `post-${post.id}`,
            type: "post",
            title:
              post.status === "published"
                ? `Post "${post.title || "Untitled"}" published`
                : `Post "${post.title || "Untitled"}" ${post.status ?? "updated"}`,
            timestamp: new Date(post.created_at),
            metadata: {
              post_id: post.id,
              title: post.title,
              status: post.status,
            },
          });
        }
      });
    }

    // Add synthetic activities from media
    if (recentMedia) {
      recentMedia.forEach((media) => {
        const exists = activities.some(
          (a) => a.metadata?.media_id === media.id,
        );
        if (!exists) {
          activities.push({
            id: `media-${media.id}`,
            type: "photo",
            title: `New ${(media.type || "PHOTO").toLowerCase()} uploaded`,
            timestamp: new Date(media.created_at),
            metadata: {
              media_id: media.id,
              type: media.type,
            },
          });
        }
      });
    }

    // Add synthetic activities from questions
    if (recentQuestions) {
      recentQuestions.forEach((question) => {
        const exists = activities.some(
          (a) => a.metadata?.question_id === question.id,
        );
        if (!exists) {
          activities.push({
            id: `question-${question.id}`,
            type: "question",
            title: question.answer_text
              ? `Question answered: "${question.question_text.substring(0, 50)}${question.question_text.length > 50 ? "..." : ""}"`
              : `New question: "${question.question_text.substring(0, 50)}${question.question_text.length > 50 ? "..." : ""}"`,
            description: question.question_text,
            timestamp: new Date(question.created_at),
            metadata: {
              question_id: question.id,
              text: question.question_text,
              has_answer: !!question.answer_text,
              answer_status: question.answer_status,
            },
          });
        }
      });
    }

    // Sort all activities by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Take only the requested page
    const paginatedActivities = activities.slice(offset, offset + limit);

    // Convert Date objects to ISO strings for JSON serialization
    const serializedActivities = paginatedActivities.map((activity) => ({
      ...activity,
      timestamp: activity.timestamp.toISOString(),
    }));

    console.log("[Location Activity API] Returning activities:", {
      locationId,
      total: activities.length,
      returned: serializedActivities.length,
      page,
      pageSize,
    });

    return NextResponse.json(
      {
        activities: serializedActivities,
        pagination: {
          page,
          pageSize,
          total: activities.length,
          totalPages: Math.ceil(activities.length / pageSize),
          hasMore: offset + limit < activities.length,
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60",
        },
      },
    );
  } catch (error: any) {
    console.error("[Location Activity API] Unexpected error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "An unexpected error occurred while fetching activities",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
