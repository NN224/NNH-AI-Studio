/**
 * Rate Limiting Utility
 * 
 * For production use, set up Upstash Redis and configure environment variables:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 * 
 * Install: npm install @upstash/ratelimit @upstash/redis
 * 
 * Falls back to in-memory rate limiting if Upstash is not configured.
 */

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  headers: Record<string, string>;
}

// In-memory rate limit store (fallback)
class MemoryRateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.store.entries()) {
        if (value.resetTime < now) {
          this.store.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  get(key: string): { count: number; resetTime: number } | undefined {
    return this.store.get(key);
  }

  set(key: string, count: number, resetTime: number): void {
    this.store.set(key, { count, resetTime });
  }

  increment(key: string, windowMs: number): number {
    const now = Date.now();
    const entry = this.store.get(key);
    
    if (!entry || entry.resetTime < now) {
      // New window
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return 1;
    }
    
    // Increment existing window
    entry.count++;
    return entry.count;
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

const memoryStore = new MemoryRateLimitStore();

// Rate limit configuration
const RATE_LIMIT_REQUESTS = 100; // requests per window
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type UpstashConfig = {
  url: string;
  token: string;
};

const runtimeInfo = globalThis as { EdgeRuntime?: string };
const isEdgeRuntime = typeof runtimeInfo.EdgeRuntime === 'string';
let cachedUpstashConfig: UpstashConfig | null | undefined;

function getUpstashConfig(): UpstashConfig | null {
  if (cachedUpstashConfig !== undefined) {
    return cachedUpstashConfig;
  }

  if (isEdgeRuntime) {
    cachedUpstashConfig = null;
    return cachedUpstashConfig;
  }

  if (typeof process === 'undefined' || !process?.env) {
    cachedUpstashConfig = null;
    return cachedUpstashConfig;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    cachedUpstashConfig = null;
    return cachedUpstashConfig;
  }

  try {
    const parsed = new URL(url);
    cachedUpstashConfig = {
      url: parsed.toString(),
      token,
    };
  } catch (error) {
    console.warn(
      '[RateLimit] Invalid UPSTASH_REDIS_REST_URL, falling back to in-memory store',
      error,
    );
    cachedUpstashConfig = null;
  }

  return cachedUpstashConfig;
}

interface ApplyRateLimitOptions {
  limit: number;
  windowMs: number;
  prefix: string;
}

async function applyRateLimit(
  identifier: string,
  { limit, windowMs, prefix }: ApplyRateLimitOptions
): Promise<RateLimitResult> {
  const upstashConfig = getUpstashConfig();

  if (upstashConfig) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      const rateLimiter = new Ratelimit({
        redis: new Redis({
          url: upstashConfig.url,
          token: upstashConfig.token,
        }),
        limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
        analytics: true,
        prefix,
      });

      const result = await rateLimiter.limit(identifier);
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: result.reset,
        headers: {
          'X-RateLimit-Limit': result.limit.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      };
    } catch (error) {
      console.warn('Upstash rate limiting failed, falling back to memory:', error);
    }
  }

  const namespacedKey = `${prefix}:${identifier}`;
  const count = memoryStore.increment(namespacedKey, windowMs);
  const entry = memoryStore.get(namespacedKey);
  const resetTime = entry?.resetTime || Date.now() + windowMs;
  const remaining = Math.max(0, limit - count);
  const success = count <= limit;
  const reset = Math.floor(resetTime / 1000);

  return {
    success,
    limit,
    remaining,
    reset,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}

/**
 * Check rate limit for a user
 * Uses Upstash Redis if configured, otherwise falls back to in-memory store
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  return applyRateLimit(`user:${userId}`, {
    limit: RATE_LIMIT_REQUESTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    prefix: 'ratelimit:dashboard',
  });
}

/**
 * Generic rate limiter for custom keys (e.g., sync per account)
 */
export async function checkKeyRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  prefix = 'ratelimit:custom'
): Promise<RateLimitResult> {
  return applyRateLimit(key, { limit, windowMs, prefix });
}

