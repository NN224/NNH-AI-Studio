'use client';

import { useState, useEffect, useCallback } from 'react';
import type { GMBReview } from '@/lib/types/database';

interface ReviewFilters {
  rating?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  status?: 'pending' | 'replied' | 'responded' | 'flagged' | 'archived';
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
  updateFilter: (key: keyof ReviewFilters, value: any) => void;
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
}

export function useReviews(options: UseReviewsOptions = {}): UseReviewsReturn {
  const {
    initialFilters = {},
    pageSize = 20,
    infiniteScroll = false,
  } = options;

  const [reviews, setReviews] = useState<GMBReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [filters, setFiltersState] = useState<ReviewFilters>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);

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
          params.append('rating', filters.rating.toString());
        }
        if (filters.sentiment) {
          params.append('sentiment', filters.sentiment);
        }
        if (filters.status) {
          params.append('status', filters.status);
        }
        if (filters.locationId) {
          params.append('locationId', filters.locationId);
        }
        if (filters.search) {
          params.append('search', filters.search);
        }
        if (filters.dateFrom) {
          params.append('dateFrom', filters.dateFrom);
        }
        if (filters.dateTo) {
          params.append('dateTo', filters.dateTo);
        }

        const response = await fetch(`/api/reviews?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch reviews');
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
        console.error('Error fetching reviews:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch reviews');
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [filters, pageSize, infiniteScroll]
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

  const updateFilter = useCallback((key: keyof ReviewFilters, value: any) => {
    setFiltersState((prev) => {
      const newFilters = { ...prev };
      if (value === null || value === undefined || value === '') {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
    setCurrentPage(1);
  }, []);

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
    [pagination, fetchReviews]
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
