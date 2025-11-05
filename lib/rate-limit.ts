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

/**
 * Check rate limit for a user
 * Uses Upstash Redis if configured, otherwise falls back to in-memory store
 */
export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  // Try to use Upstash Redis if configured
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // Dynamic import to avoid requiring @upstash packages if not installed
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');
      
      const rateLimiter = new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(RATE_LIMIT_REQUESTS, `${RATE_LIMIT_WINDOW_MS}ms`),
        analytics: true,
        prefix: 'ratelimit:dashboard',
      });

      const result = await rateLimiter.limit(userId);
      
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
      // Fall through to memory-based rate limiting
    }
  }

  // Fallback to in-memory rate limiting
  const key = `ratelimit:${userId}`;
  const count = memoryStore.increment(key, RATE_LIMIT_WINDOW_MS);
  const entry = memoryStore.get(key);
  const resetTime = entry?.resetTime || Date.now() + RATE_LIMIT_WINDOW_MS;
  const remaining = Math.max(0, RATE_LIMIT_REQUESTS - count);
  const success = count <= RATE_LIMIT_REQUESTS;
  const reset = Math.floor(resetTime / 1000);

  return {
    success,
    limit: RATE_LIMIT_REQUESTS,
    remaining,
    reset,
    headers: {
      'X-RateLimit-Limit': RATE_LIMIT_REQUESTS.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': reset.toString(),
    },
  };
}

