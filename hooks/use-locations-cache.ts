"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  LOCATIONS_TTL: 10 * 60 * 1000, // 10 minutes for locations
  STATS_TTL: 2 * 60 * 1000, // 2 minutes for stats
  REVIEWS_TTL: 3 * 60 * 1000, // 3 minutes for reviews
  MAX_CACHE_SIZE: 100, // Maximum cache entries
  BATCH_SIZE: 20, // Number of locations to fetch per batch
};

interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  loading?: boolean;
}

interface LocationCacheMetrics {
  hits: number;
  misses: number;
  size: number;
  lastCleared: number;
}

class LocationsCache {
  private cache = new Map<string, CacheEntry>();
  private metrics: LocationCacheMetrics = {
    hits: 0,
    misses: 0,
    size: 0,
    lastCleared: Date.now(),
  };

  // Cache key generators
  private getKey(type: string, params?: Record<string, any>): string {
    if (!params) return type;
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}:${JSON.stringify(params[key])}`)
      .join("|");
    return `${type}:${sortedParams}`;
  }

  // Get data from cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateSize();
      return null;
    }

    this.metrics.hits++;
    return entry.data;
  }

  // Set data in cache
  set<T>(key: string, data: T, ttl?: number): void {
    // Clean up if cache is too large
    if (this.cache.size >= CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || CACHE_CONFIG.DEFAULT_TTL,
      loading: false,
    });

    this.updateSize();
  }

  // Mark as loading
  setLoading(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      entry.loading = true;
    } else {
      this.cache.set(key, {
        data: null,
        timestamp: Date.now(),
        ttl: CACHE_CONFIG.DEFAULT_TTL,
        loading: true,
      });
    }
  }

  // Check if loading
  isLoading(key: string): boolean {
    const entry = this.cache.get(key);
    return entry?.loading || false;
  }

  // Invalidate specific pattern
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace("*", ".*"));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
    this.updateSize();
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      size: 0,
      lastCleared: Date.now(),
    };
  }

  // Get cache metrics
  getMetrics(): LocationCacheMetrics & { hitRate: number } {
    const total = this.metrics.hits + this.metrics.misses;
    return {
      ...this.metrics,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
    };
  }

  // Private methods
  private updateSize(): void {
    this.metrics.size = this.cache.size;
  }

  private cleanup(): void {
    // Remove oldest entries
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp,
    );

    const toRemove = Math.floor(CACHE_CONFIG.MAX_CACHE_SIZE * 0.3);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }

    this.updateSize();
  }
}

// Global cache instance
const locationsCache = new LocationsCache();

// Custom hook for caching locations data
export function useLocationsCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    dependencies?: unknown[];
    enabled?: boolean;
  } = {},
) {
  const { ttl, dependencies = [], enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cacheKey = key;

  const fetchData = useCallback(
    async (force = false) => {
      if (!enabled) return;

      // Check cache first
      if (!force) {
        const cached = locationsCache.get<T>(cacheKey);
        if (cached) {
          setData(cached);
          setError(null);
          return cached;
        }

        // Check if already loading
        if (locationsCache.isLoading(cacheKey)) {
          return;
        }
      }

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      locationsCache.setLoading(cacheKey);
      setLoading(true);
      setError(null);

      try {
        const result = await fetcher();

        // Cache the result
        locationsCache.set(cacheKey, result, ttl);
        setData(result);
        setLoading(false);

        return result;
      } catch (err) {
        const error = err as Error;
        if (error.name !== "AbortError") {
          setError(error);
          setLoading(false);

          // Don't cache errors, just remove loading state
          locationsCache.invalidatePattern(cacheKey);
        }
        throw error;
      }
    },
    [cacheKey, fetcher, ttl, enabled],
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, ...dependencies]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  const invalidate = useCallback(() => {
    locationsCache.invalidatePattern(cacheKey);
    fetchData(true);
  }, [cacheKey, fetchData]);

  return {
    data,
    loading: loading || locationsCache.isLoading(cacheKey),
    error,
    refetch,
    invalidate,
  };
}

// Hook for locations list with pagination and filtering
export function useLocationsData(
  filters: Record<string, string | number | boolean> = {},
  page = 1,
  pageSize = CACHE_CONFIG.BATCH_SIZE,
) {
  const cacheKey = `locations:${JSON.stringify({ filters, page, pageSize })}`;

  return useLocationsCachedFetch(
    cacheKey,
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...Object.entries(filters).reduce(
          (acc, [key, value]) => {
            if (value && value !== "All") {
              acc[key] = value.toString();
            }
            return acc;
          },
          {} as Record<string, string>,
        ),
      });

      const response = await fetch(`/api/locations/list-data?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch locations: ${response.statusText}`);
      }

      return response.json();
    },
    {
      ttl: CACHE_CONFIG.LOCATIONS_TTL,
      dependencies: [filters, page, pageSize],
    },
  );
}

// Hook for location statistics
export function useLocationsStats() {
  return useLocationsCachedFetch(
    "locations:stats",
    async () => {
      const response = await fetch("/api/dashboard/stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: CACHE_CONFIG.STATS_TTL,
    },
  );
}

// Hook for single location details
export function useLocationDetails(locationId: string) {
  return useLocationsCachedFetch(
    `location:${locationId}`,
    async () => {
      const response = await fetch(`/api/gmb/location/${locationId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch location: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: CACHE_CONFIG.LOCATIONS_TTL,
      dependencies: [locationId],
      enabled: !!locationId,
    },
  );
}

// Hook for location reviews
export function useLocationReviews(locationId: string, page = 1) {
  return useLocationsCachedFetch(
    `reviews:${locationId}:${page}`,
    async () => {
      const response = await fetch(
        `/api/reviews?location=${locationId}&page=${page}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch reviews: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: CACHE_CONFIG.REVIEWS_TTL,
      dependencies: [locationId, page],
      enabled: !!locationId,
    },
  );
}

// Hook for location health score details
export function useLocationHealth(locationId: string) {
  return useLocationsCachedFetch(
    `health:${locationId}`,
    async () => {
      const response = await fetch(`/api/gmb/location/${locationId}/health`);
      if (!response.ok) {
        throw new Error(`Failed to fetch health data: ${response.statusText}`);
      }
      return response.json();
    },
    {
      ttl: CACHE_CONFIG.STATS_TTL,
      dependencies: [locationId],
      enabled: !!locationId,
    },
  );
}

// Utility functions for cache management
export const locationsCacheUtils = {
  // Invalidate all location data
  invalidateAll: () => {
    locationsCache.clear();
  },

  // Invalidate specific location
  invalidateLocation: (locationId: string) => {
    locationsCache.invalidatePattern(`location:${locationId}*`);
    locationsCache.invalidatePattern(`reviews:${locationId}*`);
    locationsCache.invalidatePattern(`health:${locationId}*`);
  },

  // Invalidate locations list (after updates)
  invalidateLocationsList: () => {
    locationsCache.invalidatePattern("locations:*");
    locationsCache.invalidatePattern("locations:stats");
  },

  // Get cache metrics
  getMetrics: () => locationsCache.getMetrics(),

  // Preload data
  preloadLocation: async (locationId: string) => {
    const key = `location:${locationId}`;
    if (!locationsCache.get(key)) {
      try {
        const response = await fetch(`/api/gmb/location/${locationId}`);
        if (response.ok) {
          const data = await response.json();
          locationsCache.set(key, data, CACHE_CONFIG.LOCATIONS_TTL);
        }
      } catch (error) {
        console.warn("Failed to preload location:", error);
      }
    }
  },

  // Batch preload locations
  preloadLocations: async (locationIds: string[]) => {
    const promises = locationIds.map((id) =>
      locationsCacheUtils.preloadLocation(id),
    );
    await Promise.allSettled(promises);
  },
};

// Performance monitoring hook
export function useLocationsCacheMetrics() {
  const [metrics, setMetrics] = useState(locationsCache.getMetrics());

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(locationsCache.getMetrics());
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return metrics;
}
