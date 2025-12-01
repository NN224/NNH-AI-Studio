/**
 * GMB Cache Invalidation Utilities
 *
 * Centralized cache management for GMB-related data across the application.
 * This ensures consistent cache invalidation after sync, connect, or disconnect operations.
 */

import { gmbLogger } from "@/lib/utils/logger";
import { revalidatePath } from "next/cache";
import { CacheBucket, refreshCache } from "./cache-manager";

/**
 * Invalidate all GMB-related caches and Next.js paths
 *
 * This should be called after:
 * - GMB account connection
 * - GMB account disconnection
 * - GMB data sync (reviews, questions, locations, etc.)
 * - Manual data updates
 *
 * @param userId - User ID for targeted cache invalidation (optional)
 */
export async function invalidateGMBCache(userId?: string): Promise<void> {
  gmbLogger.debug("Starting cache invalidation", { userId });

  // ✅ Invalidate Next.js ISR/SSR paths for both locales
  const locales = ["en", "ar"];
  const paths = [
    "/home",
    "/dashboard",
    "/reviews",
    "/reviews/ai-cockpit",
    "/questions",
    "/posts",
    "/locations",
    "/metrics",
    "/settings/ai",
    "/settings/auto-pilot",
    "/sync-diagnostics",
  ];

  for (const locale of locales) {
    for (const path of paths) {
      try {
        // Revalidate as layout to ensure child pages are also invalidated
        revalidatePath(`/${locale}${path}`, "layout");
      } catch (error) {
        gmbLogger.warn(`Failed to revalidate ${locale}${path}`, { error });
      }
    }
  }

  // ✅ Refresh React Query / Redis cache buckets
  const cacheBuckets = [
    CacheBucket.DASHBOARD_OVERVIEW,
    CacheBucket.LOCATIONS,
    CacheBucket.REVIEWS,
    CacheBucket.QUESTIONS,
  ];

  for (const bucket of cacheBuckets) {
    try {
      if (userId) {
        await refreshCache(bucket, userId);
      }
    } catch (error) {
      gmbLogger.warn(`Failed to refresh cache bucket ${bucket}`, { error });
    }
  }

  gmbLogger.debug("Cache invalidation completed");
}

/**
 * Invalidate only review-related caches
 * Use this for more targeted invalidation after review operations
 */
export async function invalidateReviewsCache(userId?: string): Promise<void> {
  gmbLogger.debug("Invalidating reviews cache", { userId });

  const locales = ["en", "ar"];
  const paths = ["/reviews", "/reviews/ai-cockpit", "/dashboard"];

  for (const locale of locales) {
    for (const path of paths) {
      try {
        revalidatePath(`/${locale}${path}`, "layout");
      } catch (error) {
        gmbLogger.warn(`Failed to revalidate ${locale}${path}`, { error });
      }
    }
  }

  if (userId) {
    try {
      await refreshCache(CacheBucket.REVIEWS, userId);
    } catch (error) {
      gmbLogger.warn("Failed to refresh reviews cache", { error });
    }
  }

  gmbLogger.debug("Reviews cache invalidation completed");
}

/**
 * Invalidate only questions-related caches
 * Use this for more targeted invalidation after Q&A operations
 */
export async function invalidateQuestionsCache(userId?: string): Promise<void> {
  gmbLogger.debug("Invalidating questions cache", { userId });

  const locales = ["en", "ar"];
  const paths = ["/questions", "/dashboard"];

  for (const locale of locales) {
    for (const path of paths) {
      try {
        revalidatePath(`/${locale}${path}`, "layout");
      } catch (error) {
        gmbLogger.warn(`Failed to revalidate ${locale}${path}`, { error });
      }
    }
  }

  if (userId) {
    try {
      await refreshCache(CacheBucket.QUESTIONS, userId);
    } catch (error) {
      gmbLogger.warn("Failed to refresh questions cache", { error });
    }
  }

  gmbLogger.debug("Questions cache invalidation completed");
}

/**
 * Invalidate only location-related caches
 * Use this after location updates or new location sync
 */
export async function invalidateLocationsCache(userId?: string): Promise<void> {
  gmbLogger.debug("Invalidating locations cache", { userId });

  const locales = ["en", "ar"];
  const paths = ["/locations", "/dashboard"];

  for (const locale of locales) {
    for (const path of paths) {
      try {
        revalidatePath(`/${locale}${path}`, "layout");
      } catch (error) {
        gmbLogger.warn(`Failed to revalidate ${locale}${path}`, { error });
      }
    }
  }

  if (userId) {
    try {
      await refreshCache(CacheBucket.LOCATIONS, userId);
      await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, userId);
    } catch (error) {
      gmbLogger.warn("Failed to refresh locations cache", { error });
    }
  }

  gmbLogger.debug("Locations cache invalidation completed");
}

/**
 * Invalidate home page cache
 * Use this after account connection/disconnection
 */
export async function invalidateHomeCache(userId?: string): Promise<void> {
  gmbLogger.debug("Invalidating home cache", { userId });

  const locales = ["en", "ar"];

  for (const locale of locales) {
    try {
      revalidatePath(`/${locale}/home`, "page");
    } catch (error) {
      gmbLogger.warn(`Failed to revalidate ${locale}/home`, { error });
    }
  }

  if (userId) {
    try {
      await refreshCache(CacheBucket.DASHBOARD_OVERVIEW, userId);
    } catch (error) {
      gmbLogger.warn("Failed to refresh dashboard cache", { error });
    }
  }

  gmbLogger.debug("Home cache invalidation completed");
}
