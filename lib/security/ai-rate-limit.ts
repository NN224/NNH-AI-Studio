/**
 * ============================================================================
 * AI-Specific Rate Limiting
 * ============================================================================
 *
 * Different limits for different AI operations based on cost and risk.
 * Uses Upstash Redis for distributed rate limiting.
 *
 * @security CRITICAL - Prevents cost abuse on AI endpoints
 */

import { createClient } from "@/lib/supabase/server";
import { apiLogger } from "@/lib/utils/logger";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Rate limit configurations per AI endpoint type and user tier.
 * Limits are conservative to protect against cost abuse.
 */
export const AI_RATE_LIMITS = {
  // Chat: Most common, moderate cost
  chat: {
    free: { requests: 10, window: "1 h" as const },
    pro: { requests: 100, window: "1 h" as const },
    enterprise: { requests: 1000, window: "1 h" as const },
  },

  // Generate: Higher cost (longer outputs)
  generate: {
    free: { requests: 5, window: "1 h" as const },
    pro: { requests: 50, window: "1 h" as const },
    enterprise: { requests: 500, window: "1 h" as const },
  },

  // Generate post: Similar to generate
  generatePost: {
    free: { requests: 5, window: "1 h" as const },
    pro: { requests: 50, window: "1 h" as const },
    enterprise: { requests: 500, window: "1 h" as const },
  },

  // Generate response: Review reply generation
  generateResponse: {
    free: { requests: 10, window: "1 h" as const },
    pro: { requests: 100, window: "1 h" as const },
    enterprise: { requests: 1000, window: "1 h" as const },
  },

  // Auto-answer: Very high cost (multiple API calls)
  autoAnswer: {
    free: { requests: 3, window: "1 d" as const },
    pro: { requests: 50, window: "1 d" as const },
    enterprise: { requests: 500, window: "1 d" as const },
  },

  // Insights: Analytics generation
  insights: {
    free: { requests: 5, window: "1 h" as const },
    pro: { requests: 50, window: "1 h" as const },
    enterprise: { requests: 500, window: "1 h" as const },
  },

  // Stream: Real-time chat
  stream: {
    free: { requests: 10, window: "1 h" as const },
    pro: { requests: 100, window: "1 h" as const },
    enterprise: { requests: 1000, window: "1 h" as const },
  },
} as const;

export type AIEndpointType = keyof typeof AI_RATE_LIMITS;
export type UserTier = "free" | "pro" | "enterprise";

// ============================================================================
// Redis Setup
// ============================================================================

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    apiLogger.warn("Redis not configured - FAIL CLOSED for AI endpoints");
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

// Cache for rate limiters
const rateLimiters = new Map<string, Ratelimit>();

/**
 * Creates a rate limiter for a specific AI endpoint and user tier.
 */
function createAIRateLimiter(
  endpointType: AIEndpointType,
  userTier: UserTier,
): Ratelimit | null {
  const redisClient = getRedis();
  if (!redisClient) return null;

  const key = `${endpointType}:${userTier}`;
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!;
  }

  const config = AI_RATE_LIMITS[endpointType][userTier];

  const limiter = new Ratelimit({
    redis: redisClient,
    limiter: Ratelimit.slidingWindow(config.requests, config.window),
    analytics: true,
    prefix: `nnh:ai:${endpointType}:${userTier}`,
  });

  rateLimiters.set(key, limiter);
  return limiter;
}

// ============================================================================
// Rate Limit Result
// ============================================================================

export interface AIRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  userTier: UserTier;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Gets user's subscription tier from the database.
 */
async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    const tier = profile?.subscription_tier;
    if (tier === "pro" || tier === "enterprise") {
      return tier;
    }
    return "free";
  } catch (error) {
    apiLogger.error(
      "Failed to get user tier",
      error instanceof Error ? error : new Error(String(error)),
    );
    return "free"; // Default to most restrictive
  }
}

/**
 * Checks AI rate limit for a user.
 *
 * @security FAIL CLOSED - If Redis is unavailable, blocks requests
 */
export async function checkAIRateLimit(
  userId: string,
  endpointType: AIEndpointType,
): Promise<AIRateLimitResult> {
  // Get user tier
  const userTier = await getUserTier(userId);

  // Create rate limiter
  const limiter = createAIRateLimiter(endpointType, userTier);

  // FAIL CLOSED: If no Redis, block AI requests (cost protection)
  if (!limiter) {
    apiLogger.error(
      "No Redis configured - blocking AI request for cost protection",
      new Error("Redis unavailable"),
    );
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
      userTier,
    };
  }

  const identifier = `${userId}:${endpointType}`;

  try {
    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      retryAfter: result.success
        ? undefined
        : Math.ceil((result.reset - Date.now()) / 1000),
      userTier,
    };
  } catch (error) {
    apiLogger.error(
      "Rate limit check failed",
      error instanceof Error ? error : new Error(String(error)),
    );
    // FAIL CLOSED for AI endpoints (cost protection)
    return {
      success: false,
      limit: 0,
      remaining: 0,
      reset: Date.now() + 60000,
      retryAfter: 60,
      userTier,
    };
  }
}

/**
 * Tracks AI usage for billing and analytics.
 */
export async function trackAIUsage(
  userId: string,
  endpointType: AIEndpointType,
  tokensUsed: number,
  model: string,
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("ai_usage_logs").insert({
      user_id: userId,
      endpoint_type: endpointType,
      tokens_used: tokensUsed,
      model,
      estimated_cost: calculateCost(model, tokensUsed),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Non-critical - log but don't fail the request
    apiLogger.error(
      "Failed to track usage",
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}

/**
 * Calculates estimated cost based on model and tokens.
 */
function calculateCost(model: string, tokens: number): number {
  const costs: Record<string, number> = {
    // OpenAI
    "gpt-4": 0.00003, // $0.03 per 1K tokens
    "gpt-4-turbo": 0.00001, // $0.01 per 1K tokens
    "gpt-4o": 0.000005, // $0.005 per 1K tokens
    "gpt-3.5-turbo": 0.000002, // $0.002 per 1K tokens

    // Anthropic
    "claude-3-opus": 0.000015,
    "claude-3-sonnet": 0.000003,
    "claude-3-haiku": 0.00000025,

    // Google
    "gemini-pro": 0.0000005,
    "gemini-1.5-pro": 0.000007,

    // Free/Cheap providers
    "mixtral-8x7b-32768": 0.0000002, // Groq
    "deepseek-chat": 0.0000001, // DeepSeek
  };

  const costPerToken = costs[model] || 0.00001;
  return tokens * costPerToken;
}

/**
 * Gets current usage stats for a user.
 */
export async function getAIUsageStats(userId: string): Promise<{
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  byEndpoint: Record<string, number>;
}> {
  try {
    const supabase = await createClient();

    // Get usage from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: usage } = await supabase
      .from("ai_usage_logs")
      .select("endpoint_type, tokens_used, estimated_cost")
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo.toISOString());

    if (!usage || usage.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        byEndpoint: {},
      };
    }

    const byEndpoint: Record<string, number> = {};
    let totalTokens = 0;
    let totalCost = 0;

    for (const entry of usage) {
      const endpoint = entry.endpoint_type || "unknown";
      byEndpoint[endpoint] = (byEndpoint[endpoint] || 0) + 1;
      totalTokens += entry.tokens_used || 0;
      totalCost += Number(entry.estimated_cost) || 0;
    }

    return {
      totalRequests: usage.length,
      totalTokens,
      totalCost,
      byEndpoint,
    };
  } catch (error) {
    apiLogger.error(
      "Failed to get usage stats",
      error instanceof Error ? error : new Error(String(error)),
    );
    return {
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      byEndpoint: {},
    };
  }
}
