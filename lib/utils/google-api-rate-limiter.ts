/**
 * ============================================================================
 * Google API Rate Limiter
 * ============================================================================
 *
 * Implements global rate limiting for Google API requests using Redis.
 * Prevents exceeding Google API quotas across all sync operations.
 *
 * Google API Limits (typical):
 * - 600 requests per minute per project
 * - ~10 requests per second (conservative)
 */

import { getRedisClient } from "@/lib/redis/client";
import { gmbLogger } from "@/lib/utils/logger";

export interface GoogleAPIRateLimiterConfig {
  /** Maximum requests per minute */
  requestsPerMinute: number;
  /** Maximum requests per second (conservative limit) */
  requestsPerSecond: number;
  /** Wait interval when rate limited (ms) */
  waitIntervalMs?: number;
}

const DEFAULT_CONFIG: GoogleAPIRateLimiterConfig = {
  requestsPerMinute: 600,
  requestsPerSecond: 10, // Conservative: 10 req/sec = 600 req/min
  waitIntervalMs: 100,
};

export class GoogleAPIRateLimiter {
  private config: GoogleAPIRateLimiterConfig;
  private redis: ReturnType<typeof getRedisClient> | null;

  constructor(config?: Partial<GoogleAPIRateLimiterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.redis = getRedisClient();
  }

  /**
   * Check if a request can be made within rate limits
   * @returns true if request is allowed, false if rate limited
   */
  async checkLimit(): Promise<boolean> {
    if (!this.redis) {
      // If Redis unavailable, allow requests (fail open)
      // Log warning but don't block
      gmbLogger.warn("Redis unavailable for rate limiting - allowing request");
      return true;
    }

    try {
      const now = Math.floor(Date.now() / 1000); // Current second
      const currentMinute = Math.floor(now / 60); // Current minute

      // Per-minute limit
      const minuteKey = `rate_limit:google_api:minute:${currentMinute}`;
      const minuteCount = await this.redis.incr(minuteKey);

      // Set expiration on first increment
      if (minuteCount === 1) {
        await this.redis.expire(minuteKey, 120); // 2 minutes TTL (safety margin)
      }

      if (minuteCount > this.config.requestsPerMinute) {
        gmbLogger.warn("Google API rate limit exceeded (per minute)", {
          count: minuteCount,
          limit: this.config.requestsPerMinute,
        });
        return false;
      }

      // Per-second limit
      const secondKey = `rate_limit:google_api:second:${now}`;
      const secondCount = await this.redis.incr(secondKey);

      // Set expiration on first increment
      if (secondCount === 1) {
        await this.redis.expire(secondKey, 2); // 2 seconds TTL
      }

      if (secondCount > this.config.requestsPerSecond) {
        gmbLogger.warn("Google API rate limit exceeded (per second)", {
          count: secondCount,
          limit: this.config.requestsPerSecond,
        });
        return false;
      }

      return true;
    } catch (error) {
      gmbLogger.error(
        "Error checking rate limit",
        error instanceof Error ? error : new Error(String(error)),
      );
      // On error, fail open (allow request)
      return true;
    }
  }

  /**
   * Wait until a slot is available
   * @param maxWaitMs Maximum time to wait in milliseconds
   * @returns true if slot available, false if timeout
   */
  async waitForSlot(maxWaitMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const waitInterval = this.config.waitIntervalMs || 100;

    while (Date.now() - startTime < maxWaitMs) {
      if (await this.checkLimit()) {
        return true; // Slot available
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, waitInterval));
    }

    // Timeout reached
    gmbLogger.warn("Rate limiter wait timeout", {
      maxWaitMs,
      waited: Date.now() - startTime,
    });
    return false;
  }

  /**
   * Get current rate limit statistics
   */
  async getStats(): Promise<{
    requestsThisMinute: number;
    requestsThisSecond: number;
    limitPerMinute: number;
    limitPerSecond: number;
  }> {
    if (!this.redis) {
      return {
        requestsThisMinute: 0,
        requestsThisSecond: 0,
        limitPerMinute: this.config.requestsPerMinute,
        limitPerSecond: this.config.requestsPerSecond,
      };
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const currentMinute = Math.floor(now / 60);

      const minuteKey = `rate_limit:google_api:minute:${currentMinute}`;
      const secondKey = `rate_limit:google_api:second:${now}`;

      const [minuteCount, secondCount] = await Promise.all([
        this.redis.get(minuteKey).then((v) => (v ? parseInt(v.toString()) : 0)),
        this.redis.get(secondKey).then((v) => (v ? parseInt(v.toString()) : 0)),
      ]);

      return {
        requestsThisMinute: minuteCount || 0,
        requestsThisSecond: secondCount || 0,
        limitPerMinute: this.config.requestsPerMinute,
        limitPerSecond: this.config.requestsPerSecond,
      };
    } catch (error) {
      gmbLogger.error(
        "Error getting rate limit stats",
        error instanceof Error ? error : new Error(String(error)),
      );
      return {
        requestsThisMinute: 0,
        requestsThisSecond: 0,
        limitPerMinute: this.config.requestsPerMinute,
        limitPerSecond: this.config.requestsPerSecond,
      };
    }
  }
}

// Singleton instance
let rateLimiterInstance: GoogleAPIRateLimiter | null = null;

/**
 * Get the global Google API rate limiter instance
 */
export function getGoogleAPIRateLimiter(): GoogleAPIRateLimiter {
  if (!rateLimiterInstance) {
    rateLimiterInstance = new GoogleAPIRateLimiter();
  }
  return rateLimiterInstance;
}

/**
 * Reset the rate limiter instance (useful for testing)
 */
export function resetGoogleAPIRateLimiter(): void {
  rateLimiterInstance = null;
}
