/**
 * ============================================================================
 * AI Endpoint Protection
 * ============================================================================
 *
 * Higher-order function to protect AI endpoints with:
 * 1. Authentication
 * 2. Rate limiting (per user, per endpoint type)
 * 3. Usage tracking
 *
 * @security CRITICAL - Prevents cost abuse on AI endpoints
 */

import {
  checkAIRateLimit,
  type AIEndpointType,
  type AIRateLimitResult,
} from "@/lib/security/ai-rate-limit";
import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { NextResponse } from "next/server";

// ============================================================================
// Types
// ============================================================================

export interface AIProtectionContext {
  userId: string;
  userTier: string;
  rateLimit: AIRateLimitResult;
}

export interface AIProtectionOptions {
  /**
   * Type of AI endpoint (determines rate limits)
   */
  endpointType: AIEndpointType;

  /**
   * Whether authentication is required (default: true)
   */
  requireAuth?: boolean;
}

type AIHandler = (
  request: Request,
  context: AIProtectionContext,
) => Promise<Response>;

// ============================================================================
// Response Builders
// ============================================================================

function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Authentication required for AI endpoints" },
    { status: 401 },
  );
}

function createRateLimitResponse(rateLimit: AIRateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "AI rate limit exceeded",
      message: `You have exceeded your AI request limit. Please wait ${rateLimit.retryAfter || 60} seconds before trying again.`,
      limit: rateLimit.limit,
      remaining: rateLimit.remaining,
      retryAfter: rateLimit.retryAfter,
      tier: rateLimit.userTier,
      upgradeHint:
        rateLimit.userTier === "free"
          ? "Upgrade to Pro for higher limits"
          : undefined,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(rateLimit.retryAfter || 60),
        "X-RateLimit-Limit": String(rateLimit.limit),
        "X-RateLimit-Remaining": String(rateLimit.remaining),
        "X-RateLimit-Reset": String(rateLimit.reset),
      },
    },
  );
}

function addRateLimitHeaders(
  response: Response,
  rateLimit: AIRateLimitResult,
): NextResponse {
  const newResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });

  newResponse.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
  newResponse.headers.set(
    "X-RateLimit-Remaining",
    String(Math.max(0, rateLimit.remaining - 1)),
  );
  newResponse.headers.set("X-RateLimit-Reset", String(rateLimit.reset));

  return newResponse;
}

// ============================================================================
// Main HOF
// ============================================================================

/**
 * Higher-order function to protect AI endpoints with authentication,
 * rate limiting, and usage tracking.
 *
 * @example
 * ```typescript
 * async function handleChat(request: Request, { userId }: AIProtectionContext) {
 *   // Your handler logic here
 *   return Response.json({ message: "Hello!" });
 * }
 *
 * export const POST = withAIProtection(handleChat, {
 *   endpointType: "chat",
 * });
 * ```
 */
export function withAIProtection(
  handler: AIHandler,
  options: AIProtectionOptions,
): (request: Request) => Promise<Response> {
  const { endpointType, requireAuth = true } = options;

  return async (request: Request): Promise<Response> => {
    // 1. Authentication
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (requireAuth && (authError || !user)) {
      return createUnauthorizedResponse();
    }

    // For unauthenticated requests (if allowed), use IP-based limiting
    const userId = user?.id || getClientIP(request);

    // 2. Rate Limiting
    const rateLimit = await checkAIRateLimit(userId, endpointType);

    if (!rateLimit.success) {
      apiLogger.warn("AI Protection - Rate limit exceeded", {
        userId,
        endpointType,
        limit: rateLimit.limit,
        userTier: rateLimit.userTier,
      });
      return createRateLimitResponse(rateLimit);
    }

    // 3. Execute handler
    const context: AIProtectionContext = {
      userId,
      userTier: rateLimit.userTier,
      rateLimit,
    };

    try {
      const response = await handler(request, context);

      // 4. Add rate limit headers to response
      return addRateLimitHeaders(response, rateLimit);
    } catch (error) {
      apiLogger.error(
        "AI Protection - Handler error",
        error instanceof Error ? error : new Error(String(error)),
      );

      // Return error with rate limit headers
      const errorResponse = NextResponse.json(
        {
          error: error instanceof Error ? error.message : "AI request failed",
        },
        { status: 500 },
      );

      return addRateLimitHeaders(errorResponse, rateLimit);
    }
  };
}

/**
 * Gets client IP from request headers.
 */
function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  return "unknown";
}

/**
 * Lightweight protection for endpoints that only need auth check
 * (no rate limiting, for internal/admin endpoints).
 */
export function withAIAuth(
  handler: (request: Request, userId: string) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return createUnauthorizedResponse();
    }

    return handler(request, user.id);
  };
}
