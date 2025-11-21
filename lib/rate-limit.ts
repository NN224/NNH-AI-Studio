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

type UpstashRateLimitModule = typeof import("@upstash/ratelimit");
type UpstashRedisModule = typeof import("@upstash/redis");

type RedisConstructor = UpstashRedisModule["Redis"];
type RedisInstance = InstanceType<RedisConstructor>;

type UpstashDeps = {
  Ratelimit: UpstashRateLimitModule["Ratelimit"];
  Redis: RedisConstructor;
};

type UpstashConfig = {
  url: string;
  token: string;
};

type EdgeAwareGlobal = typeof globalThis & { EdgeRuntime?: string };

const globalWithEdgeRuntime = globalThis as EdgeAwareGlobal;
const isEdgeRuntime = typeof globalWithEdgeRuntime.EdgeRuntime === "string";

let cachedUpstashConfig: UpstashConfig | null = null;
let upstashDepsPromise: Promise<UpstashDeps> | null = null;
let redisClient: RedisInstance | null = null;
let upstashDisabledAfterFailure = false;
let edgeRuntimeWarningLogged = false;

function validateUpstashConfig(): UpstashConfig | null {
  if (cachedUpstashConfig) {
    return cachedUpstashConfig;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    return null;
  }

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.protocol.startsWith("http")) {
      throw new Error("Only HTTP(S) URLs are supported");
    }
  } catch (error) {
    console.warn(
      `[RateLimit] Invalid UPSTASH_REDIS_REST_URL "${url}". Expected an absolute HTTP(S) URL. Falling back to in-memory rate limiting.`,
      error,
    );
    return null;
  }

  cachedUpstashConfig = { url, token };
  return cachedUpstashConfig;
}

async function loadUpstashDeps(): Promise<UpstashDeps> {
  if (!upstashDepsPromise) {
    upstashDepsPromise = Promise.all([
      import("@upstash/ratelimit"),
      import("@upstash/redis"),
    ])
      .then(([ratelimitModule, redisModule]) => ({
        Ratelimit: ratelimitModule.Ratelimit,
        Redis: redisModule.Redis,
      }))
      .catch((error) => {
        upstashDepsPromise = null;
        throw error;
      });
  }

  return upstashDepsPromise;
}

async function tryApplyUpstashRateLimit(
  identifier: string,
  { limit, windowMs, prefix }: ApplyRateLimitOptions,
): Promise<RateLimitResult | null> {
  if (upstashDisabledAfterFailure) {
    return null;
  }

  if (isEdgeRuntime) {
    if (!edgeRuntimeWarningLogged) {
      console.warn(
        "[RateLimit] Upstash Redis is not supported in the Edge runtime (middleware). Using in-memory rate limit fallback.",
      );
      edgeRuntimeWarningLogged = true;
    }
    return null;
  }

  const upstashConfig = validateUpstashConfig();
  if (!upstashConfig) {
    return null;
  }

  try {
    const { Ratelimit, Redis } = await loadUpstashDeps();

    if (!redisClient) {
      redisClient = new Redis({
        url: upstashConfig.url,
        token: upstashConfig.token,
      });
    }

    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs}ms`),
      analytics: true,
      prefix,
    });

    const result = await limiter.limit(identifier);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      headers: {
        "X-RateLimit-Limit": result.limit.toString(),
        "X-RateLimit-Remaining": result.remaining.toString(),
        "X-RateLimit-Reset": result.reset.toString(),
      },
    };
  } catch (error) {
    upstashDisabledAfterFailure = true;
    console.warn(
      "Upstash rate limiting failed, falling back to memory:",
      error,
    );
    return null;
  }
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

interface ApplyRateLimitOptions {
  limit: number;
  windowMs: number;
  prefix: string;
}

async function applyRateLimit(
  identifier: string,
  options: ApplyRateLimitOptions,
): Promise<RateLimitResult> {
  const upstashResult = await tryApplyUpstashRateLimit(identifier, options);

  if (upstashResult) {
    return upstashResult;
  }

  const { limit, windowMs, prefix } = options;
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

