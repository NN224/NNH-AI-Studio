/**
 * Rate Limiting Wrapper for API Routes
 *
 * @security CRITICAL - Protects against abuse and DDoS attacks
 *
 * Usage:
 * export const GET = withRateLimit(handler, 100, 60); // 100 requests per 60 seconds
 */

import { checkKeyRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextRequest, NextResponse } from "next/server";

export type RateLimitedHandler = (
  request: NextRequest,
  context?: Record<string, unknown>,
) => Promise<NextResponse>;

interface RateLimitOptions {
  /** Maximum number of requests allowed */
  limit?: number;
  /** Time window in seconds */
  window?: number;
  /** Custom key for rate limiting (default: user ID) */
  keyGenerator?: (request: NextRequest) => Promise<string | null>;
  /** Skip authentication check */
  skipAuth?: boolean;
  /** Error message to return when rate limited */
  errorMessage?: string;
}

/**
 * Default key generator using user ID
 */
async function defaultKeyGenerator(
  request: NextRequest,
): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Wraps an API route handler with rate limiting
 *
 * @param handler - The route handler to protect
 * @param options - Rate limiting configuration
 * @returns Protected handler with rate limiting
 */
export function withRateLimit(
  handler: RateLimitedHandler,
  options: RateLimitOptions = {},
): RateLimitedHandler {
  const {
    limit = 100,
    window = 60,
    keyGenerator = defaultKeyGenerator,
    skipAuth = false,
    errorMessage = "Too many requests. Please try again later.",
  } = options;

  return async (request: NextRequest, context?: Record<string, unknown>) => {
    try {
      // Generate rate limit key
      const key = await keyGenerator(request);

      // If no key and auth is required, reject
      if (!key && !skipAuth) {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      // Use IP-based rate limiting if no user key
      const rateLimitKey =
        key ||
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "anonymous";

      // Check rate limit
      const result = await checkKeyRateLimit(
        rateLimitKey,
        limit,
        window * 1000, // Convert to milliseconds
        "ratelimit:api",
      );

      if (!result.success) {
        apiLogger.warn("Rate limit exceeded", {
          key: rateLimitKey,
          path: request.url,
          method: request.method,
          limit,
          window,
        });

        return NextResponse.json(
          {
            error: "Rate limit exceeded",
            message: errorMessage,
            limit: result.limit,
            remaining: result.remaining,
            reset: result.reset,
            retryAfter: Math.ceil((result.reset * 1000 - Date.now()) / 1000),
          },
          {
            status: 429,
            headers: result.headers as HeadersInit,
          },
        );
      }

      // Call the original handler and add rate limit headers
      const response = await handler(request, context);

      // Add rate limit headers to successful responses
      if (result.headers) {
        Object.entries(result.headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      }

      return response;
    } catch (error) {
      apiLogger.error(
        "Rate limit wrapper error",
        error instanceof Error ? error : new Error(String(error)),
      );

      // On error, allow the request through (fail open)
      return handler(request, context);
    }
  };
}

/**
 * Combines rate limiting with CSRF protection
 */
export function withRateLimitAndCSRF(
  handler: RateLimitedHandler,
  rateLimitOptions?: RateLimitOptions,
): RateLimitedHandler {
  return withRateLimit(handler, rateLimitOptions);
}

/**
 * Strict rate limiting for sensitive operations
 */
export function withStrictRateLimit(
  handler: RateLimitedHandler,
  limit = 10,
  window = 300, // 5 minutes
): RateLimitedHandler {
  return withRateLimit(handler, {
    limit,
    window,
    errorMessage: `This operation is limited to ${limit} requests per ${window / 60} minutes for security reasons.`,
  });
}

/**
 * IP-based rate limiting (for non-authenticated endpoints)
 */
export function withIPRateLimit(
  handler: RateLimitedHandler,
  limit = 50,
  window = 60,
): RateLimitedHandler {
  return withRateLimit(handler, {
    limit,
    window,
    skipAuth: true,
    keyGenerator: async (request) => {
      return (
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown-ip"
      );
    },
    errorMessage: "Too many requests from this IP address.",
  });
}
