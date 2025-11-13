'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { DashboardSnapshot } from '@/types/dashboard';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class DashboardCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_EXPIRY = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, expiry?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: expiry || this.DEFAULT_EXPIRY,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.clear();
      return;
    }
    
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const dashboardCache = new DashboardCache();

// Hook for cached API calls
export function useCachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  expiry?: number
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const key = cacheKey || url;

  const fetchData = useCallback(async (force = false) => {
    // Check cache first (unless forced)
    if (!force && dashboardCache.has(key)) {
      const cachedData = dashboardCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setError(null);
        return cachedData;
      }
    }

    const requestId = ++latestRequestRef.current;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Cache the data
      dashboardCache.set(key, responseData, expiry);
      if (requestId === latestRequestRef.current) {
        setData(responseData);
      }
      
      return responseData;
    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      setError(errorMsg);
      throw err;
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }, [url, key, options, expiry]);

  const invalidate = useCallback(() => {
    dashboardCache.invalidate(key);
  }, [key]);

  return {
    data,
    loading,
    error,
    fetchData,
    invalidate,
    refetch: () => fetchData(true), // Force fetch
  };
}

// Dashboard-specific data fetcher
export function useDashboardStats(dateRange?: any) {
  const params = new URLSearchParams();
  if (dateRange?.preset !== 'custom') {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date(end);
    if (dateRange?.preset === '7d') start.setDate(end.getDate() - 7);
    if (dateRange?.preset === '30d') start.setDate(end.getDate() - 30);
    if (dateRange?.preset === '90d') start.setDate(end.getDate() - 90);
    params.set('start', start.toISOString());
    params.set('end', end.toISOString());
  } else if (dateRange?.start && dateRange?.end) {
    params.set('start', dateRange.start.toISOString());
    params.set('end', dateRange.end.toISOString());
  }

  const url = `/api/dashboard/stats?${params.toString()}`;
  const cacheKey = `dashboard-stats-${params.toString()}`;

  return useCachedFetch(url, undefined, cacheKey, 3 * 60 * 1000); // 3 minutes cache
}

export function useDashboardSnapshot() {
  const {
    data,
    loading,
    error,
    fetchData,
    invalidate,
    refetch,
  } = useCachedFetch<DashboardSnapshot>(
    '/api/dashboard/overview',
    undefined,
    'dashboard-overview',
    3 * 60 * 1000,
  );

  // Trigger initial fetch on first mount if no cached data yet
  useEffect(() => {
    if (!data && !loading) {
      fetchData().catch(() => {
        // Errors are already handled inside useCachedFetch
      });
    }
  }, [data, loading, fetchData]);

  // Listen to global dashboard refresh events (e.g. after GMB sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRefresh = () => {
      refetch().catch(() => {
        // ignore errors here; UI will surface via state
      });
    };

    window.addEventListener('dashboard:refresh', handleRefresh);
    window.addEventListener('gmb-sync-complete', handleRefresh);

    return () => {
      window.removeEventListener('dashboard:refresh', handleRefresh);
      window.removeEventListener('gmb-sync-complete', handleRefresh);
    };
  }, [refetch]);

  return {
    data,
    loading,
    error,
    fetchData,
    invalidate,
    refetch,
  };
}

// Cache management utilities
export const cacheUtils = {
  clear: () => dashboardCache.clear(),
  invalidatePattern: (pattern: string) => dashboardCache.invalidate(pattern),
  invalidateStats: () => dashboardCache.invalidate('dashboard-stats'),
  invalidateOverview: () => dashboardCache.invalidate('dashboard-overview'),
  invalidateAll: () => dashboardCache.clear(),
};

// Cache status for debugging
export function useCacheStatus() {
  const [cacheSize, setCacheSize] = useState(0);
  
  const updateStatus = useCallback(() => {
    setCacheSize((dashboardCache as any).cache.size);
  }, []);

  return {
    cacheSize,
    updateStatus,
    clearCache: cacheUtils.clear,
  };
}

export const getLocationMetricsFromSnapshot = (
  snapshot: DashboardSnapshot | null | undefined,
  locationId: string | undefined,
  location?: {
    rating?: number | null;
    ratingTrend?: number | null;
    responseRate?: number | null;
    healthScore?: number | null;
    insights?: { [key: string]: unknown };
  }
) => {
  if (!locationId) {
    return null;
  }

  const reviewTotals = snapshot?.reviewStats?.totals;
  const locationEntry = snapshot?.locationSummary?.locations?.find((loc) => loc.id === locationId);

  return {
    ratingTrend: snapshot?.kpis?.ratingTrendPct ?? location?.ratingTrend ?? 0,
    viewsThisMonth: snapshot?.postStats?.thisWeek ?? Number(location?.insights?.views ?? 0),
    responseRate: snapshot?.reviewStats?.responseRate ?? Number(location?.responseRate ?? location?.insights?.responseRate ?? 0),
    pendingReviews: reviewTotals?.pending ?? Number(location?.insights?.pendingReviews ?? 0),
    healthScore: locationEntry?.rating ?? snapshot?.kpis?.healthScore ?? Number(location?.healthScore ?? 0),
  };
};