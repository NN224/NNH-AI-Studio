"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// Types
export interface BusinessInfo {
  name: string;
  logo?: string;
  category?: string;
  locationId?: string;
  accountId?: string;
}

export interface UrgentItem {
  id: string;
  type: "review" | "question" | "post";
  priority: "high" | "medium" | "low";
  title: string;
  content: string;
  timestamp: string;
  metadata?: {
    rating?: number;
    author?: string;
    locationName?: string;
  };
  viewHref: string;
}

export interface ManagementStats {
  reviews: {
    total: number;
    pending: number;
    responseRate: string;
  };
  posts: {
    published: number;
    scheduled: number;
    nextPost?: string;
  };
  questions: {
    total: number;
    unanswered: number;
    avgResponseTime?: string;
  };
}

// API Response types
interface APIReview {
  id?: string;
  review_id?: string;
  rating?: number;
  star_rating?: number;
  has_reply?: boolean;
  review_text?: string;
  comment?: string;
  review_date?: string;
  create_time?: string;
  created_at?: string;
  reviewer_name?: string;
  reviewer?: { displayName?: string };
}

interface APIQuestion {
  id?: string;
  question_id?: string;
  question_text?: string;
  text?: string;
  create_time?: string;
  created_at?: string;
  author?: { displayName?: string };
}

interface APIPost {
  id?: string;
  create_time?: string;
  created_at?: string;
  state?: string;
}

export interface AICommandCenterData {
  businessInfo: BusinessInfo;
  urgentItems: UrgentItem[];
  managementStats: ManagementStats;
}

// Fetch business info - uses selectedLocationId if provided, otherwise first location
async function fetchBusinessInfo(
  selectedLocationId?: string | null,
): Promise<BusinessInfo> {
  try {
    const response = await fetch("/api/gmb/locations");
    if (!response.ok) {
      throw new Error("Failed to fetch locations");
    }

    const data = await response.json();
    const locations = data.locations || [];

    if (locations.length === 0) {
      return {
        name: "Your Business",
        category: "Business",
      };
    }

    // Find selected location or fallback to first
    const targetLocation = selectedLocationId
      ? locations.find(
          (loc: { id: string }) => loc.id === selectedLocationId,
        ) || locations[0]
      : locations[0];

    return {
      name:
        targetLocation.location_name || targetLocation.title || "Your Business",
      locationId: targetLocation.id,
      category:
        targetLocation.primary_category ||
        targetLocation.category ||
        "Business",
      logo: targetLocation.logo_url || targetLocation.profile_photo_url,
      accountId: targetLocation.gmb_account_id,
    };
  } catch (error) {
    console.error("Error fetching business info:", error);
    return {
      name: "Your Business",
      category: "Business",
    };
  }
}

// Fetch urgent items (reviews and questions) - uses selectedLocationId if provided
async function fetchUrgentItems(
  selectedLocationId?: string | null,
): Promise<UrgentItem[]> {
  try {
    const urgentItems: UrgentItem[] = [];

    // Fetch locations first
    const locationsResponse = await fetch("/api/gmb/locations");
    if (!locationsResponse.ok) return [];

    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];

    if (locations.length === 0) return [];

    // Find selected location or fallback to first
    const targetLocation = selectedLocationId
      ? locations.find(
          (loc: { id: string }) => loc.id === selectedLocationId,
        ) || locations[0]
      : locations[0];

    // Fetch pending reviews (negative ones with high priority)
    try {
      const reviewsResponse = await fetch(
        `/api/gmb/location/${targetLocation.id}/reviews?has_reply=false&limit=5`,
      );
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        const reviews = reviewsData.reviews || [];

        reviews.forEach((review: APIReview) => {
          const rating = review.rating || review.star_rating || 0;
          const priority =
            rating <= 2 ? "high" : rating === 3 ? "medium" : "low";

          // Only show negative/neutral reviews as urgent
          if (rating <= 3 && !review.has_reply) {
            urgentItems.push({
              id: review.id || review.review_id || "",
              type: "review",
              priority,
              title: `${rating}-star review needs response`,
              content: review.review_text || review.comment || "",
              timestamp:
                review.review_date ||
                review.create_time ||
                review.created_at ||
                new Date().toISOString(),
              metadata: {
                rating,
                author:
                  review.reviewer_name ||
                  review.reviewer?.displayName ||
                  "Anonymous",
                locationName: targetLocation.location_name,
              },
              viewHref: `/reviews?id=${review.id}`,
            });
          }
        });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }

    // Fetch unanswered questions
    try {
      const questionsResponse = await fetch(
        `/api/gmb/questions?locationId=${targetLocation.id}&status=unanswered&limit=5`,
      );
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        // Handle wrapped response: { success: true, data: { questions: [...] } }
        const rawData = questionsData.data || questionsData;
        const questions = Array.isArray(rawData)
          ? rawData
          : rawData.questions || [];

        questions.forEach((question: APIQuestion) => {
          const hoursSinceAsked =
            (Date.now() -
              new Date(
                question.create_time || question.created_at || Date.now(),
              ).getTime()) /
            (1000 * 60 * 60);
          const priority =
            hoursSinceAsked > 48
              ? "high"
              : hoursSinceAsked > 24
                ? "medium"
                : "low";

          urgentItems.push({
            id: question.id || question.question_id || "",
            type: "question",
            priority,
            title: "Unanswered question",
            content: question.question_text || question.text || "",
            timestamp:
              question.create_time ||
              question.created_at ||
              new Date().toISOString(),
            metadata: {
              author: question.author?.displayName || "Customer",
              locationName: targetLocation.location_name,
            },
            viewHref: `/questions?id=${question.id}`,
          });
        });
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    }

    // Sort by priority and timestamp
    urgentItems.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return urgentItems.slice(0, 10); // Return top 10 urgent items
  } catch (error) {
    console.error("Error fetching urgent items:", error);
    return [];
  }
}

// Fetch management stats
async function fetchManagementStats(): Promise<ManagementStats> {
  try {
    // Fetch dashboard stats from API
    const statsResponse = await fetch("/api/dashboard/stats");
    if (!statsResponse.ok) {
      throw new Error("Failed to fetch dashboard stats");
    }

    const statsData = await statsResponse.json();
    const stats = statsData; // API returns flat object now, not wrapped in stats

    // Fetch locations to get location IDs
    const locationsResponse = await fetch("/api/gmb/locations");
    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];

    const postsData: {
      published: number;
      scheduled: number;
      nextPost?: string;
    } = {
      published: 0,
      scheduled: 0,
    };

    // Fetch posts if we have locations
    if (locations.length > 0) {
      try {
        const postsResponse = await fetch(
          `/api/gmb/posts/list?locationId=${locations[0].id}&limit=100`,
        );
        if (postsResponse.ok) {
          const postsResponse2 = await postsResponse.json();
          // Handle wrapped response: { success: true, data: { items: [...] } }
          const rawPostsData = postsResponse2.data || postsResponse2;
          const allPosts = Array.isArray(rawPostsData)
            ? rawPostsData
            : rawPostsData.items || rawPostsData.posts || [];

          // Count published and scheduled posts
          const now = new Date();
          const published = allPosts.filter((post: APIPost) => {
            const postDate = new Date(
              post.create_time || post.created_at || Date.now(),
            );
            return postDate <= now && post.state !== "SCHEDULED";
          }).length;

          const scheduledPosts = allPosts.filter((post: APIPost) => {
            const postDate = new Date(
              post.create_time || post.created_at || Date.now(),
            );
            return postDate > now || post.state === "SCHEDULED";
          });

          const scheduled = scheduledPosts.length;

          // Get next scheduled post
          if (scheduledPosts.length > 0) {
            scheduledPosts.sort((a: APIPost, b: APIPost) => {
              const dateA = new Date(
                a.create_time || a.created_at || Date.now(),
              );
              const dateB = new Date(
                b.create_time || b.created_at || Date.now(),
              );
              return dateA.getTime() - dateB.getTime();
            });

            const nextPostDate = new Date(
              scheduledPosts[0].create_time || scheduledPosts[0].created_at,
            );
            postsData.nextPost = nextPostDate.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });
          }

          postsData.published = published;
          postsData.scheduled = scheduled;
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
      }
    }

    // Calculate response rate
    const totalReviews = stats.totalReviews || 0;
    const pendingReviews = stats.pendingReviews || 0;
    const respondedReviews = totalReviews - pendingReviews;
    const responseRate =
      totalReviews > 0
        ? Math.round((respondedReviews / totalReviews) * 100)
        : 0;

    return {
      reviews: {
        total: totalReviews,
        pending: pendingReviews,
        responseRate: `${responseRate}%`,
      },
      posts: postsData,
      questions: {
        total: stats.totalQuestions || 0,
        unanswered: stats.pendingQuestions || 0,
        avgResponseTime: stats.avgResponseTime || "N/A",
      },
    };
  } catch (error) {
    console.error("Error fetching management stats:", error);
    return {
      reviews: {
        total: 0,
        pending: 0,
        responseRate: "0%",
      },
      posts: {
        published: 0,
        scheduled: 0,
      },
      questions: {
        total: 0,
        unanswered: 0,
      },
    };
  }
}

// Fetch all command center data - uses selectedLocationId if provided
async function fetchCommandCenterData(
  selectedLocationId?: string | null,
): Promise<AICommandCenterData> {
  const [businessInfo, urgentItems, managementStats] = await Promise.all([
    fetchBusinessInfo(selectedLocationId),
    fetchUrgentItems(selectedLocationId),
    fetchManagementStats(),
  ]);

  return {
    businessInfo,
    urgentItems,
    managementStats,
  };
}

/**
 * Hook to fetch AI Command Center data
 * @param selectedLocationId - Optional location ID to fetch data for specific location
 */
export function useAICommandCenterData(selectedLocationId?: string | null) {
  return useQuery({
    queryKey: ["ai-command-center-data", selectedLocationId],
    queryFn: () => fetchCommandCenterData(selectedLocationId),
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

// AI Chat Response Types
export interface AIChatSuccessResponse {
  type: "success";
  message: string;
}

export interface AIChatErrorResponse {
  type: "error";
  message: string;
  errorCode?: string;
  canRetry?: boolean;
}

export type AIChatResponse = AIChatSuccessResponse | AIChatErrorResponse;

/**
 * Hook for AI Chat functionality
 */
export function useAIChat() {
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = async (
    message: string,
    provider: string = "openai",
  ): Promise<AIChatResponse> => {
    setIsProcessing(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory: [],
          provider, // Add provider selection
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error || "Failed to send message";

        // Return structured error response
        return {
          type: "error",
          message: errorMessage,
          errorCode: response.status.toString(),
          canRetry: response.status >= 500 || response.status === 429,
        };
      }

      const data = await response.json();
      const messageContent =
        data.message?.content || data.message || "I'm here to help!";

      // Return structured success response
      return {
        type: "success",
        message: messageContent,
      };
    } catch (error) {
      console.error("Chat error:", error);

      // Return structured error response for network/unexpected errors
      return {
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Please try again.",
        canRetry: true,
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    sendMessage,
    isProcessing,
  };
}

/**
 * Hook for AI Actions (draft replies, etc.)
 */
export function useAIActions() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({
      itemId,
      actionType,
    }: {
      itemId: string;
      actionType: string;
    }) => {
      const response = await fetch("/api/ai/actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId,
          actionType,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to process action");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch data after successful action
      queryClient.invalidateQueries({ queryKey: ["ai-command-center-data"] });
    },
  });

  const processAction = async (itemId: string, actionType: string) => {
    return mutation.mutateAsync({ itemId, actionType });
  };

  return {
    processAction,
    isProcessing: mutation.isPending,
  };
}
