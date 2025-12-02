"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeReviews } from "@/hooks/use-realtime";
import { createClient } from "@/lib/supabase/client";
import { reviewsLogger } from "@/lib/utils/logger";
import type { GMBReview } from "@/lib/types/database";

interface ReviewFilters {
  rating?: number;
  sentiment?: "positive" | "neutral" | "negative";
  status?: "pending" | "replied" | "responded" | "flagged" | "archived";
  locationId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

interface PaginationData {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UseReviewsReturn {
  reviews: GMBReview[];
  loading: boolean;
  error: string | null;
  pagination: PaginationData | null;
  filters: ReviewFilters;
  setFilters: (filters: ReviewFilters) => void;
  updateFilter: <K extends keyof ReviewFilters>(
    key: K,
    value: ReviewFilters[K] | null | undefined,
  ) => void;
  loadMore: () => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
  hasNextPage: boolean;
  isLoadingMore: boolean;
}

interface UseReviewsOptions {
  initialFilters?: ReviewFilters;
  pageSize?: number;
  infiniteScroll?: boolean;
  /** Enable realtime updates */
  enableRealtime?: boolean;
}

export function useReviews(options: UseReviewsOptions = {}): UseReviewsReturn {
  const {
    initialFilters = {},
    pageSize = 20,
    infiniteScroll = false,
    enableRealtime = true,
  } = options;

  const [reviews, setReviews] = useState<GMBReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [filters, setFiltersState] = useState<ReviewFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get user ID for realtime subscription
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  // Handle new review from realtime
  const handleNewReview = useCallback(
    (review: unknown) => {
      const newReview = review as GMBReview;

      // Check if review matches current filters
      if (filters.locationId && newReview.location_id !== filters.locationId) {
        return; // Skip if doesn't match location filter
      }
      if (filters.rating && newReview.rating !== filters.rating) {
        return; // Skip if doesn't match rating filter
      }

      // Add to beginning of list (newest first)
      setReviews((prev) => {
        // Check if review already exists
        const exists = prev.some((r) => r.id === newReview.id);
        if (exists) {
          // Update existing review
          return prev.map((r) => (r.id === newReview.id ? newReview : r));
        }
        // Add new review at the beginning
        return [newReview, ...prev];
      });

      // Update pagination total
      setPagination((prev) =>
        prev ? { ...prev, total: prev.total + 1 } : prev,
      );
    },
    [filters],
  );

  // Handle review update from realtime
  const handleReviewUpdate = useCallback((review: unknown) => {
    const updatedReview = review as GMBReview;

    setReviews((prev) =>
      prev.map((r) => (r.id === updatedReview.id ? updatedReview : r)),
    );
  }, []);

  // Subscribe to realtime updates
  useRealtimeReviews(enableRealtime ? userId : undefined, {
    onNewReview: handleNewReview,
    onReviewUpdate: handleReviewUpdate,
    showToasts: true,
  });

  const fetchReviews = useCallback(
    async (page: number, append: boolean = false) => {
      try {
        if (append) {
          setIsLoadingMore(true);
        } else {
          setLoading(true);
        }
        setError(null);

        // Build query parameters
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (filters.rating) {
          params.append("rating", filters.rating.toString());
        }
        if (filters.sentiment) {
          params.append("sentiment", filters.sentiment);
        }
        if (filters.status) {
          params.append("status", filters.status);
        }
        if (filters.locationId) {
          params.append("locationId", filters.locationId);
        }
        if (filters.search) {
          params.append("search", filters.search);
        }
        if (filters.dateFrom) {
          params.append("dateFrom", filters.dateFrom);
        }
        if (filters.dateTo) {
          params.append("dateTo", filters.dateTo);
        }

        const response = await fetch(`/api/reviews?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch reviews");
        }

        const data = await response.json();

        if (append && infiniteScroll) {
          // Append new reviews for infinite scroll
          setReviews((prev) => [...prev, ...data.reviews]);
        } else {
          // Replace reviews for normal pagination
          setReviews(data.reviews);
        }

        setPagination(data.pagination);
        setCurrentPage(page);
      } catch (err) {
        reviewsLogger.error(
          "Error fetching reviews",
          err instanceof Error ? err : new Error(String(err)),
          { filters },
        );
        setError(
          err instanceof Error ? err.message : "Failed to fetch reviews",
        );
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, pageSize, infiniteScroll],
  );

  // Initial load and when filters change
  useEffect(() => {
    fetchReviews(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]); // Only depend on filters

  const setFilters = useCallback((newFilters: ReviewFilters) => {
    setFiltersState(newFilters);
    setCurrentPage(1);
  }, []);

  const updateFilter = useCallback(
    <K extends keyof ReviewFilters>(
      key: K,
      value: ReviewFilters[K] | null | undefined,
    ) => {
      setFiltersState((prev) => {
        const newFilters = { ...prev };
        if (value === null || value === undefined || value === "") {
          delete newFilters[key];
        } else {
          newFilters[key] = value;
        }
        return newFilters;
      });
      setCurrentPage(1);
    },
    [],
  );

  const loadMore = useCallback(async () => {
    if (!pagination?.hasNextPage || isLoadingMore) {
      return;
    }
    await fetchReviews(currentPage + 1, infiniteScroll);
  }, [pagination, isLoadingMore, currentPage, fetchReviews, infiniteScroll]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page < 1 || (pagination && page > pagination.totalPages)) {
        return;
      }
      await fetchReviews(page, false);
    },
    [pagination, fetchReviews],
  );

  const refresh = useCallback(async () => {
    await fetchReviews(currentPage, false);
  }, [currentPage, fetchReviews]);

  return {
    reviews,
    loading,
    error,
    pagination,
    filters,
    setFilters,
    updateFilter,
    loadMore,
    goToPage,
    refresh,
    hasNextPage: pagination?.hasNextPage || false,
    isLoadingMore,
  };
}
