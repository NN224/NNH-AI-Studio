import type { GMBReview } from "@/lib/types/database";
import { reviewsLogger } from "@/lib/utils/logger";
import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

/**
 * Review filters type
 */
interface ReviewFilters {
  locationId?: string;
  rating?: number;
  sentiment?: "positive" | "neutral" | "negative";
  status?: "pending" | "replied" | "all";
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: "newest" | "oldest" | "rating_high" | "rating_low";
}

/**
 * Review statistics
 */
interface ReviewStats {
  total: number;
  pending: number;
  replied: number;
  averageRating: number;
  responseRate: number;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

/**
 * Reviews state type
 */
interface ReviewsState {
  // Reviews data
  reviews: GMBReview[];
  reviewsLoading: boolean;
  reviewsError: Error | null;
  totalCount: number;
  hasMore: boolean;
  page: number;
  pageSize: number;

  // Filters
  filters: ReviewFilters;

  // Statistics
  stats: ReviewStats;
  statsLoading: boolean;

  // Selected review
  selectedReview: GMBReview | null;

  // Auto-reply status
  autoReplyEnabled: boolean;
  autoReplyLoading: boolean;

  // Bulk operations
  selectedReviewIds: Set<string>;
  bulkOperationInProgress: boolean;

  // Actions
  setReviews: (reviews: GMBReview[], append?: boolean) => void;
  setReviewsLoading: (loading: boolean) => void;
  setReviewsError: (error: Error | null) => void;
  setTotalCount: (count: number) => void;
  setHasMore: (hasMore: boolean) => void;
  setPage: (page: number) => void;
  setFilters: (filters: Partial<ReviewFilters>) => void;
  resetFilters: () => void;
  setStats: (stats: Partial<ReviewStats>) => void;
  setStatsLoading: (loading: boolean) => void;
  setSelectedReview: (review: GMBReview | null) => void;
  setAutoReplyEnabled: (enabled: boolean) => void;
  setAutoReplyLoading: (loading: boolean) => void;
  toggleReviewSelection: (reviewId: string) => void;
  selectAllReviews: () => void;
  clearSelection: () => void;
  setBulkOperationInProgress: (inProgress: boolean) => void;
  updateReview: (reviewId: string, updates: Partial<GMBReview>) => void;

  // Computed values
  getReviewById: (id: string) => GMBReview | undefined;
  getFilteredReviews: () => GMBReview[];
  getPendingReviews: () => GMBReview[];

  // Fetch functions
  fetchReviews: (append?: boolean) => Promise<void>;
  fetchReviewStats: () => Promise<void>;
  replyToReview: (reviewId: string, reply: string) => Promise<boolean>;
  generateAIReply: (reviewId: string) => Promise<string | null>;
  loadMore: () => Promise<void>;
}

/**
 * Reviews store implementation
 */
export const useReviewsStore = create<ReviewsState>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // Initial state
        reviews: [],
        reviewsLoading: false,
        reviewsError: null,
        totalCount: 0,
        hasMore: true,
        page: 1,
        pageSize: 20,
        filters: {},
        stats: {
          total: 0,
          pending: 0,
          replied: 0,
          averageRating: 0,
          responseRate: 0,
          sentimentBreakdown: {
            positive: 0,
            neutral: 0,
            negative: 0,
          },
        },
        statsLoading: false,
        selectedReview: null,
        autoReplyEnabled: false,
        autoReplyLoading: false,
        selectedReviewIds: new Set(),
        bulkOperationInProgress: false,

        // Actions
        setReviews: (reviews, append = false) =>
          set((state) => {
            if (append) {
              state.reviews = [...state.reviews, ...reviews];
            } else {
              state.reviews = reviews;
            }
          }),

        setReviewsLoading: (loading) =>
          set((state) => {
            state.reviewsLoading = loading;
          }),

        setReviewsError: (error) =>
          set((state) => {
            state.reviewsError = error;
          }),

        setTotalCount: (count) =>
          set((state) => {
            state.totalCount = count;
          }),

        setHasMore: (hasMore) =>
          set((state) => {
            state.hasMore = hasMore;
          }),

        setPage: (page) =>
          set((state) => {
            state.page = page;
          }),

        setFilters: (filters) =>
          set((state) => {
            state.filters = { ...state.filters, ...filters };
            state.page = 1; // Reset page when filters change
          }),

        resetFilters: () =>
          set((state) => {
            state.filters = {};
            state.page = 1;
          }),

        setStats: (stats) =>
          set((state) => {
            Object.assign(state.stats, stats);
          }),

        setStatsLoading: (loading) =>
          set((state) => {
            state.statsLoading = loading;
          }),

        setSelectedReview: (review) =>
          set((state) => {
            state.selectedReview = review;
          }),

        setAutoReplyEnabled: (enabled) =>
          set((state) => {
            state.autoReplyEnabled = enabled;
          }),

        setAutoReplyLoading: (loading) =>
          set((state) => {
            state.autoReplyLoading = loading;
          }),

        toggleReviewSelection: (reviewId) =>
          set((state) => {
            const newSet = new Set(state.selectedReviewIds);
            if (newSet.has(reviewId)) {
              newSet.delete(reviewId);
            } else {
              newSet.add(reviewId);
            }
            state.selectedReviewIds = newSet;
          }),

        selectAllReviews: () =>
          set((state) => {
            state.selectedReviewIds = new Set(state.reviews.map((r) => r.id));
          }),

        clearSelection: () =>
          set((state) => {
            state.selectedReviewIds = new Set();
          }),

        setBulkOperationInProgress: (inProgress) =>
          set((state) => {
            state.bulkOperationInProgress = inProgress;
          }),

        updateReview: (reviewId, updates) =>
          set((state) => {
            const index = state.reviews.findIndex((r) => r.id === reviewId);
            if (index !== -1) {
              Object.assign(state.reviews[index], updates);
            }
            if (state.selectedReview?.id === reviewId) {
              Object.assign(state.selectedReview, updates);
            }
          }),

        // Computed values
        getReviewById: (id) => {
          return get().reviews.find((r) => r.id === id);
        },

        getFilteredReviews: () => {
          const state = get();
          let filtered = [...state.reviews];

          // Apply client-side filters
          if (state.filters.status === "pending") {
            filtered = filtered.filter((r) => !r.has_reply);
          } else if (state.filters.status === "replied") {
            filtered = filtered.filter((r) => r.has_reply);
          }

          return filtered;
        },

        getPendingReviews: () => {
          return get().reviews.filter((r) => !r.has_reply);
        },

        // Fetch functions
        fetchReviews: async (append = false) => {
          const state = get();

          set((state) => {
            state.reviewsLoading = true;
            state.reviewsError = null;
          });

          try {
            const params = new URLSearchParams({
              page: state.page.toString(),
              pageSize: state.pageSize.toString(),
              ...Object.fromEntries(
                Object.entries(state.filters).filter(([_, v]) => v != null),
              ),
            });

            const response = await fetch(`/api/reviews?${params}`);
            if (!response.ok) {
              throw new Error("Failed to fetch reviews");
            }

            const data = await response.json();

            set((state) => {
              state.setReviews(data.reviews || [], append);
              state.totalCount = data.total || 0;
              state.hasMore =
                data.hasMore ?? data.reviews?.length === state.pageSize;
              state.reviewsLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.reviewsError =
                error instanceof Error ? error : new Error("Unknown error");
              state.reviewsLoading = false;
            });
          }
        },

        fetchReviewStats: async () => {
          set((state) => {
            state.statsLoading = true;
          });

          try {
            const response = await fetch("/api/reviews/stats");
            if (!response.ok) {
              throw new Error("Failed to fetch review stats");
            }

            const data = await response.json();

            set((state) => {
              state.stats = {
                total: data.total || 0,
                pending: data.pending || 0,
                replied: data.replied || 0,
                averageRating: data.averageRating || 0,
                responseRate: data.responseRate || 0,
                sentimentBreakdown: data.sentimentBreakdown || {
                  positive: 0,
                  neutral: 0,
                  negative: 0,
                },
              };
              state.statsLoading = false;
            });
          } catch (error) {
            set((state) => {
              state.statsLoading = false;
            });
          }
        },

        replyToReview: async (reviewId, reply) => {
          try {
            const response = await fetch(`/api/reviews/${reviewId}/reply`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reply_text: reply }),
            });

            if (!response.ok) {
              throw new Error("Failed to post reply");
            }

            // Update local state
            get().updateReview(reviewId, {
              reply_text: reply,
              has_reply: true,
              replied_at: new Date().toISOString(),
            });

            return true;
          } catch (error) {
            reviewsLogger.error(
              "Reply error",
              error instanceof Error ? error : new Error(String(error)),
            );
            return false;
          }
        },

        generateAIReply: async (reviewId) => {
          const review = get().getReviewById(reviewId);
          if (!review) return null;

          try {
            const response = await fetch("/api/reviews/ai-response", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                reviewId,
                reviewText: review.review_text || "",
                rating: review.rating,
                locationName: review.location_name || "Business",
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to generate AI reply");
            }

            const data = await response.json();
            return data.response || null;
          } catch (error) {
            reviewsLogger.error(
              "AI generation error",
              error instanceof Error ? error : new Error(String(error)),
            );
            return null;
          }
        },

        loadMore: async () => {
          const state = get();
          if (!state.hasMore || state.reviewsLoading) return;

          set((state) => {
            state.page = state.page + 1;
          });

          await get().fetchReviews(true);
        },
      })),
    ),
    {
      name: "ReviewsStore",
    },
  ),
);

/**
 * Selectors for common use cases
 */
export const selectReviewStats = (state: ReviewsState) => state.stats;
export const selectPendingReviews = (state: ReviewsState) =>
  state.reviews.filter((r) => !r.has_reply);
export const selectReviewFilters = (state: ReviewsState) => state.filters;
export const selectSelectedReview = (state: ReviewsState) =>
  state.selectedReview;
