"use server";

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { SupabaseClient } from "@supabase/supabase-js";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  message?: string;
}

/**
 * Rate limiter using Supabase
 * Tracks requests per user/IP in a time window
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = {
    maxRequests: 100,
    windowMs: 60000, // 1 minute
  },
  client?: SupabaseClient,
): Promise<RateLimitResult> {
  try {
    const supabase = client || (await createClient());
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    // Count requests in the current window
    const { count, error } = await supabase
      .from("rate_limit_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", identifier)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      apiLogger.error(
        "Rate limit check error",
        error instanceof Error ? error : new Error(String(error)),
      );
      // SECURITY: Fail closed in production - block request if check fails
      // This prevents abuse if the rate limit table is missing or DB is down
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          reset: new Date(now.getTime() + config.windowMs),
          message: "Rate limit check failed. Please try again later.",
        };
      }
      // In development, fail open to avoid blocking during testing
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        reset: new Date(now.getTime() + config.windowMs),
      };
    }

    const requestCount = count || 0;

    // Check if limit exceeded
    if (requestCount >= config.maxRequests) {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: new Date(now.getTime() + config.windowMs),
        message:
          config.message ||
          `Rate limit exceeded. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000} seconds.`,
      };
    }

    // Log this request
    await supabase.from("rate_limit_requests").insert({
      user_id: identifier,
      endpoint,
      created_at: now.toISOString(),
    });

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - requestCount - 1,
      reset: new Date(now.getTime() + config.windowMs),
    };
  } catch (error) {
    apiLogger.error(
      "Rate limiter error",
      error instanceof Error ? error : new Error(String(error)),
    );
    // SECURITY: Fail closed in production
    if (process.env.NODE_ENV === "production") {
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        reset: new Date(Date.now() + config.windowMs),
        message: "Rate limit service unavailable. Please try again later.",
      };
    }
    // In development, fail open
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      reset: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Clean up old rate limit records
 * Should be called periodically (e.g., via cron job)
 */
export async function cleanupRateLimitRecords(
  olderThanMs: number = 3600000,
): Promise<void> {
  try {
    const supabase = await createClient();
    const cutoffDate = new Date(Date.now() - olderThanMs);

    const { error } = await supabase
      .from("rate_limit_requests")
      .delete()
      .lt("created_at", cutoffDate.toISOString());

    if (error) {
      apiLogger.error(
        "Rate limit cleanup error",
        error instanceof Error ? error : new Error(String(error)),
      );
    }
  } catch (error) {
    apiLogger.error(
      "Rate limit cleanup error",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Get rate limit status for a user
 */
export async function getRateLimitStatus(
  identifier: string,
  endpoint: string,
  windowMs: number = 60000,
  client?: SupabaseClient, // Optional client for testing
): Promise<{ count: number; resetAt: Date }> {
  try {
    const supabase = client || (await createClient());
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const { count, error } = await supabase
      .from("rate_limit_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", identifier)
      .eq("endpoint", endpoint)
      .gte("created_at", windowStart.toISOString());

    if (error) {
      apiLogger.error(
        "Rate limit status error",
        error instanceof Error ? error : new Error(String(error)),
      );
      return { count: 0, resetAt: new Date(now.getTime() + windowMs) };
    }

    return {
      count: count || 0,
      resetAt: new Date(now.getTime() + windowMs),
    };
  } catch (error) {
    apiLogger.error(
      "Rate limit status error",
      error instanceof Error ? error : new Error(String(error)),
    );
    return { count: 0, resetAt: new Date(Date.now() + windowMs) };
  }
}

/**
 * Rate limit configurations for different endpoints
 */
export const RATE_LIMITS = {
  // Dashboard endpoints
  DASHBOARD_LOAD: {
    maxRequests: 30,
    windowMs: 60000, // 30 requests per minute
  },
  DASHBOARD_REFRESH: {
    maxRequests: 10,
    windowMs: 60000, // 10 refreshes per minute
  },

  // API endpoints
  API_READ: {
    maxRequests: 100,
    windowMs: 60000, // 100 reads per minute
  },
  API_WRITE: {
    maxRequests: 30,
    windowMs: 60000, // 30 writes per minute
  },

  // GMB sync - more lenient to avoid blocking long-running syncs
  GMB_SYNC: {
    maxRequests: 10,
    windowMs: 600000, // 10 syncs per 10 minutes (more permissive)
  },
  // GMB sync progress polling - very permissive for SSE fallback
  GMB_SYNC_PROGRESS: {
    maxRequests: 200,
    windowMs: 60000, // 200 polls per minute (for real-time progress updates)
  },

  // AI operations
  AI_GENERATE: {
    maxRequests: 20,
    windowMs: 60000, // 20 AI requests per minute
  },

  // Export operations
  EXPORT: {
    maxRequests: 5,
    windowMs: 60000, // 5 exports per minute
  },
} as const;

/**
 * Middleware helper for Next.js API routes
 */
export async function withRateLimit(
  userId: string,
  endpoint: string,
  config: RateLimitConfig,
  handler: () => Promise<Response>,
): Promise<Response> {
  const result = await checkRateLimit(userId, endpoint, config);

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Rate limit exceeded",
        message: result.message,
        limit: result.limit,
        reset: result.reset,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toISOString(),
          "Retry-After": Math.ceil(
            (result.reset.getTime() - Date.now()) / 1000,
          ).toString(),
        },
      },
    );
  }

  const response = await handler();

  // Add rate limit headers to successful responses
  response.headers.set("X-RateLimit-Limit", result.limit.toString());
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString());
  response.headers.set("X-RateLimit-Reset", result.reset.toISOString());

  return response;
}
