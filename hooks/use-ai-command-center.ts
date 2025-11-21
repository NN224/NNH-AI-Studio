"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

// Types
export interface BusinessInfo {
  name: string;
  logo?: string;
  category?: string;
  locationId?: string;
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

export interface AICommandCenterData {
  businessInfo: BusinessInfo;
  urgentItems: UrgentItem[];
  managementStats: ManagementStats;
}

// Fetch business info from first location
async function fetchBusinessInfo(): Promise<BusinessInfo> {
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

    const firstLocation = locations[0];
    return {
      name:
        firstLocation.location_name || firstLocation.title || "Your Business",
      locationId: firstLocation.id,
      category:
        firstLocation.primary_category || firstLocation.category || "Business",
      logo: firstLocation.logo_url || firstLocation.profile_photo_url,
    };
  } catch (error) {
    console.error("Error fetching business info:", error);
    return {
      name: "Your Business",
      category: "Business",
    };
  }
}

// Fetch urgent items (reviews and questions)
async function fetchUrgentItems(): Promise<UrgentItem[]> {
  try {
    const urgentItems: UrgentItem[] = [];

    // Fetch locations first
    const locationsResponse = await fetch("/api/gmb/locations");
    if (!locationsResponse.ok) return [];

    const locationsData = await locationsResponse.json();
    const locations = locationsData.locations || [];

    if (locations.length === 0) return [];

    // Get first location for reviews
    const firstLocation = locations[0];

    // Fetch pending reviews (negative ones with high priority)
    try {
      const reviewsResponse = await fetch(
        `/api/gmb/location/${firstLocation.id}/reviews?has_reply=false&limit=5`,
      );
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        const reviews = reviewsData.reviews || [];

        reviews.forEach((review: any) => {
          const rating = review.rating || review.star_rating || 0;
          const priority =
            rating <= 2 ? "high" : rating === 3 ? "medium" : "low";

          // Only show negative/neutral reviews as urgent
          if (rating <= 3 && !review.has_reply) {
            urgentItems.push({
              id: review.id || review.review_id,
              type: "review",
              priority,
              title: `${rating}-star review needs response`,
              content: review.review_text || review.comment || "",
              timestamp:
                review.review_date || review.create_time || review.created_at,
              metadata: {
                rating,
                author:
                  review.reviewer_name ||
                  review.reviewer?.displayName ||
                  "Anonymous",
                locationName: firstLocation.location_name,
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
        `/api/gmb/questions?locationId=${firstLocation.id}&status=unanswered&limit=5`,
      );
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        const questions = questionsData.questions || questionsData.data || [];

        questions.forEach((question: any) => {
          const hoursSinceAsked =
            (Date.now() -
              new Date(question.create_time || question.created_at).getTime()) /
            (1000 * 60 * 60);
          const priority =
            hoursSinceAsked > 48
              ? "high"
              : hoursSinceAsked > 24
                ? "medium"
                : "low";

          urgentItems.push({
            id: question.id || question.question_id,
            type: "question",
            priority,
            title: "Unanswered question",
            content: question.question_text || question.text || "",
            timestamp: question.create_time || question.created_at,
            metadata: {
              author: question.author?.displayName || "Customer",
              locationName: firstLocation.location_name,
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
    const stats = statsData.stats || {};

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
          const posts = await postsResponse.json();
          const allPosts = posts.posts || posts.data || [];

          // Count published and scheduled posts
          const now = new Date();
          const published = allPosts.filter((post: any) => {
            const postDate = new Date(post.create_time || post.created_at);
            return postDate <= now && post.state !== "SCHEDULED";
          }).length;

          const scheduledPosts = allPosts.filter((post: any) => {
            const postDate = new Date(post.create_time || post.created_at);
            return postDate > now || post.state === "SCHEDULED";
          });

          const scheduled = scheduledPosts.length;

          // Get next scheduled post
          if (scheduledPosts.length > 0) {
            scheduledPosts.sort((a: any, b: any) => {
              const dateA = new Date(a.create_time || a.created_at);
              const dateB = new Date(b.create_time || b.created_at);
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
    const totalReviews = stats.total_reviews || 0;
    const pendingReviews = stats.pending_reviews || 0;
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
        total: stats.total_questions || 0,
        unanswered: stats.pending_questions || 0,
        avgResponseTime: stats.avg_response_time || "N/A",
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

// Fetch all command center data
async function fetchCommandCenterData(): Promise<AICommandCenterData> {
  const [businessInfo, urgentItems, managementStats] = await Promise.all([
    fetchBusinessInfo(),
    fetchUrgentItems(),
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
 */
export function useAICommandCenterData() {
  return useQuery({
    queryKey: ["ai-command-center-data"],
    queryFn: fetchCommandCenterData,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 20000, // Consider data stale after 20 seconds
  });
}

/**
 * Hook for AI Chat functionality
 */
export function useAIChat() {
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = async (message: string): Promise<string> => {
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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      return data.message?.content || data.message || "I'm here to help!";
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
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
