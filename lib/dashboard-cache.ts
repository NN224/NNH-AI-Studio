"use client";

import { logger } from "@/lib/utils/logger";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  staleWhileRevalidate?: number; // Serve stale data while revalidating (default: 1 minute)
}

class DashboardCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  private defaultSWR = 1 * 60 * 1000; // 1 minute
  private hits = 0;
  private misses = 0;

  /**
   * Get data from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Get data from cache with stale-while-revalidate support
   */
  getWithSWR<T>(key: string): { data: T | null; isStale: boolean } {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return { data: null, isStale: false };
    }

    const now = Date.now();
    const staleTime = entry.expiresAt - this.defaultSWR;

    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return { data: null, isStale: false };
    }

    // Check if stale but still valid
    const isStale = now > staleTime;

    this.hits++;
    return { data: entry.data as T, isStale };
  }

  /**
   * Set data in cache
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const ttl = options.ttl || this.defaultTTL;
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate (delete) a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate multiple cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let staleEntries = 0;
    let expiredEntries = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else if (now > entry.expiresAt - this.defaultSWR) {
        staleEntries++;
      } else {
        validEntries++;
      }
    }

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      validEntries,
      staleEntries,
      expiredEntries,
      hits: this.hits,
      misses: this.misses,
      hitRate,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Reset hit/miss statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

// Singleton instance
export const dashboardCache = new DashboardCache();

// Cache keys
export const CACHE_KEYS = {
  DASHBOARD_STATS: (userId: string) => `dashboard:stats:${userId}`,
  DASHBOARD_ACCOUNTS: (userId: string) => `dashboard:accounts:${userId}`,
  DASHBOARD_LOCATIONS: (userId: string) => `dashboard:locations:${userId}`,
  DASHBOARD_REVIEWS: (userId: string) => `dashboard:reviews:${userId}`,
  DASHBOARD_ACTIVITIES: (userId: string) => `dashboard:activities:${userId}`,
  DASHBOARD_SNAPSHOT: (userId: string) => `dashboard:snapshot:${userId}`,
  LOCATION_DETAILS: (locationId: string) => `location:details:${locationId}`,
  REVIEW_DETAILS: (reviewId: string) => `review:details:${reviewId}`,
} as const;

// Helper functions for common cache operations
export const cacheHelpers = {
  /**
   * Get dashboard data with automatic caching
   */
  async getDashboardData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    // Try to get from cache first
    const cached = dashboardCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    dashboardCache.set(key, data, options);

    return data;
  },

  /**
   * Get dashboard data with SWR support
   */
  async getDashboardDataSWR<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { data: cached, isStale } = dashboardCache.getWithSWR<T>(key);

    // Return cached data immediately if available
    if (cached !== null) {
      // Revalidate in background if stale
      if (isStale) {
        fetcher()
          .then((freshData) => {
            dashboardCache.set(key, freshData, options);
          })
          .catch((error) => {
            logger.error(
              "Background revalidation failed",
              error instanceof Error ? error : new Error(String(error)),
            );
          });
      }

      return cached;
    }

    // No cached data, fetch fresh
    const data = await fetcher();
    dashboardCache.set(key, data, options);

    return data;
  },

  /**
   * Invalidate all dashboard caches for a user
   */
  invalidateUserDashboard(userId: string): void {
    dashboardCache.invalidatePattern(`dashboard:.*:${userId}`);
  },

  /**
   * Prefetch dashboard data
   */
  async prefetchDashboardData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const data = await fetcher();
      dashboardCache.set(key, data, options);
    } catch (error) {
      logger.error(
        "Prefetch failed",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  },
};

// Auto cleanup every 5 minutes
if (typeof window !== "undefined") {
  setInterval(
    () => {
      dashboardCache.cleanup();
    },
    5 * 60 * 1000,
  );
}

export default dashboardCache;
